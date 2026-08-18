# Unit Test Instructions — 260818-priority-bug-batch-4

Test Strategy = Comprehensive。要件・リスク・NFR 由来のカバレッジを課すが、コンポーネントあたり 15 テストは**計画上の上限であってノルマではない**。上流入力は 2 unit の `code-generation-plan.md`(step 一覧)と `code-summary.md`(Red / Green 証跡)。

## フレームワークと実行方法

- ランナー: `bun test`(自作ランナー `tests/run-tests.sh` の unit 層)
- 単体実行: `bun test tests/unit/<file>` / 複数指定可
- 時間係数: `TEST_TIME_FACTOR`(CI 既定 2)。timeout の乗算は `tests/lib/test-time-factor.ts` の `scaleTestTime` を経由する
- 複数 path を列挙して実行する場合は、実行前に全 path の実在を機械確認し、実行後に期待ファイル数と runner の報告数を照合する(ランナーは不存在 path を無音で除外しうる — `cid:build-and-test:test-path-set-completeness`)

## 要件由来のカバレッジ

### Unit 1 `issue-2837-invoke-swarm-context`(FR-2837-1〜5)

| 対象 | テスト | 主張 |
|---|---|---|
| directive が batch identity を搬送する | `tests/integration/t135-invoke-swarm.test.ts` | emit された `invoke-swarm` が `batch` を持ち、値が 1-origin DAG 番号と一致する |
| batch identity の validator | `tests/unit/t113.test.ts` | `amadeus-directive.ts` の受理述語が非整数・0・負値を拒否する |
| 7 conductor 面の同期 | `tests/unit/t181-conductor-skill-parity.test.ts` | 各面が `directive.batch` を持ち、手打ち形 `--batch <n>`(`HAND_TYPED_BATCH`)が**不在**である |
| 配送先ツリー(dist 投影)の同期 | `tests/integration/t425-unit-pool-harness-parity.integration.test.ts` | 7 ハーネスの `dist/<harness>/<instruction>` が同一の pool プロトコル文言を持つ |
| batch 進捗の読み口 | `tests/unit/t211-swarm-batch-progress.test.ts` | batch 単位の進捗が emit 値と同じ番号で join される |

**t181 と t425 は同一リテラルについて不在 / 存在を主張する対の契約である。**片方だけを更新すると必ず矛盾するため、ハーネス面の文言を変える変更では常に両方を同一変更で更新する。

### Unit 2 `issue-3106-per-unit-outcome`(FR-3106-1〜4)

| 対象 | テスト | 主張 |
|---|---|---|
| per-unit 経路の cancelled unit が terminal outcome を持つ | `tests/integration/t533-per-unit-consume-fanout.integration.test.ts` | cancelled unit に `UNIT_OUTCOME_SETTLED` が記録され `producer-outcome-pending` が残らない |
| supersession 規則 | 同上 | 既存 settled 行があるとき最後の観測が採られる(`settledOutcomeHistory` の読み口) |
| pool 経路との対称性 | 同上 | pool 優先 de-dup 下で settle 行が二重計上されない |

## カバレッジ期待値

- Project Coverage Gate: 固定絶対下限 90.00% **かつ** merge-base 相対の許容低下幅 0.02pp。両条件は AND であり片方の通過を達成と扱わない
- Patch Coverage Gate: 追加行の未カバー 0 件(allowlist 計上を除く)
- いずれもリモート CI が正本(`ci-success` 集約ジョブ)。ローカルは advisory
