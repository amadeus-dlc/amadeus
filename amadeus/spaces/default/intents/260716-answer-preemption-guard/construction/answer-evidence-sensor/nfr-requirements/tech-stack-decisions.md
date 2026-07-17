# Tech Stack Decisions — answer-evidence-sensor

上流入力(consumes 全数): unit FD 4点(`../functional-design/business-logic-model.md`・`business-rules.md`・`domain-entities.md`・`frontend-components.md`)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜7)、codekb `technology-stack.md`(Bun/TS/Biome 前提)。

## 決定

| 項目 | 決定 | 根拠 |
|------|------|------|
| 言語/実行 | TypeScript+Bun 直実行(shebang なし・実行ビット不要) | 既存 sensor script 4本と同一(project.md Tech Stack) |
| 依存 | 新規依存ゼロ — node:fs/node:path+amadeus-lib import のみ | Bun-only 前提の維持(Forbidden: runtime dependency 追加禁止) |
| テスト | bun test(integration 層、t-eoc1-gate-evidence 様式の scaffold 再利用) | 既存4層ランナー |
| スタイル | Biome+tsc、functional-domain-modeling-ts(純関数+判別ユニオン) | project.md DECIDED |

## 却下した代替

専用 npm パッケージ化・Node ランタイム対応 — Bun-only 前提(Forbidden)と配布モデル(dist コピー)に反するため不採用。
