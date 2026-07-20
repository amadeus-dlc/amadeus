# Integration Test Instructions — 260719-tally-choice-ruling

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象

- `bun test tests/integration/t235-election-store.integration.test.ts` — materialize の winner 形 round-trip
- `bun test tests/integration/t236-election-loop.integration.test.ts` — 選挙ライフサイクル E2E(**人間解決 hold の『裁定: 不採用』期待は E-TCRCG=A どおり不変** — rulingOverride 経路の閉包)+verify-mismatch 検出(winner 形の改竄 fixture)
- 全層: `bash tests/run-tests.sh --ci`(bolt 実測: exit 0、388 files / 5504 assertions / Failed 0)

## 合否基準

t236 の裁定行期待が変更されていないこと(裁定準拠の検証点)。verify(election.ts recompute 比較)が新 TallyResult 形で機能すること(t236 mismatch fixture で実証済み)。
