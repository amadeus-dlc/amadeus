# Integration Test Instructions — intent 260815-per-unit-outcome

## 対象と実行

- 主再現 + 拘束固定: `bun test tests/integration/t533-per-unit-consume-fanout.integration.test.ts`(20 — per-unit 経路 seed / pool 併存 de-dup / 冪等 / 母集団外無視 / 改竄 fail-closed)
- 無退行: `bun test tests/integration/t425-unit-pool-harness-parity.integration.test.ts tests/unit/t425-unit-pool.test.ts tests/unit/t-construction-outcome-projection.test.ts`
- swarm guards: t207 / t211-swarm-batch-progress / t135 / t251 / t379(98 tests)
- OTel 不変量との整合: t403-issuance-guard / t449(settle emit 追加に伴う fixture リセット同期 — CI 赤 2 クラス目の是正対象)

## 実行規約

- 複数 path 列挙時は実行前に全 path の実在を機械確認し、実行後に期待ファイル数と runner 報告数を照合する(test-path-set-completeness)
- フルスイートは CI(`bash tests/run-tests.sh --ci` 相当のブロッキング集合)を正とする
