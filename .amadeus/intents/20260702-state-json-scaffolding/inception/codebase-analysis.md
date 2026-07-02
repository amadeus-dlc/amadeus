# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `skills/amadeus-validator/` | source skill 構成 | `evals/`、`references/`、`validator/`、`SKILL.md` があり、`scripts/` は存在しない。雛形生成スクリプトは新設になる。 |
| `skills/amadeus-validator/validator/generated/` | 生成済み契約 | `artifact-contracts.ts`、`functional-design-contract.ts`、`task-generation-contract.ts`、`skill-contracts.ts` が `amadeus-contracts/catalog/**` から生成されている。同じ skill ディレクトリ内のスクリプトから import して再利用できる。 |
| `amadeus-contracts/catalog/` | 契約カタログ | phases、stages、task-generation、functional-design など、state.json の状態語彙と必須構造の定義元がある。生成入口は `dev-scripts/amadeus-contracts.ts`（`contracts:check`）である。 |
| phase skill の state 記述 | source skill | intent-capture（ideation 開始の state 形）、inception SKILL.md（Inception 完了の state 形）、functional-design（functionalDesign の状態契約）、bolt-preparation（手順 10〜13 の taskGeneration 更新）、construction traceability-finalization（手順 11 の状態確定）に、雛形の対象となる更新点が記述されている。 |
| `.amadeus/intents/*/state.json` | 実データ | 18 Intent 分の遷移済み state が先例として存在する。直近 cycle（20260702-phase-gate-approval-contract）では、Construction 開始時の必須配列（`requiredArtifacts`、`requiredBoltArtifacts`、`bolts`、`gate`）の手書き漏れが validator 指摘になった。 |
| `dev-scripts/promote-skill.ts` | 開発用スクリプト | `scripts/` が昇格対象ディレクトリ、`evals/` が昇格除外であることを確認した（Issue #309 の分析と同一）。 |

## 既存能力

- validator の生成済み契約は、state.json が満たすべき状態語彙（statuses、gate 値、evidence kinds、状態遷移の許可行列）を機械可読に持っており、雛形生成の正解データとして再利用できる。
- `amadeus-contracts` の catalog → generated の生成パイプライン（`contracts:check`）が確立しており、雛形が参照する契約の同期は既存の仕組みで検査される。
- 既存 state 実データが全遷移分そろっており、雛形の期待値（golden）を実データと突き合わせて検証できる。
- promote 契約により、`scripts/` に置いたファイルは昇格先へ反映され、配布先ユーザー環境で `bun` から実行できる。

## 統合点

- 雛形生成スクリプトは `skills/amadeus-validator/scripts/` に新設し、promote で `.agents/skills/amadeus-validator/scripts/` へ反映できる。
- スクリプトから同じ skill 内の `validator/generated/**` を相対 import して、状態語彙と必須構造を参照できる。
- 各 phase skill の state 更新手順（intent-capture、inception、functional-design、bolt-preparation、finalization）に、スクリプトの利用を参照する記述を追加できる。
- eval は `skills/amadeus-validator/evals/` または既存の `dev-scripts/evals/amadeus-validator/check.ts` に追加でき、昇格先に混入しない。

## ギャップ

- 遷移単位で valid な state.json を生成、更新する実行可能な手段がない。エージェントは先例の実データを読み、手書きで再現している。
- phase skill の state 記述は「完了時の形」を JSON 例で示すが、中間状態（phase 開始直後）の必須フィールドは例示がなく、手書きで漏れやすい。
- 既存 state を保持したまま特定 phase のブロックだけを更新する規則が文書化されていない。

## リスク

- 雛形が既存 state を上書いすると、前 phase の状態ブロック（ideation、inception）や taskGeneration の evidence を失う。更新の冪等性と既存値保持を契約で固定する必要がある。
- validator の要求構造が変わったとき、スクリプトが追従しないと雛形と検査が乖離する。生成済み契約の import で構造的に緩和できるが、契約にない直書き部分は eval で守る必要がある。
- 6 遷移の引数体系が複雑になると、手書きより使いにくくなり参照されなくなる。遷移種別の指定は phase skill の手順から 1 行で書ける粒度にする必要がある。

## Inception への入力

- 要求は、遷移単位の雛形生成と既存値保持、validator との整合（生成直後の pass）、同梱配置と配布先実行、skill 手順からの参照、eval 先行、promote 同期に分ける。
- Unit は、雛形生成スクリプトの契約（BC001 内）と、phase skill 手順からの参照の 2 つの価値境界に分けられる見込みである。ただしスクリプトと参照は不可分（参照先 path はスクリプトの実在が前提）のため、単一 Unit + 複数 Bolt も候補になる。
- Bolt は、スクリプトと eval の実装（RED → GREEN）、phase skill 手順への参照追加と promote 同期に分けられる。
- Construction では、skill 変更 PR としてレビュー支援契約が適用される。スクリプト実装は dev-scripts ルールに従い eval 先行で進める。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `skills/amadeus-validator/validator/generated/task-generation-contract.ts` | 状態語彙と許可行列の生成済み契約の確認。 |
| file | `amadeus-contracts/catalog/` | 契約カタログの定義元と生成パイプラインの確認。 |
| file | `skills/amadeus-construction-bolt-preparation/SKILL.md` | state 更新手順（手順 10〜13）の記述位置の確認。 |
| file | `.amadeus/intents/20260702-phase-gate-approval-contract/state.json` | 全遷移分の実データと、直近 cycle の手書き漏れ箇所の確認。 |
| file | `dev-scripts/promote-skill.ts` | scripts 昇格、evals 除外の契約確認。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | `10b846d0221daaee62e51a9430957b38bd948f77` |
| analyzedAt | `2026-07-02T04:50:13Z` |
| freshness | current |

## 未確認事項

- スクリプトの引数体系（遷移種別の指定方法、対象 Bolt や Unit の指定方法）は、Unit Design Brief と Construction で確定する。
- 生成済み契約でカバーされない state 構造（`requiredArtifacts` の phase ごとの初期値など）の定義方法は、Construction で確定する。
