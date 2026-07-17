# Unit Test Instructions — standing-delegation-grant

上流入力(consumes 全数): `../standing-grant/code-generation/code-generation-plan.md`、`../standing-grant/code-generation/code-summary.md`

## 実行方法

- 一次スイート: `bun test tests/integration/t-standing-grant.test.ts`(グラント機構の専用スイート。単体粒度の純関数テスト — StandingGrant.parse/isExpired/standingGrantSatisfiesGate/findActiveStandingGrant — を含む)
- 関連単体: `bun test tests/unit/gen-coverage-registry.test.ts`(登録目録の鮮度)
- 全体: `bash tests/run-tests.sh --ci`(smoke/unit/integration/e2e 4層)

## カバレッジ目標と実測

- Comprehensive 戦略: 主要コンポーネント 10-15 テスト → 実績 **47 テスト**(plan 見積り超過。GrantVerifier/GrantVerbs/AcceptanceSeam/ProtectedTaxonomy/DoctorRow の全コンポーネントを被覆)
- patch gate: 追加 243 行中 covered 235+allowlist 8(理由付き spawn-blindspot)= **uncovered 0**
- in-process seam: 判定ロジックは dist lib の直接 import で駆動(bun-coverage-spawn-blindspot 対策)

## テストデータ管理

- 監査シャード・state は `mkdtempSync` の一時ディレクトリに合成(手動セットアップ不要)。GRAPH はコミット済み stage graph を `loadStageGraph()` で読む
- RED/WHITE 命名規約: 落ちる側(拒否)を RED、通る側(受理・非対象)を WHITE として対で置く
