# Business Logic Model — u9-docs-norms

上流入力(consumes 全数): unit-of-work(u9 = C9 文書分 200・u8 後続)、requirements(FR-3.5 / FR-6)、components(C9)、component-methods(C9 契約)、services(外部境界の文書化対象 — installer 経路の説明が新経路と一致すること)、unit-of-work-story-map(Slice 4 — 契約の固定)。

測定 ref: file:line は observed `63e69d922`。

## 文書更新の対象面(FR-6.1 の棚卸し)

| 文書 | 更新内容 |
|---|---|
| README / README.ja | 配布モデル(Release Asset)・onboarding 手順(clone → bun install → `bun run build` → ハーネス起動 — FR-3.5)。日英対訳の同期(docs-language-ownership) |
| CONTRIBUTING(:17,:48) | 「generated, committed, and drift-guarded」→ source-only 契約の記述へ |
| AGENTS.md:90(手書き部) | 手編集禁止規約の文言を新境界(dist はローカル生成物・drift guard は再現性検査)へ改訂 |
| 各ハーネスガイド / リリース手順(docs/) | asset 配布・build 前提の反映。**対象は「dist / drift / promote / codeload」語彙の repo 全域 grep から導出**(enumeration-completeness の docs 面 — 正規文書起点でなく語彙 grep 起点) |
| `.gitattributes` | 未追跡化面のエントリ整理(u8 で機能面は完了 — u9 はコメント・説明の整合) |
| `.gitignore` 契約コメント | u8 で書換済み — u9 は他文書との相互参照の整合確認のみ |

## ノルム PR 5点の起草(FR-6.2 — norm-changes-via-pr)

規範衝突5点(#2043 記載・requirements FR-6.2)の内訳は **project.md 改訂4点(norm PR 対象)+文書記述1点(FR-6.1 の文書更新で実施 — memory 層でないため norm-changes-via-pr の対象外という規範定義からの一意導出。精密化申告: requirements の「5点のノルム PR」は 4+1 のこの分割で充足)**。本 Unit の成果は**文案起草まで**で統一(reviewer iteration 1 Major の是正)— norm PR の作成・レビュー・マージは conductor の執行業務(ソロ運用の leader 執行面)として Bolt 外で行う:

1. Forbidden「dist 手編集禁止」→ 削除+G3 受容論証(ADR-A8 (4) を出典)の記録
2. Forbidden「ドリフトガードの手動代替禁止」→ 置換検査(再現性比較)を正とする改訂
3. Mandated「dist:check / promote:self:check を検証に含める」→ 再現性検査+鮮度検査+境界ガードへ改訂
4. Forbidden「dist relocation の user-facing 棚卸し」→ 本 intent の棚卸し実施を記録して維持(削除しない)
5. CLAUDE.md / AGENTS.md / `.gitignore` の「dist は生成・コミット・ドリフトガード対象」記述 → **norm PR 対象外(memory 層でない)— FR-6.1 の文書更新(上表)で実施し、衝突5点の第5項として消し込む**

## 順序契約

u8 着地後に着手(unit-of-work DAG)。文書は切替後の実態を記述する(先行すると乖離)。ノルム PR は文書 PR と別建て(norm-changes-via-pr — 実装 PR への混載禁止)。

## 異常系

| 異常 | 挙動 |
|---|---|
| 文書と実態の乖離(grep 漏れ) | 対象面棚卸しの語彙 grep(dist/drift/promote/codeload)で検出し、レビューで残存 0 を確認 |
| ノルム PR の文案が裁定と乖離 | norm PR レビュー(当事者+非当事者)が捕捉(norm-pr-provenance-reviewer) |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T19:44:59Z
- **Iteration:** 1
- **Scope decision:** none

OQ-5 への回答が『起草まで』と『起草+PR発行まで』で自己矛盾(Major)。衝突5点の第5項が FR-6.1/6.2 境界で混在(Minor)

### Findings

- Major: Unit 受け入れ基準の自己矛盾 — 統一が必要
- Minor: 4+1 分割の明示が必要

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T19:44:59Z
- **Iteration:** 2
- **Scope decision:** none

『文案起草まで』への3ファイル統一と 4+1 分割の精密化申告の閉包を確認。norm-changes-via-pr の memory 層限定定義からの一意導出として成立、cid 引用全件実在、退行なし

### Findings

- 閉包確認: Major/Minor とも是正着地。findings なし
