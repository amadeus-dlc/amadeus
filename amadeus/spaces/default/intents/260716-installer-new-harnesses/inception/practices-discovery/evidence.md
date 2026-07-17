# Evidence — practices-discovery(installer-new-harnesses / Issue #1048)

上流入力(consumes 全数): codekb の code-structure.md / technology-stack.md / dependencies.md / code-quality-assessment.md / architecture.md / business-overview.md(いずれも本 intent RE で全数再検証済み・区間不変の既存台帳 — c1 の同日 RE 代用)、本 intent RE scan-notes.md。

## 証跡スキャン(c1 — 同日 RE codekb 代用)

- **CI・テスト面**: RE 面5(全数性の二層分担 — installer literal 契約 / t149+dist:check)と面3(setup-pack-contract ハーネス非依存)が実測済み — 既存 project.md Mandated(dist:check/promote:self:check 必須・installer 変更の検証プロファイル)と完全整合
- **コードスタイル面**: packages/setup は Biome+tsc 配線済み(project.md Mandated「新設パッケージは lint と型検査の配線を同一 PR で」の先行充足を RE 面1で確認 — 変更不要)
- **セキュリティ面**: 依存追加ゼロ・credential 非接触(feasibility C-1、RE 面2 の汎用機構実測)
- **リリース面**: release.yml 一本化(C-4)— 本 intent は version 面非接触

## 差分ギャップ分析

affirm 済み team.md / project.md(本日 E-PM2/PM3/PM4 の persist 後の最新)との突き合わせ: 本 intent が導入する新実践なし・既存実践との矛盾なし — **ギャップ 0件**。

## 実施記録

- Observed: 2d945b13cc2fb84689a7987846df81eb630b1bd5(2026-07-16)
