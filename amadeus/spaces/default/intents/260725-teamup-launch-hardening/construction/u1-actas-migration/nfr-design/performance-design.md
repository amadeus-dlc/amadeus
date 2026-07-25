# Performance Design — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`

- `performance-requirements.md` — P-1（アタッチ到達時間 5.87秒 以下）、P-2（全寿命）、P-3（`WATCHER_READY_TIMEOUT` の実測接地）、P-4（判定コスト）を、下記の実装方針で満たす対象とした。
- `business-logic-model.md` — 検証を `mux_attach` 後ろへ移した制御フローと「移動前後の対応」表を引き、待機がアタッチ到達時間へ加算されない構造の根拠とした。
- `scalability-requirements.md` — SC-1（判定コストがメンバー数に比例しない）と SC-2（待機が最大値で決まる）を、代表 role 判定と共有ポーリング維持の根拠とした。
- `reliability-requirements.md` — R-1（検証の失敗が起動を妨げない）を、性能設計と信頼性設計が同一の構造変更で達成される根拠とした。
- `security-requirements.md` — S-3（actas ロックの abort リスク）が起動時間ではなく可用性の問題であることを引き、性能設計の対象外とした。
- `tech-stack-decisions.md` — 「新規ランタイム依存なし、bash のみ」を引き、性能改善を外部ツールに頼らない方針とした。

測定 ref: HEAD `138a60372`。

## 設計方針

P-1（アタッチ到達時間）は**待機の位置を変えるだけ**で満たす。処理そのものを速くする最適化は行わない。

## D-P1: 検証をアタッチ後へ移す

`business-logic-model.md` の「移動前後の対応」表に従い、検証ブロックのみを移動する。

| 現行の順序 | U1 後の順序 |
|---|---|
| `:1477-1480` 検証ブロック（`watcher_status=0` の初期化を含む） | **4番目**（run record 確定の後） |
| `:1482` `start_safety_wait_supervisors` | 1番目（**位置不変**） |
| `:1483` `mux_attach` | 2番目 |
| `:1484-1492` run record 確定 | 3番目 |
| `:1493-1494` `RUN_PREPARING=0` と launched メッセージ | 5番目 |
| `:1497` `exit "$watcher_status"` | 6番目（**位置不変**） |

**効果**: アタッチ到達時間から検証の待機（最悪 `WATCHER_READY_TIMEOUT × 2`）が丸ごと外れる。P-1 の「5.87秒 から悪化しない」は、U1 が worktree 作成を変えないことと合わせて自明に満たされる。

**測定**: 隔離インスタンスでの実 launch。起動から `open -na Ghostty` の実行までではなく、**プロセス終了まで**の wall-clock を測る（`mux_attach` が非ブロッキングのため、アタッチ可能時点はプロセス終了より前）。

## D-P2: タイムアウト値の設計

P-3 の要求「実測 32.2秒 を安全側に上回る値」を満たす。

| 項目 | 値 |
|---|---|
| 実測の接地点 | 32.2秒（1メンバー、コールドスタート含む） |
| 設計値 | **60秒** |
| マージン | 実測の約1.86倍 |

**マージンの根拠**（コメントとしてコードに記す）:

1. 実測は1メンバー・1回。7人同時起動ではホスト負荷でコールドスタートが延びる。
2. ディスク・CPU の状態で変動する。
3. 現行 90秒 からの縮小幅を確保しつつ、正常系で偽のタイムアウトを出さない値として 60秒 を選ぶ。

**全寿命への効果**（P-2）: `60 × (1 + 1)` = **120秒**（現行 180秒 から 33% 短縮）。この時間はアタッチ後に経過するため利用者の作業開始は妨げない。

## D-P3: 判定コストを一定にする

P-4 / SC-1 の要求を満たす。

```
watcher_verification_applies():
  member_bootstrap_prompt(leader) を1回だけ導出して判定する
```

代表 role を `leader` に固定できる根拠は ADR-2 の不変条件（`" actas "` の有無は role に依存しない）。全 member をループしない。

## D-P4: 共有ポーリングの維持

SC-2 の要求（待機がメンバー数の和ではなく最大値で決まる）は、`verify_watchers_armed`（`:1174-1213`）の既存構造がすでに満たしている。**本体を変更しない**ことで維持する。

変えるのは呼び出し位置（D-P1）と、再送・診断に使うプロンプトの導出だけである。

## 対象外の最適化

| 項目 | 理由 |
|---|---|
| watcher の arming 時間そのもの | agmsg と Claude Code のコールドスタートが支配。こちらから短縮できない |
| ポーリング間隔の短縮 | 現行1秒。32.2秒 の待機に対し粒度は十分で、短縮すると CPU を無駄に使う |
| worktree 作成 | U2 の対象 |
| キャッシュ・プリウォーム | 常駐しない CLI に該当しない（`cid:nfr-design:c1`） |
