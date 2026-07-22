# Practices Evidence — 260720-leader-store-sync

上流入力(consumes 全数): business-overview, architecture, code-structure, technology-stack, dependencies, code-quality-assessment — c1 代用の内実はこの codekb 6点(architecture.md の「leader 所有物の機械的同定と main 同期運搬」節、code-structure.md の scripts/・tests/ 配置、technology-stack.md の Bun/gh 前提、dependencies.md の外部依存最小性、code-quality-assessment.md の検証ゲート水準、business-overview.md のワークスペース境界)

## 証跡の代用宣言(practices-discovery:c1)

同日(2026-07-20)の RE 差分リフレッシュ(re-scans/260720-leader-store-sync.md、observed c4e4fca1a)が本 intent の関連面を実測済みのため、独立再スキャンをせず代用する:

- **CI/テスト面**: t232 帯の2層様式(unit = 純関数 in-process / integration = mkdtempSync+fake GhRunner port 注入)— scan-notes §テスト前例。
- **コードスタイル面**: mirror.ts idiom(判別ユニオン parse・GhRunner port・no-shell spawn・exit 0/1/2 契約)— scan-notes §前例 tool。
- **運用規範面**: norm-pr-from-main-base / E-PM10A / weekly-distillation の verbatim 引用 — scan-notes §規範データ。

## affirm 済み層との差分ギャップ

team.md / project.md の affirm 済みプラクティスと上記実測の突き合わせで**差分ギャップ 0**(新 tool は既存 idiom の踏襲で足り、新規プラクティスの導入を要しない)。質問 0 件(E-OC1 判定対象の質問自体が不在)。
