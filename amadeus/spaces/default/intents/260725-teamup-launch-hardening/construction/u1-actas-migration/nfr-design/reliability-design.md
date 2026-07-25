# Reliability Design — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`

- `reliability-requirements.md` — R-1〜R-7 を、下記の実装方針で満たす対象とした。特に R-1（検証の失敗が起動を妨げない）を設計の中心に置いた。
- `business-logic-model.md` — 制御フローと状態遷移を引き、失敗時にどこまで到達しているかを明確にした。
- `performance-requirements.md` — P-2（全寿命）を引き、失敗時の最悪待機時間の上限を定めた。
- `security-requirements.md` — S-3（actas ロックの abort）を引き、可用性リスクとしての扱いを定めた。
- `scalability-requirements.md` — SC-4（7人構成でのロック競合）を引き、検証項目とした。
- `tech-stack-decisions.md` — 外部依存（agmsg）が repo 外・バージョン管理外である点を引き、縮退設計の根拠とした。

測定 ref: HEAD `138a60372`。

## 設計方針

**検証は診断であり、起動の可否を左右しない。** これを構造で保証する。

## D-R1: 起動完了を検証より前に確定させる

`performance-design.md` D-P1 の順序変更により、以下が検証の**前**に完了する。

| 完了するもの | 現在地 |
|---|---|
| ペイン生成とメンバー起動 | `:1441-1457` 相当 |
| safety-wait supervisor の起動 | `:1482`（位置不変） |
| Ghostty でのアタッチ | `:1483` |
| run record の確定（status=running、current-run、active-run） | `:1484-1492` |
| `RUN_PREPARING=0` と launched メッセージ | `:1493-1494` |

**検証が失敗しても、この時点までは必ず到達している。** 利用者はアタッチして作業でき、run は正規に記録されている。

## D-R2: 失敗の表明（no-silent-success）

`verify_watchers_armed` の既存の診断構造を維持し、プロンプト導出のみ変える。

| 出力 | 内容 | 現在地 |
|---|---|---|
| 1行目 | 未 armed のメンバー名一覧と再送回数 | `:1209` |
| 2行目 | 初期プロンプトが落ちた旨（**actas 移行後の事実に合わせて更新**） | `:1210` |
| 3行目 | 回復手順（**メンバーごとのプロンプトを示す**） | `:1211` |

3行目は role ごとにプロンプトが異なるため、単一文字列では表せない。未 armed のメンバーそれぞれについて、そのメンバーが実行すべきプロンプトを示す形にする。

exit code は `watcher_status` を通じて反映される（`:1497`、位置不変）。

## D-R3: スキップの表明

適用可否が偽のとき、理由を stderr へ**ちょうど1回**出す。既存の `WATCHER_SKIP_ANNOUNCED` ラッチを維持する。

launch 経路が判定を2回呼ぶ（stale sentinel クリア前・検証前）ため、ラッチがないと2行出る。

**ただし U1 後は既定構成でこの分岐に入らない**（actas プロンプトになるため判定が真になる）。ラッチは `MSG_BACKEND=herdr` や将来の構成変更に備えて残す。

## D-R4: 前提条件の保存

`delivery.sh set monitor` の呼び出し（`:876-879`（`if [ -f "$DELIVERY" ]` 〜 `fi`、実行行は `:877`））を維持する。

```
if [ -f "$DELIVERY" ]; then
  bash "$DELIVERY" set monitor claude-code "$wt" >/dev/null 2>&1 ||
    echo "WARN: delivery.sh set monitor failed for $m (continuing)" >&2
fi
```

**失敗しても WARN で続行する現行挙動も維持する。** delivery mode の設定に失敗すると actas が watcher を起動しないため検証は失敗するが、それは**正しい検出**であり、起動を止める理由にはならない（D-R1）。

## D-R5: 外部依存の変化に対する縮退

agmsg は repo 外・バージョン管理外であり、actas フローの挙動が将来変わりうる（R-7）。

**縮退の構造**:

1. agmsg を変更しない（変更すると利用者環境との整合が壊れる）。
2. 検証が失敗しても起動は完了する（D-R1）。
3. 失敗は診断として表明される（D-R2）。

agmsg 側の変化で sentinel が書かれなくなっても、**利用者は作業を継続でき、何が起きたかを知ることができる**。

## D-R6: actas 排他ロックの扱い

| 項目 | 設計 |
|---|---|
| リスク | 他 live セッションが同一 (team, role) を保持していると `status=held` で abort し、そのメンバーの起動が失敗する |
| 本ユニットでの対応 | **agmsg の挙動をそのまま受け入れる**。こちらでロックを操作しない |
| 検証 | 7人構成と resume（`-c`）での実測（SC-4、R-6 相当） |
| 見込み | `_actas_lock_try_claim`（`lib/actas-lock.sh:106-133`）が所有 sid の生存を確認して stale 再取得を許すため、恒久ブロックはしない |

**実測で恒久ブロックが確認された場合**は実装を止めてユーザーへエスカレーションし、intent-capture Q2 裁定 B（別 readiness 指標へ切替）の発動を諮る。

## D-R7: 消費者の全数是正

`CLAUDE_MONITOR_PROMPT` の廃止で13の消費者が影響を受ける（`business-rules.md` BR-18）。

**実装時の手順**:

```sh
grep -rn "CLAUDE_MONITOR_PROMPT" packages/framework/core/tools/team-up.sh tests/ scripts/ docs/
grep -rn "agmsg mode monitor" packages/framework/core/tools/team-up.sh tests/ scripts/ docs/
```

**両キーで実行し、出力からの転記で確認する**（既存表の複製をしない）。`cid:functional-design:inventory-from-grep-each-time`。

## 対象外

| 項目 | 理由 |
|---|---|
| リトライ・サーキットブレーカ | `WATCHER_RESEND_MAX` による再送は既存機構で変更しない。actas ロックの abort はリトライの対象ではない |
| SLO / 可用性パーセンテージ | 単発実行の CLI に該当しない |
| ランブック | 診断出力（D-R2）で回復手順を利用者へ直接示す |
