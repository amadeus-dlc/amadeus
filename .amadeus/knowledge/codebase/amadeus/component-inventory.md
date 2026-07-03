# コンポーネント一覧：amadeus

## 一覧

| コンポーネント | 場所 | 責務 | v2 完全準拠での扱い |
|---|---|---|---|
| 単一入口 `amadeus` | `skills/amadeus/` | Intake、Birth、ルーティング、phase 境界、Bolt 実行 | Birth を Initialization 0.1〜0.3 へ置き換え。aidlc-state.md 読み書きへ変更 |
| Ideation ステージ skill × 7 | `skills/amadeus-ideation-*/` | Stage 1.1〜1.7 の成果物作成 | `intent-statement.md` 採用（1.1）、`<stage>-questions.md` への改名、`memory.md` 追加 |
| Inception ステージ skill × 8 | `skills/amadeus-inception-*/` | Stage 2.1〜2.8 の成果物作成 | `unit-of-work` 系ほかの改名、`memory.md` 追加 |
| Construction ステージ skill × 7 | `skills/amadeus-construction-*/` | Stage 3.1〜3.7 の成果物作成 | `code-generation-plan.md` ほかの改名、`memory.md` 追加 |
| 補助入口 × 6 | steering、event-storming、grilling、domain-modeling、domain-grilling、validator | workspace 基盤、補助分析、検証 | steering は `memory/` 構造への移行対象 |
| 内部 skill × 3 | decision-review、history-review、learning-review | 判断と学習の支援 | 参照パスの追従のみ |
| validator 本体 | `skills/amadeus-validator/validator/` | workspace と Intent の構造検証 | `aidlc/spaces/` 構造、aidlc-state.md、intents.json、scaffold の検証へ改修 |
| IndexGenerate | `skills/amadeus-validator/scripts/` | `intents.md` の生成と整合検査 | intents.json との併存へ対応 |
| contracts | `amadeus-contracts/`、`dev-scripts/amadeus-contracts.ts` | skill contract の catalog と生成 | 参照パスの追従のみ |
| examples パイプライン | `dev-scripts/generate-amadeus-examples.ts`、`validate-amadeus-examples.ts`、`examples-contract.ts` | snapshot の生成、検証、不変条件 | 新構造・新ファイル名での再生成と追従 |
| e2e / eval 群 | `dev-scripts/evals/` | mock e2e（steering、event-storming）、テンプレート契約、validator 検証 | fixture のパスと期待値の追従 |
| lint | `lints/` | 複雑度と公開型の規律 | 変更なし |
| 契約文書 | `docs/amadeus/lifecycle/`、`docs/amadeus/steering.md` | ライフサイクルと steering の契約 | v2 準拠内容へ全面改訂 |
