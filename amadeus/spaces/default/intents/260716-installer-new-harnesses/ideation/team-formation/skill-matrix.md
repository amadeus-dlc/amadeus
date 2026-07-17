# Skill Matrix — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../scope-definition/scope-document.md`(In/Out・単一 Bolt 見込み)、`../scope-definition/intent-backlog.md`(B-1〜B-4)、`../feasibility/feasibility-assessment.md`(GO・S 規模見積もり)。

## 必要スキル × 充足

| スキル面 | 必要度 | 充足(体制内の所在) |
| --- | --- | --- |
| TypeScript/Bun(functional-domain-modeling — HarnessName のブランド型+スマートコンストラクタ) | 高 | builder(既存 harness.ts の parse 様式踏襲)+conductor レビュー |
| installer ドメイン(packages/setup の層構造 — domain/modules/cli) | 高 | e3(前 intent RE 台帳)+#1048 台帳 |
| テスト設計(全数性テスト・共変偽 green 回避・サイズ純度) | 高 | e3(t149 設計・#1060 t229 事故の当事者知識) |
| npm 公開物検証(npm pack --dry-run) | 中 | 前 intent の c4 既決手順の再利用 |
| CI 体制(patch gate / 相対ゲート) | 中 | e3(#1060/#1067 レビュー実測) |

ギャップ: なし — 外部スキル調達不要。

## ギャップ判定

外部スキル調達・追加メンバー要請なし — 全必要面が体制内で充足(上表)。
