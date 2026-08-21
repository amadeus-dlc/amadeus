# Unit Test Instructions — 260820-fmc-drift-batch

Test Strategy = **Comprehensive**。テスト本体は各 unit の code-generation で TDD(Red→Green 実測、落ちる実証同梱)により実装済みであり(各 `construction/<unit>/code-generation/code-summary.md` の検証節参照)、本書はその実行手順と観点の正本参照を与える。テスト設計の由来は各 unit の `code-generation-plan.md`。

## フレームワークと実行方法

- ランナー: `bun test <path...>`(unit 層は `tests/unit/`)
- 一括実行(unit 層のみ): `bash tests/run-tests.sh --unit`(フル実行はリモート CI を正本とする — push-first 規律)
- filesystem / process を使う medium test は integration 層に置く(unit allowlist を増やさない — cid:code-generation:c2-doctor-seam)

## unit 別の対象テストと観点

| unit | 主要テスト | 観点(要件 trace) |
|------|-----------|------------------|
| revise-model-commit | `tests/unit/t448-tla-registration.test.ts`(28 pass / 59 expect) | FR-REG-1〜5: revise-model の replace-by-name、`revise-target-missing` の loud 拒否(fail-open の赤ベースライン→Green 実測済み)、t3078 による leaf 宣言の落ちる実証 |
| boundary-three-face | `tests/unit/t-formal-verif-model-map-v2.test.ts`、`tests/unit/t146-core-hygiene.test.ts` | FR-BND-1〜6: validator 受理側 / loader in-boundary / glob drift の3面 Red→Green、SOURCE_DRIFT 両アーム、t146 anchored glob 衛生 |
| advisory-retirement | `tests/unit/t481-pr-convergence-lifecycle.test.ts` ほか期待値更新8ファイル(code-summary 参照) | FR-RET-1〜4: authoring-hold 経路退役後の残存ゼロ census(9キー)、削除テスト t528/t524 の baseline 8 pass 実測済み |
| applicability-arms | (integration 層が主戦場 — integration-test-instructions.md 参照) | FR-ARM-1〜7 |

## カバレッジ目標

- blocking 正本は CI の Project Coverage Gate(絶対下限 AND merge-base 相対)+ Patch Coverage Gate — 4 PR すべてこのゲートを green で通過済み
- ローカルでの coverage 反復は `coverage-patch-quick`(advisory)を標準とし、フル `coverage:ci` は原則不要(cid:code-generation:coverage-patch-quick-pre-push-standard)

## テストデータと環境

- 追加のテストデータ準備は不要(各テストが fixture を自己完結で持つ)
- fail-closed 枝(model-source-unreadable 等)は公開 seam 経由でテスト化済み(エラーパスも実行可能な振る舞い — TDD 既定)
