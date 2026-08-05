# Delivery Planning: チーム割当

team-formation（1.5）は本 scope（self-feature）で SKIP のため、チーム成果物は存在しない（設計どおりの欠落）。stage 手順の既定に従い、**全 Bolt を amadeus-developer-agent（AI）が実行**する。人間はゲート（walking skeleton の必須ゲート、ladder prompt の選択、halt-and-ask、最終 build-and-test 承認）で関与する。

## Bolt 割当表

| Bolt | Unit | 実行主体 | 人間の関与 |
|---|---|---|---|
| Bolt 1（WS） | U1 tla-evidence-foundation | amadeus-developer-agent | walking skeleton ゲート承認（必須）+ ladder prompt |
| Bolt 2 | U2 applicability-hold | amadeus-developer-agent | §11a 前提が否定された場合の ADR-6 再裁定 |
| Bolt 3 | U3 authoring-referees | amadeus-developer-agent | autonomy mode に従うバッチゲート |
| Bolt 4 | U6 import-closure-guard | amadeus-developer-agent | 同上 |
| Bolt 5 | U4 registration-committer | amadeus-developer-agent | 同上 |
| Bolt 6 | U5 authoring-stage-e2e | amadeus-developer-agent | E2E 実測の受け入れ（build-and-test） |

## 補足

- 並行バッチ（Bolt 2〜4）は swarm 並行実装（`memory/team.md` parallel-bolts 既定）で fan-out し、単一のバッチゲートが 3 Bolt を覆う。
- Bolt 内の設計 referee（trace / proof）と独立 reviewer は実行主体と別の read-only 主体が担う（`inception/application-design/components.md` C7 の境界、FR-009）。
- 上流参照: `inception/units-generation/unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`inception/requirements-analysis/requirements.md`、`inception/application-design/components.md`、`inception/delivery-planning/delivery-planning-questions.md`。`stories.md` / mockups は SKIP により存在しない。team-practices: `memory/team.md`、`memory/project.md`。
