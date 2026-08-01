# Logical Components — U6 docs

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)、各面は requirements.md NFR-3 / FR-DOC-1 から代替導出(本ファイルは4設計の適用先目録)。business-logic-model.md(実在)の生成フロー(en+ja 同一 PR)を消費(成果物の構造=対訳ペア2ファイルの正本は FD domain-entities.md:5-7)。

## コンポーネント目録と NFR 適用点

| コンポーネント | 責務 | 適用 NFR 設計 |
|---|---|---|
| `docs/reference/21-telemetry-schema.md`(新設・en) | スキーマ v1 6面の正本文書(英語) | scalability(additive 節構造)、security(合成例のみ)、reliability(決定木統制) |
| `docs/reference/21-telemetry-schema.ja.md`(新設・ja) | 対訳(日本語) | reliability(同一 PR ペア新設 — project.md Mandated) |
| 乖離解消の決定木(運用手続き) | 実装 ⇔ #1868 ⇔ docs の同期統制 | reliability(独自吸収禁止・一方向同期) |

## 障害ドメイン

- docs は静的成果物 — runtime 障害ドメインなし。失敗モードは「実装との乖離」のみで、決定木+レビュー観点が統制(reliability-design)

## 共有資源

- 共有は docs/reference/ の章番号空間のみ(21 は空き番号 — FD 実測)。既存 22 ペアへの改変なし(additive)

## dist 投影(NFR-4)

docs/reference/ は dist 投影対象外 — U6 は core を触らないため package.ts/promote:self の再生成は不要(unit-of-work.md U6 の NFR-4 適用除外と整合)。
