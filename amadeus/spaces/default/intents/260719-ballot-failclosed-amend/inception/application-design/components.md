# Components — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

新規コンポーネントは導入しない。既存4モジュール(election CLI 区画、scripts/ 配布外)の内側修正のみ。

## 変更コンポーネント一覧(規模は数値見積り)

| コンポーネント | ファイル | 変更内容 | 見積り(行) |
| --- | --- | --- | --- |
| election-model | scripts/amadeus-election-model.ts | (1) `Ballot.parse` の6分類化(`invalid-timestamp` 追加、regex+Date 二段 — FR-1) (2) `parseBallotShape` の kind/ref 読取と `AmendBallot` 生成(FR-3) (3) 新純関数 `resolveBallots`(per-voter 最新1票・同時刻 amend 優先 — FR-4)と `tally` の母集団解決 | +70 |
| election-store | scripts/amadeus-election-store.ts | `appendBallot` に amend の `unknown-ref` 実在照合(FR-3、E-BFARA3)— ledger 読取済みの受理点で fail-closed | +15 |
| election-cli | scripts/amadeus-election.ts | `handleVote` のエラー表示(新分類の loud 出力)、`verify` recompute の解決済み母集団化(FR-4 (b)) | +10 |
| election-transport | scripts/amadeus-election-transport.ts | 変更なし(normalizeAt は残置 — decisions.md ADR-1) | 0 |
| tests | tests/unit/t234-*、tests/integration/t235-*、t236-* +新規 fixture | FR-1/2/3/4 の落ちる実証・閉包・共存・解決規則テスト | +160 |

合計見積り: 実装 +95行 / テスト +160行(≒255行)。閾値級の大型化なし。

## Reuse Inventory(新規機構を導入しない根拠)

- エラー表現: 既存 `Result`/`err`/`ok` と `BallotError` union(model.ts)へ分類を**追加**するのみ — 新エラー機構なし。
- 受理 funnel: 既存 `handleVote → Ballot.parse → appendBallot` チェーンをそのまま使う — 新 verb・新経路なし(#1253 の amend も vote verb 同一経路)。
- 正規化: 既存 `normalizeAt`(transport.ts:87-91)を残置(ADR-1)— 新正規化関数なし。
- 検証実行: 既存 `bun run typecheck` / `lint` / `tests/run-tests.sh --ci` — 新 CI ジョブなし。
- テスト土台: 既存 t234/t235/t236 の describe 構造・fixture 様式へ追記 — 新テストファイルは原則作らない(肥大時のみ分割検討)。

## 非変更(Won't の設計面確認)

t238/t241(e1 管轄・e2e)、norm-metrics 系、dist/self-install(投影 0件 — RE 実測)、選挙 store の配置・--project 運用。
