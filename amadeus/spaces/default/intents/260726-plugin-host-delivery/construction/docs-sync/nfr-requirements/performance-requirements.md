# 性能要件 — U8 docs-sync

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 適用範囲

U8 は `docs/guide/19-plugins.md` / `19-plugins.ja.md` を実装済みの install / doctor / drop 手順へ更新する**文書 Unit** である(`requirements.md` FR-9、`business-rules.md` BR-U8-0 責務境界)。`business-logic-model.md` のとおりコード変更を伴わず、更新は文書と既存 docs 参照整合ゲートの単発実行に閉じる(services.md「常駐なし」)。実行時の性能特性を持つコード経路を追加しないため、性能要件は該当しない。

## PERF-U8-1: 性能 = N/A(文書 Unit)

- N/A の根拠: U8 は Markdown 文書の更新のみで、ランタイムに実行される新規コード経路・アルゴリズムを導入しない(`business-logic-model.md`「コード変更なしの Unit」、`business-rules.md` BR-U8-0「C1-C7 の実装物・record には触れない」)。`technology-stack.md` 実測どおり常駐 service も無く、性能 SLO・レイテンシ・スループットの計測対象が存在しない
- 記載コマンドの実行コストは既存実装(U1-U6 の着地物)の性能特性に従い、U8 はそれを転記するのみ(`business-rules.md` BR-U8-1 転記のみ)。U8 自体が新たな性能負荷を加えない

## 検査面(該当する唯一の実行)

U8 で実行されるのは `requirements.md` FR-9 合否の既存 docs 参照整合ゲート(`business-rules.md` BR-U8-4 の t174 系 legacy-refs / 言語切替リンク検査)のみである。これは CI で既に走っている検査であり、U8 による追加時間は文書更新分の検査再実行に限られる。

- 合否: 既存 docs ゲートの実行が U8 の文書更新により有意な時間増を加えないこと(既存ゲートの再実行のみ — 新規検査を追加しない)。数値の固定は不要(既存ゲートの範囲内)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:45:46Z
- **Iteration:** 1
- **Scope decision:** none

文書 Unit の N/A は反証可能根拠付き、BR-U8-0〜6 全数実在・逐語一致、consumes 4 点実参照、未実測数値の基準混入なし、引用捏造なし。

### Findings

- None
