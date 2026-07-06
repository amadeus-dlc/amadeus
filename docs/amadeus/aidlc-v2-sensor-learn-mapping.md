# AI-DLC v2 Sensor and Learn Mapping

## 上書き注記（D004）

この文書が下した sensor 実行機構と learnings ritual の決定論ツールの不採用判断は、Intent `260704-v2-parity-completion` の D004 により採用へ変更した。
Issue #393 の不採用判断は「hook 実行基盤を含める判断が確定した場合は再検討する」と明記しており、本家 TS エンジンの適応コピー戦略（D001）がその再検討条件を成立させた。
検査体制は、本家 sensor（エンジンごとコピーし、stage 完了時に即時検査する）と `amadeus-validator`（workspace 横断で永続検査する）の併用とする。
以下の本文は、Issue #393 時点の判断を歴史記録として残す。

この文書は、Issue #393 の判断として、AI-DLC v2 の stage 定義にある sensor と Learn（learnings ritual と `memory.md`）を Amadeus DLC のどの成果物と検証へ写像するかを定義する。

参照元は次である。

- リポジトリ: https://github.com/awslabs/aidlc-workflows/tree/v2
- 参照 commit: `d341522e1491db4884e9127004c3882365229218`
- sensor 宣言: 各 stage 定義の frontmatter `sensors:`、Learn: `core/amadeus-common/protocols/stage-protocol.md` §13

## 判断

Amadeus DLC は、sensor 実行機構（`.amadeus-sensors/` への検査結果出力、sensor-fire hook）と、learnings ritual の決定論ツール（`amadeus-learnings.ts` 相当）を採用しない。

sensor が担う決定論的検査は既存の検証へ、Learn が担う知見の記録と定着は既存の成果物と review skill へ写像する。

## sensor の写像

参照 commit 時点の sensor は 4 種で、stage への宣言は次のとおりである。

| sensor | 本家での役割 | 宣言している stage |
|---|---|---|
| `required-sections` | Markdown 成果物が必須節を含むかの検査 | code-generation を除く全 stage |
| `upstream-coverage` | 成果物が上流成果物を参照しているかの検査 | code-generation を除く全 stage |
| `linter` | プロジェクトの linter 実行（結果を `<record>/.amadeus-sensors/` へ出力） | Construction の設計 4 stage、code-generation、ci-pipeline |
| `type-check` | プロジェクトの type-checker 実行 | Construction の設計 4 stage、code-generation、build-and-test、ci-pipeline |

Amadeus DLC 側の検証先は次である。

| sensor | Amadeus DLC の検証先 |
|---|---|
| `required-sections` | `amadeus-validator` の構造検証。成果物の必須見出しと必須項目を検査する。 |
| `upstream-coverage` | 各 stage skill の必須入力の読込契約と、phase の `traceability.md`（要求から成果物と検証への対応）。evidence link は `amadeus-validator` が検査する。 |
| `linter` | Build and Test（Stage 3.6）の実行記録（`build-test-results.md` にコマンドと結果を残す）と、Bolt PR・phase PR の CI。 |
| `type-check` | 同上。 |

`.amadeus-sensors/` 相当の検査結果ディレクトリは追加しない。検査結果の記録先は、構造検証が validator の結果報告、build とテストが Bolt record の `build-test-results.md` である。

## Learn の写像

本家の Learn は、stage 実行中に `memory.md` へ 4 見出し（Interpretations、Deviations、Tradeoffs、Open questions）で記録し、stage 完了時の learnings ritual で候補を表面化して、人間の判断で harness へ定着させる。

Amadeus DLC 側の記録先は次である。

| 本家の Learn 要素 | Amadeus DLC の記録先 |
|---|---|
| `memory.md` の Interpretations / Deviations / Tradeoffs / Open questions | 各 stage 成果物の `memory.md`。同じ 4 観点（解釈、逸脱、トレードオフ、未解決の問題）を stage skill の手順で記録する。 |
| Open questions の解消 | `amadeus-grilling` の一問ずつの質問と、stage の `<stage>-questions.md`。確定判断は Grilling Decision Trail（`grillings.md`、`grillings/`）へ残す。 |
| 確定した判断の記録 | phase の `decisions.md`（gate の Accept as-is 記録を含む）と、stage 固有の decision 成果物。 |
| 成果物単位の追跡 | phase の `traceability.md`。phase 境界で `amadeus` 入口が確定する。 |
| 候補の表面化と定着（learnings ritual） | `amadeus-history-review`（過去成果物の読み取りと抽出）と `amadeus-learning-review`（分類）。`steering_knowledge_candidate` は Space の `memory/` と `knowledge/` へ、`domain_map_candidate` と `context_map_candidate` は Domain Map と Context Map へ、`follow_up_issue_candidate` と `follow_up_intent_candidate` は Issue または Intent 化へ接続する。いずれも自動昇格せず、人間の判断を経る。 |

## 採用しない項目と理由

| 項目 | 理由 |
|---|---|
| sensor 実行機構（sensor-fire hook、`.amadeus-sensors/` 出力） | 配布契約（単一公開入口と skill 一式）に hook 実行基盤を追加しない。決定論的検査は `amadeus-validator` と Build and Test、CI が既に担う。 |
| learnings ritual の決定論ツール（`amadeus-learnings.ts` 相当） | 候補の表面化と分類は `amadeus-history-review` と `amadeus-learning-review` の契約で担い、定着は人間 gate を経る既存契約を維持する。 |

## stage skill からの追跡

各 stage skill の `SKILL.md` Gate 節に、当該 stage の sensor 宣言と Amadeus 側の写像を明記する。

`memory.md` の 4 観点の記録は、各 stage skill の手順に既に含まれる。

## 将来の再検討条件

次のいずれかが起きた場合、sensor 実行機構の採用を別 Issue で再検討する。

- validator と CI で検出できない成果物欠落が gate 差し戻しとして頻発する運用実績を確認した場合。
- 配布契約に hook 実行基盤を含める判断が別途確定した場合。

## 関連文書

- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md)
- [AI-DLC v2 Reviewer Mapping](aidlc-v2-reviewer-mapping.md)
- [Lifecycle Contract Overview](lifecycle/overview.md)
