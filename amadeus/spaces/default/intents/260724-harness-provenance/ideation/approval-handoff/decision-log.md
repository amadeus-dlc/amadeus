# Decision Log — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md, competitive-analysis.md, feasibility-assessment.md, constraint-register.md, team-assessment.md, wireframes.md

## Decisions Made During Ideation

| # | 決定 | 根拠 | 決定者 |
|---|---|---|---|
| D-1 | スコープを `amadeus-feature` とする | project.md § Scope Overrides(scope-definition:default-scope-amadeus)。leader ディスパッチで明示指示 | leader/ユーザー |
| D-2 | market-research は N/A(内部ツールのため) | market-research stage の condition 文言の機械適用。leader 承認(2026-07-24T11:06:17Z) | leader(選挙不要判定の承認) |
| D-3 | build-vs-buy は Build 一択 | build-vs-buy.md — 規模・代替候補の不在から | e5(architect ペルソナ) |
| D-4 | team-formation は N/A(solo developer 該当) | team-formation stage の condition 文言の機械適用。leader 承認(2026-07-24T11:14:40Z) | leader(選挙不要判定の承認) |
| D-5 | rough-mockups は非UI出力契約形式で作成 | cid:requirements-analysis:ui-less-mockups-as-output-contract。amadeus-product-lead-agent レビュー READY(iteration 1) | e5(design ペルソナ)+ reviewer |
| D-6 | 過去 intent への遡及復元・git commit author の書き換えは Out of Scope | Issue #1452 本文に明記 | ユーザー(Issue 起票時) |

## Alternatives Rejected

- 外部 SaaS/OSS の「AI エージェント実行証跡」ツール採用 — build-vs-buy.md のとおり、対象候補が不在かつ Amadeus 固有スキーマへの統合コストが避けられないため却下
- 何もしない(現状維持) — Issue #1452 の背景が示す実害(#1449・#1450 調査でハーネス種別を特定できなかった)により却下
