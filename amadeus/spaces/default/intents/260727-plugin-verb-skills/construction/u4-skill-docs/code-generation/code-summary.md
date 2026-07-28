# Code Summary — U4 u4-skill-docs(Bolt 4)

上流入力(consumes 全数): code-generation-plan.md 経由で business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、unit-of-work.md、requirements.md を消費(plan 各項と1:1)

## 実装結果(branch bolt/u4-skill-docs @ 2971f004e+help 是正、PR #1624)

- SKILL.md(119行、英語、mirror 様式・count-free 導出形・マーカー不含)
- 投影: literal entry ×5 manifest+emit.ts 配列 ×2(ADR-3 実装時是正どおり。projections.ts 不触)。7 dist 面+5 self-install 面に skills/amadeus-plugin を find 実証
- docs 19-plugins EN/JA: 入口3系統再構成+install 手順+面区別(EN/JA 同一変更)
- テスト t354(integration、14 pass)+列挙ガード7面追随(設計列挙外の2面 = t-cursor-adapter の exact toEqual / t150-codex の個数 pin → 申告のうえ追随、後者は count-free 化)
- help 陳腐化の fold: `/amadeus plugin` help 行へ install 追記(Bolt 2 の usage 同期漏れ — builder 報告 → conductor が入口 Unit の範囲内として同 PR 是正、t31/t354 green 再確認)

## 検証エビデンス(builder 実測+conductor の help 是正後再実測)

package/promote/typecheck/lint/dist:check/promote:self:check/runner-gen check = 全 exit 0。`bash tests/run-tests.sh --ci` = exit 0(626 files / 8613 assertions / 0 fail)。coverage:ci exit 0、patch gate 7/7。落ちる実証: マーカー注入 → t354 1 fail → 復元 green(one-set、stash 不使用、残渣なし確認)。

## 申告済み事項

- 設計列挙外の列挙ガード2面の追随(上記 — 同一機械クラス、無音吸収せず申告)
- t150-codex の個数 pin(42)を count-free 化(claude 面との集合等価 — count-comment-sync-on-catalog-change 準拠、集合差分は loud のまま)
