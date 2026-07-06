# Domain Entities — u001-lifecycle-inputs（260706-lifecycle-inputs）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

本 Intent はコードのエンティティを持たない。扱う文書契約の構成要素を整理する。

## 文書契約の構成要素

| 要素 | 定義 | 実測源 |
|---|---|---|
| Stage Contract（ステージ契約） | phase 別文書の `## Stage N.M` 節。Metadata / Purpose / Inputs / Outputs（/ Notes）で構成する。 | docs/amadeus/lifecycle/{ideation,inception,construction}.md |
| Inputs 表 | ステージが読む成果物の表。`| Artifact | 必須 | 供給元 |` の 3 列。 | 同上 + `.claude/amadeus-common/stages/<phase>/<slug>.md` frontmatter `consumes` |
| Outputs 表 | ステージの産出物の表（既存。本 Intent では自己矛盾回避の最小補正のみ）。 | 同上 frontmatter `produces` |
| I/O 記法定義 | overview.md に置く記法の正。列の意味、必須値の 3 値、phase 共通入力の縮退、英語対訳。 | B001 で新設 |
| Phase 共通入力 | rules_in_context（org.md、team.md、project.md、phases/<phase>.md）。各ステージ表に繰り返さず Phase Overview に 1 回書く。 | エンジンの run-stage directive |
| 実測・補正記録 | 実測抜粋（frontmatter 該当行）と補正内容の単一記録。 | B002 / B003 が作成（code-generation 成果物） |

## 供給元の語彙

| 値 | 意味 |
|---|---|
| Stage N.M | 当該ステージの Outputs が供給する |
| Intake | Intake の birth 提案・承認内容が供給する |
| workspace | workspace の既存状態（codekb、既存リポジトリ）が供給する |
| Space | Space の共有資産（`memory/team.md` など）が供給する（既存文書で使用実績あり。workspace と統合せず維持する） |

## 供給元の書式

- 複数供給元の列挙は読点区切りで書く（例: `Stage 2.4、2.5`）。
- 代替供給元は `または` で書く（例: `Stage 1.1 または Intake`）。
- 必須値の qualifier 付き表記（`必須（Stage N.M 実行時）`）は business-logic-model.md の B001 規則 3 を正とする。
