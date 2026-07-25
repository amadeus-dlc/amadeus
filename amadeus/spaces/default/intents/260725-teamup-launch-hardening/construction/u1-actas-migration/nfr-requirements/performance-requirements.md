# Performance Requirements — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 主フローと制御フロー（検証を `mux_attach` 後ろへ移した後の実行順序）、最悪実行時間の内訳を引いた。
- `business-rules.md` — BR-1〜BR-22 のうち非機能に関わるもの（BR-7 の出力回数、BR-11 の全寿命、BR-15/16 の定数、BR-19〜21 の外部依存）を各要件の根拠とした。
- `requirements.md` — NFR-1〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 交差スタック（bash / herdr / 外部 agmsg / Bun test）と「新規ランタイム依存なし」の確認を、技術選択の前提とした。

測定 ref: HEAD `811961123`。数値はすべて実測からの転記（`cid:requirements-analysis:constants-from-code`）。

## 対象の性能特性

本ユニットの性能は**利用者がチームへアタッチできるまでの時間**で測る。CLI であり、スループットや同時接続数といった常駐サービスの指標は該当しない（`cid:nfr-design:c1`）。

## P-1: アタッチ到達時間（最重要）

| 項目 | 値 |
|---|---|
| 現行ベースライン | **5.87秒**（3人構成、前 intent PR #1477 の実測） |
| U1 後の要求 | **悪化しない**（5.87秒 以下） |
| 測定方法 | `team-up.sh` 起動から プロセス終了まで の wall-clock。隔離インスタンスで実 launch |

**根拠**: `business-logic-model.md` の制御フローで検証が `mux_attach` の後ろへ移るため、アタッチ到達時間に検証の待機は加算されない。U1 は worktree 作成を変えないので、この値は据え置きになる見込み。

## P-2: スクリプト全寿命

| 項目 | 値 |
|---|---|
| 現行 | 最悪 `90 × (1+1)` = **180秒** |
| U1 後の要求 | 最悪 `WATCHER_READY_TIMEOUT × (WATCHER_RESEND_MAX + 1)`。`WATCHER_RESEND_MAX` は 1 のまま（BR-16）なので、`WATCHER_READY_TIMEOUT` の縮小ぶん短縮される |
| 測定方法 | 定数の積。および全メンバー未 armed を強制したケースの実測 |

**この時間はアタッチ後に経過する**ため利用者の作業開始は妨げないが、呼出元シェルのプロンプト復帰が遅れる。

## P-3: `WATCHER_READY_TIMEOUT` の値

| 項目 | 値 |
|---|---|
| 実測の接地点 | **32.2秒**（1メンバーの arming、Claude Code コールドスタート含む。feasibility 実験2） |
| 現行値 | 90（`:108`） |
| 要求 | 実測 32.2秒 を**安全側に上回る**値へ縮小し、マージンの根拠をコメントに記す（BR-15） |
| 測定方法 | 定数の assert とコメントの存在 |

**マージンが必要な理由**: 32.2秒 は1メンバー・1回の実測であり、(a) メンバー数が増えるとホスト負荷でコールドスタートが延びる、(b) ディスク・CPU の状態で変動する。実測値そのものを閾値にすると正常系で偽のタイムアウトを生む。

## P-4: 判定コスト

| 項目 | 値 |
|---|---|
| `member_bootstrap_prompt` の呼び出し | 純関数、副作用なし（BR-4）。1回あたり無視できる |
| `watcher_verification_applies` の呼び出し回数 | launch 経路で2回（BR-7）。代表 role 1件のみ導出（ADR-2） |
| 要求 | 判定が member 数に比例しない |

## 非対象

以下は本ユニットの性能要件に含めない。

| 項目 | 理由 |
|---|---|
| watcher の arming 時間そのもの（32.2秒） | agmsg と Claude Code のコールドスタートが支配し、こちらから短縮できない。**待機位置の設計**で利用者体験から切り離すのが本ユニットの解 |
| worktree 作成時間 | U2 の対象 |
| herdr のペイン生成時間 | 実測1秒未満。最適化の余地が小さい |
| スループット・同時接続数・キャッシュ効率 | 常駐サービスの指標であり CLI に該当しない（`cid:nfr-design:c1`） |
