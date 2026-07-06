# Scope Document — Presence Evidence（260705-presence-evidence）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)

## スコープ内

1. **採否判断の材料整理と人間個別確認**（requirements gate）: 実施候補 3 案 + feasibility 実測 2 件（転記前 mint 不在、同秒ティア）を判断材料として提示し、契約級の採否を確定する。
2. **採用時（候補 1 系）**: mint 規律拡張とのセット設計 + `verifyDocsOnlyEvidence` への相関検査 + 先に失敗する eval。
3. **不採用時（候補 3）**: 設計境界の文書化（audit-format.md または docs へ、監査可能性 + PR gate を防衛線とする整理を明記）。
4. どちらの結論でも: validator + test:all の pass、PR 作成（merge は人間）。

## スコープ外

| 項目 | 理由 | 行き先 |
|---|---|---|
| presence hook のハーネス差解消（Cursor 不発火の修正） | ハーネス実装依存 | 既知事象として Corrections 管理 |
| audit の暗号学的改ざん耐性 | 別次元の対策 | 将来 Issue |
| declare-docs-only 以外のガード見直し | #366 系の全面再設計は範囲外 | 将来 Issue |

## 受け入れ条件（Issue #506）

presence 相関の要否が判断され、採用時は eval 付き実装、不採用時は設計境界の文書化がされている。

## 段階分割

単一 PR。候補確定後の作業は 1 方向（実装 or 文書化）に収束するため分割の利得はない。
