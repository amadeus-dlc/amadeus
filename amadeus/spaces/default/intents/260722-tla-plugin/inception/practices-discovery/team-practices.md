# Team Practices(差分ドラフト)— 260722-tla-plugin

上流入力(consumes 全数): code-structure、technology-stack、dependencies、code-quality-assessment、architecture、business-overview(同日 RE の codekb current view をスキャン代用として読了 — cid:practices-discovery:c1)

## 差分判定

**変更なし** — 本ドラフトは5正準セクション(Way of Working / Walking Skeleton / Testing Posture / Deployment / Code Style)をいずれも含まない部分ドラフトであり、practices-promote は既存 affirm 内容を byte-preserve する(cid:practices-discovery:c2 の部分ドラフト churn 回避)。

## 判定根拠

- 二層検証態勢(日常CI=PBT/unit/integration、並行プロトコル spec 変更時のみ形式検証)は 2026-07-22 のユーザー裁定として team.md Testing Posture に反映済み(cid:build-and-test:two-layer-verification-posture)— 本intentはその執行であり新規プラクティスではない
- JDK/Docker の opt-in 依存文書化義務は本intentの constraint-register(O1)に登録された intent 制約であり、全プロジェクト恒久のチームプラクティスに昇格させる根拠がまだない(1事例)
- RE codekb(同日)のスキャン面(CI・テスト・コードスタイル・セキュリティ)に、affirm 済み team.md / project.md と矛盾する実態は検出されていない
