# Unit Test Instructions — 260814-autonomy-stop-fixes

上流入力: `code-generation-plan.md`(S2/S4 の TDD 手順)と `code-summary.md`(実測結果)。

## 対象と実行

本 unit(issue-2974-error-arm-boundary)の検証面は契約文面の drift ガードであり、repo ファイルを読むため size classifier は medium — 新設テストは integration 層に常駐する(unit allowlist 不増の既決ノルム)。unit 層に本 unit の新規テストはない。

- 既存 unit 層のリグレッション確認: `bash tests/run-tests.sh --ci` に含まれる unit スイート全体の green 維持が受け入れ条件(FR 由来の新規 unit テストは該当なし — 変更が実行コードでなく契約文書のため)
- 要件トレース: FR-ERR-1 / FR-BND-1 / FR-BND-2 → `tests/integration/t2974-error-arm-boundary.integration.test.ts`(integration-test-instructions.md 参照)

## カバレッジ

- production TypeScript 追加行 0 のため patch coverage の新規対象なし(`coverage-patch-quick` advisory PASS を code-generation で実測済み)。Project Coverage Gate は PR CI の絶対下限 + 相対許容幅の AND 条件で判定する
