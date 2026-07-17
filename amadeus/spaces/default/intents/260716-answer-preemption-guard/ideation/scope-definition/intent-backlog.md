# Intent Backlog — answer-preemption-guard

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`。

## バックログ(優先順)

| # | アイテム | 由来 | 受け入れ基準の種 |
|---|---------|------|-----------------|
| B1 | answer-evidence sensor(manifest+実装+発火宣言) | Issue #922 提案 (a) | fixture 赤+corpus sweep 白の両側実測 |
| B2 | cutoff 定数の canonical 化(必要時) | C2/R2 | gate-start と sensor が同一定数を import |
| B3 | (b) lint 化の採否判断(採用時は実装) | Issue #922 提案 (b)、pre-approved 分岐 | design 文書に採否と根拠 |
| B4 | dist/self-install 同期+runner-gen check | C4 | dist:check / promote:self:check exit 0 |
| B5 | Issue #922 クローズ(着地 grep 後) | close-after-landing-verification | PR MERGED+着地面 grep 出力確認 |

## 非バックログ(明示 OUT)

旧様式 corpus 111 件の遡及是正(cutoff で恒久除外 — #1106 の設計決定を継承)。
