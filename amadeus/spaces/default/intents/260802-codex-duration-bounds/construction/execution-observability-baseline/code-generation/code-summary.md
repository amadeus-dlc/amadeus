# Code Summary — execution-observability-baseline

## 実装結果

[#1602](https://github.com/amadeus-dlc/amadeus/issues/1602) の実装をBolt branch `bolt-execution-observability-baseline` に作成した。

- commit: `713c90a66e0b0a1dd1a50a5f42d8ceafd3811b3c`
- commit message: `feat(observability): add audit-first execution baseline`
- rebase base: `origin/main` の `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`

## 主な作成・変更ファイル

- shared core: `packages/framework/core/tools/amadeus-execution-contract.ts`、`amadeus-execution-lifecycle.ts`、`amadeus-execution-projection.ts`、`amadeus-harness-capability.ts`、`amadeus-baseline-manifest.ts`
- canonical integration: `amadeus-audit.ts`、`amadeus-runtime.ts`、`amadeus-harness.ts`、`amadeus-utility.ts`、event registry、audit format、state template
- tests: `t406`〜`t410`のunit／integration test、event registry／audit sync／birth provenanceの回帰test、coverage registry
- documentation: state machineとruntime graphの英語／日本語reference
- distribution: 7 harnessの`dist/` packageと、影響する5 self-install面。すべて正本から生成した。

## 主要な設計判断

- canonical IDとlifecycle mutationはshared coreの単一writerだけが所有し、harness native IDはavailability付きfactとして保持する。
- canonical auditとrequired state/runtime projectionをnative side effect前のbarrierにし、OTelはbest-effort sinkへ隔離する。
- monotonic clockを優先し、wall fallback、逆行、片側欠測をtotalなmeasurement qualityとして保持する。invalidを0msへ変換しない。
- resume／compact／process restartは同じ非terminal rootを再利用し、Redoは`supersedesOperationId`付きの新rootを生成する。
- baseline manifestはauditを耐久正本として再構築し、prompt、回答、credential、raw absolute pathを保存しない。
- Codex専用gateや専用停止semanticsは追加せず、7 harness共通contractとcapability差だけで表現する。

## テスト結果

- #1602対象test: 83 pass / 0 fail
- 既存runtime／drift回帰: 35 pass / 0 fail
- full `test:ci`: 742 files、9,983 assertions、0 failures
- `bun run typecheck`: exit 0
- `bun run lint`: exit 0。既存cognitive-complexity warningのみで、新しい例外追加なし
- `bun scripts/package.ts --check`: 7 harness pass
- `bun run promote:self:check`: 5 self-install pass
- swarm referee: 対象83件＋typecheckで `converged:true`、`tampered:false`

## 計画との差分

- full `test:ci` は約10分を要し、swarm refereeの固定60秒timeoutでは必ずfalseになるため、referee判定には対象83件＋typecheckを使用した。full suite、package、promoteはworker側で別途Greenを取得した。
- swarm prepareはIntentのstate／auditだけをUnit worktreeへ渡し、設計成果物を渡さなかった。conductorがworktree隔離を維持したまま正準契約をworkerメッセージとして補完した。
- application codeにAPI、database、UI、deployment変更は不要だった。

## 残課題

製品実装上の残課題はない。refereeの60秒固定timeoutと長いproject convergence commandの不整合は、swarm実行基盤側の改善候補として別に扱う。
