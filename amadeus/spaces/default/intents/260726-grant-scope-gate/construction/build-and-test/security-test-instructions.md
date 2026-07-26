# Security Test Instructions — 260726-grant-scope-gate

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象(認可述語の変更 — project.md Mandated「認可に関わる変更」)

code-summary.md の変更は認可述語 `standingGrantSatisfiesGate` に触れるため、以下をセキュリティ regression として実行済み:

- **fail-closed**: 未知スコープ / Scope フィールド不在 / scope-grid 不在 → covered=false(人間承認へフォールバック、throw なし)— `t-standing-grant-composed-scope.test.ts` で固定
- **walking-skeleton 除外**(project.md Forbidden): `amadeus-feature` + stance=on + opt-in グラントで first construction gate が covered=false
- **phase boundary 除外**: opt-out グラントが真の phase boundary を覆わない
- **team-mode regression**: `t-standing-grant.test.ts`(48 pass)で既存 team 経路の分類不変
- **audit invariant**: 汎用 CLI からの GRANT_ISSUED 手動 mint 拒否(既存 `amadeus-audit.ts:850-854` 面、変更なし)

## 依存 audit

repository 全体の dependency audit は対象外(cid:build-and-test:c1-doctor-seam — 対象変更のセキュリティ regression と別判定)。本変更は新規依存ゼロ(package.json 不変)。
