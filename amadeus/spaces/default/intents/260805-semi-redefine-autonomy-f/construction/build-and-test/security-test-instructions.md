# Security テスト手順 — intent 260805-semi-redefine-autonomy-f(#2253)

上流入力(consumes 全数): `code-generation-plan.md`(全 7 Unit)、`code-summary.md`(全 7 Unit)

本 intent は**認可(authorization)の再定義**そのものであり、7 Unit すべてが `nfr-design/security-design.md` を持つ。よって Comprehensive strategy の security 面は実検査として生成する。検査は各 Unit の security-design が名指しした境界へ trace し、それ以外の一般 SAST/DAST は追加しない(戦略名だけを根拠に検査を機械追加しない)。

## 検査対象境界(security-design からの trace)

| 境界 | 出典(security-design 節) | 検査 |
|---|---|---|
| 認可強度の保存 — semi が full の緩和版にならないこと | semi-authorization-core §「認可強度の保存(4 点)」 | `tests/unit/t451-semi-authority.test.ts`、`tests/unit/t452-authorize-interaction-semi.test.ts` |
| 梯子入口の単一述語化と縮退方向(縮退は必ず拒否側) | semi-authorization-core §「梯子入口の単一述語化と縮退方向」 | `tests/unit/t452-authorize-interaction-semi.test.ts`、`tests/integration/t453-semi-ladder-runtime.integration.test.ts` |
| grant 意味論の不侵食(FR-AUTH-3) | semi-authorization-core §「grant 意味論の不侵食」 | `tests/integration/t453-semi-ladder-runtime.integration.test.ts` |
| 昇格・緩和経路の封鎖(起動宣言で権限を上げられないこと) | launch-autonomy-flag §「昇格・緩和経路の封鎖(4 点)」 | `tests/unit/t450-autonomy-flag-apply.test.ts`、`tests/integration/t450-autonomy-flag-branch.test.ts` |
| 入力検証 loud / fail-closed(3 値全一致のみ受理、値なしは loud 停止、projection `unreadable` は拒否側へ縮退) | launch-autonomy-flag §「入力検証(loud、fail-closed)」 | `tests/unit/t449-autonomy-flag-parse.test.ts` |
| 値の consume(`--autonomy` の値が intent 自由文へ漏れないこと) | launch-autonomy-flag §「入力検証」 | `tests/unit/t449-autonomy-flag-parse.test.ts`(3 値とも assert) |
| 受理境界の等価強度(FR-ADV-3 / NFR-6) | advisory-auto-resolution §「受理境界の等価強度」 | `tests/unit/t459-advisory-receipt.test.ts`、`tests/integration/t458-advisory-auto-resolution.integration.test.ts` |
| fail-closed の 2 分岐構造(認可不成立時に第2経路へ落ちない) | advisory-auto-resolution §「fail-closed の 2 分岐構造」 | `tests/unit/t457-advisory-auto-resolve.test.ts` |
| 強制実行の封鎖(FR-ADV-4) | advisory-auto-resolution §「強制実行の封鎖」 | `tests/integration/t458-advisory-auto-resolution.integration.test.ts` |
| 質問 carve-out が human-declared semi Intent に限定されること | stop-question-carveout | `tests/integration/t456-question-carveout-predicate.test.ts` |
| decision policy 搬送が指令面を越えないこと | semi-policy-carrier | `tests/unit/t454-semi-policy-carrier.test.ts`、`tests/integration/t455-semi-policy-cli.integration.test.ts` |

## 実行方法

上記ファイル群は unit / integration の通常実行に含まれる。security 面として個別に回す場合:

```
bun test ./tests/unit/t451-semi-authority.test.ts
bun test ./tests/unit/t452-authorize-interaction-semi.test.ts
bun test ./tests/unit/t449-autonomy-flag-parse.test.ts
bun test ./tests/unit/t457-advisory-auto-resolve.test.ts
bun test ./tests/unit/t459-advisory-receipt.test.ts
bun test ./tests/integration/t453-semi-ladder-runtime.integration.test.ts
bun test ./tests/integration/t456-question-carveout-predicate.test.ts
bun test ./tests/integration/t458-advisory-auto-resolution.integration.test.ts
```

## 秘密情報・監査面

- 認証情報・トークンをコード・成果物・監査行へ書かない。認可判定は basis 指紋(digest)で記録し、原文の人間入力を監査へ複製しない。
- 監査発行はツール所有(散文からの emit を作らない)。認可経路の変更は state 遷移前に監査を発行する audit-first 原則を維持する。

## 依存監査(範囲の分離)

対象変更の security regression と、リポジトリ全体の dependency audit は**別判定**とする。本 intent は依存を追加・更新していないため、依存 advisory の解消は本 intent の受け入れ条件に含めない。既存の High advisory があれば隠さず conditional readiness として申し送る(本 intent の実行時点で新規の依存 advisory は観測していない)。

## 適用しない検査とその根拠

- **DAST / 実行中サービスへの攻撃試験**: 本リポジトリは常駐サービスを持たない(CLI とフレームワーク配布)。攻撃対象の実行面が存在しない。
- **injection(SQL/コマンド)試験**: 本 intent は外部入力を SQL・シェルへ渡す経路を追加していない。起動フラグの値域は 3 値の全一致検査で閉じている。
