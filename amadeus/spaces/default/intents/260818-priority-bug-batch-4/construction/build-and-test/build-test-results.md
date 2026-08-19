# Build and Test Results — 260818-priority-bug-batch-4

上流入力は 2 unit の `code-generation-plan.md` と `code-summary.md`。本ステージは両 unit の PR に対する**リモート CI を blocking 検証の正本**とし(push-first / remote-first)、ローカルは型検査・lint・対象テスト・境界検査までを実測する。

## 本ステージ開始時点の CI 赤と帰属

`code-generation` 完了時点で両 PR の必須 CI が赤だった。原因を実測で切り分けた結果は次のとおり。

| PR | 失敗チェック | 一次証跡 | 根本原因 | 帰属 |
|---|---|---|---|---|
| #3202 | `Tests` / `Coverage Report (head)` / `Coverage Report` / `CI Success` | run 32125609682(head `38eb5fcd2`)job 95675465924 / 95675465853 | `tests/integration/t425-unit-pool-harness-parity.integration.test.ts:33-39` が退役リテラル `--batch <n>` を pin | **自変更由来** |
| #3202 | 上記のうち `Tests` の `t433` 1 件のみ | 同 run | 同一 run・同一 head の `Coverage Report (head)` では同テストが pass。ローカル b1 でも 14 pass / 0 fail | **flake**(再実行で回復) |
| #3203 | `Coverage Report (head)` / `Coverage Report` / `CI Success` | run 32124975790 job 95673526117(head `124dc234d`) | Patch Coverage Gate: 追加 59 行中 4 行未カバー(`amadeus-orchestrate.ts:4790-4793` = `settledOutcomeHistory` の for ループ本体) | **自変更由来** |

`t425` の失敗は 7 ハーネス全ケースが `:33` で停止し、逐語で `Expected to contain: "prepare --batch <n> --units <all> --concurrency <directive.cap>"`。同一リテラルについて `t181`(`HAND_TYPED_BATCH`)は**不在**を主張しており、両テストが正面から矛盾していた。U1 の join 面 census(P1〜P7)は `packages/framework/core/tools/` の code join のみを走査対象としており、`tests/` を含まなかったのが取りこぼしの機序。

`t433` の帰属は、ローカル再現や ablation を組む前に**同一 run の別ジョブとの突合**で確定した。

## リテラル census(修正判断の根拠、実測)

測定 tree = `bolt-pbb4-b1` の head `38eb5fcd2`。対象集合 = 7 ハーネスの instruction 正本(`packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide}/skills/amadeus/SKILL.md` と `{cursor,opencode}/commands/amadeus.md`)。述語 = `grep -qF -- "<literal>" <file>` を zsh 配列で 7 面へ適用し一致面数を数える。

| リテラル | 一致 |
|---|---|
| `never owns queue order` | 7/7 |
| `prepare --batch <n> --units <all> --concurrency <directive.cap>`(旧) | **0/7** |
| `prepare --batch <directive.batch> --units <all> --concurrency <directive.cap>`(新) | 7/7 |
| `acquire` / `confirm-dispatch` / `settle-release` / `record-reconciliation` / `late-result-observed` / `finalize` の各旧形 | いずれも **0/7** |
| 同上・各新形 | いずれも 7/7 |
| `pool exists and is terminal` | 7/7 |

7 面すべてが新形へ一貫して移行済みで旧形は全滅していたため、**誤りは実装・prose ではなく旧契約を pin したままの t425** と判定し、t425 側を resync した(実装・prose は無変更)。

なお初回の census は全リテラルが 0/7 という偽陰性を返した。原因はシェル(zsh)でクォートなし変数展開が語分割されないため、ファイル集合のループが 1 回だけ不正パスで回っていたこと。配列展開で書き直して上表を得た。

## Unit 1 `issue-2837-invoke-swarm-context`(PR #3202)

対象 worktree = `/Users/j5ik2o/orca/workspaces/amadeus/bolt-pbb4-b1`、ブランチ `bolt-pbb4-invoke-swarm-context`。

### 落ちる実証(両側)

| 段 | コマンド | 結果 |
|---|---|---|
| Red(修正前) | `bun test tests/integration/t425-unit-pool-harness-parity.integration.test.ts` | 7 ケース全てが `:33` で fail |
| Green(修正後) | 同上 | **7 pass / 0 fail**(91 expect) |

同一の assert が旧リテラルの不在で赤、新リテラルの存在で緑になることを両側で実測しており、述語が飾りでないことが確定している。

### ローカル検証

| 検証 | コマンド | 結果 |
|---|---|---|
| 対の契約 | `bun test tests/unit/t181-conductor-skill-parity.test.ts` | 10 pass / 0 fail |
| 隣接 5 ファイル | `bun test tests/integration/t135-invoke-swarm.test.ts tests/unit/t181-... tests/unit/t211-... tests/integration/t425-... tests/unit/t113.test.ts` | **134 pass / 0 fail**(373 expect、5 files) |
| 型検査 | `bun run typecheck` | exit 0 |
| lint | `bun run lint` | exit 0(既存 warning 474 / info 21、error 0、1863 files) |
| ビルド | `bun run build` | exit 0 |
| 追跡ファイル不変 | `git status --porcelain \| wc -l`(build 前 / 後) | 0 / 0 |
| 配送先ツリー再検証 | 再ビルド後の `bun test tests/integration/t425-...` | 7 pass / 0 fail |
| 境界検査 | `bun run source-only:check` | `source-only boundary: clean` / exit 0 |
| coverage 台帳 | `bun tests/gen-coverage-registry.ts --check` | `coverage registry: OK (fresh, guards green, ratchet held)` / exit 0 |
| t433(flake 帰属) | `bun test tests/integration/t433-no-silent-drop-event-ledger.integration.test.ts` | 14 pass / 0 fail / exit 0 |

コミット `7924e1914` `test(#2837): resync the harness-parity literals to the carried batch identity`(1 file、テストのみ、production 挙動の変更なし)。push 済み。

### リモート CI(確定値)

run 32135817142(head `7924e1914`)、conclusion **`success`**。

| ジョブ | 実測値(ログ逐語からの転記) |
|---|---|
| Tests (job 95706853703) | `Test files: 1055` / `Failed files: 0` / `Total assertions: 14039` / `Failed assertions: 0` / `RESULT: PASS` |
| Coverage Report (head) (job 95706853757) | `Failed files: 0` / `Failed assertions: 0` / `RESULT: PASS` |
| Project coverage gate | `OK — current 93.4131%, absolute minimum 90.00%, merge-base 40.9395%, relative tolerance 0.02pp, delta 52.4736pp` |
| Patch coverage gate | `PASS` / `measured added lines: 30, covered: 30, allowlisted: 0, uncovered: 0` |

PR rollup: SUCCESS 17 / FAILURE 0 / PENDING 0、mergeStateStatus **`CLEAN`**(`BEHIND` から解消)。t433 の再発なし(flake 判定が実測で裏づけられた)。

## Unit 2 `issue-3106-per-unit-outcome`(PR #3203)

対象 worktree = `/Users/j5ik2o/orca/workspaces/amadeus/bolt-pbb4-b2`、ブランチ `bolt-pbb4-per-unit-outcome`。

Patch Coverage Gate の逐語:

```
Patch coverage gate: FAIL
measured added lines: 59, covered: 55, allowlisted: 0, uncovered: 4
  UNCOVERED packages/framework/core/tools/amadeus-orchestrate.ts:4790
  UNCOVERED packages/framework/core/tools/amadeus-orchestrate.ts:4791
  UNCOVERED packages/framework/core/tools/amadeus-orchestrate.ts:4792
  UNCOVERED packages/framework/core/tools/amadeus-orchestrate.ts:4793
```

同 run のテストスイート自体は `Failed files: 0 / Failed assertions: 0 / RESULT: PASS`、Project Coverage Gate も `OK — current 93.4102%, absolute minimum 90.00%, merge-base 40.9395%, delta 52.4707pp` で通過している。したがって**テストの赤ではなく、追加した実行可能行の真の未カバー**である。未カバー 4 行は supersession の読み口(既存 settled 行がある状態で再 settle する経路)であり、lcov の幽霊未カバー(複数行型注釈・連続コメント行)には該当しない。

### 是正

`tests/integration/t533-per-unit-consume-fanout.integration.test.ts` に、同じ supersession 列を**エクスポートされた `handleNext` シーム経由で in-process 実行**するテストを 1 件追加した(実装 `amadeus-orchestrate.ts` は無変更、+101 / -15 行)。既存のサブプロセス版は end-to-end のピンとして残し、台帳・再入ヘルパを両者で共有する形へ整理した。

サブプロセスで `next` を起動する既存テストはプロセス境界を跨ぐため親プロセスの LCOV から見えず、settle emitter が**自分が書いた行を読み返す**箇所が未カバーとして残っていた、というのが未カバーの機序である。

追加テストは経路を踏むだけでなく、その読み取りが**何を決めるか**を主張する: (1) 台帳が空の初回は両 Unit とも素の triple キーで着地する (2) 観測が変わった Unit だけが既存行の隣に**次のリビジョン** `#2` として着地する(既存行を読まなければ得られない番号) (3) 観測が変わらない再実行では 1 行も追記されない。

| 検証 | コマンド | 結果 |
|---|---|---|
| 対象テスト | `bun test tests/integration/t533-per-unit-consume-fanout.integration.test.ts` | **27 pass / 0 fail**(281 expect) |
| 対象行の被覆(ローカル lcov) | `bun test --coverage --coverage-reporter=lcov --coverage-dir=<repo外>` の DA レコード | `4790:72` / `4791:43` / `4792:19` / `4793:28`(修正前は未カバー) |
| 型検査 | `bun run typecheck` | exit 0 |
| lint | `bun run lint` | exit 0(既存 warning 474 / info 21、error 0) |
| coverage 台帳 | `bun tests/gen-coverage-registry.ts --check` | `OK (fresh, guards green, ratchet held)` / exit 0 |

#### 落ちる実証(注入 → 赤 → revert を 1 セット)

conductor が独立に実施した。

1. 注入: `settledOutcomeHistory` の読み取りを潰す 1 行(`return history;` を for ループ前に挿入)を `packages/framework/core/tools/amadeus-orchestrate.ts` へ追加。`git diff --stat` = `1 file changed, 1 insertion(+)`
2. 赤の実測: `bun test tests/integration/t533-...` → **26 pass / 1 fail**。落ちたのは追加した in-process テスト 1 件のみで、サブプロセス版は緑のまま(= サブプロセス版ではこの欠陥を検出できないことの実証でもある)
3. revert と残渣ゼロ: `git checkout --` 後、`git status --porcelain` = **0 行**、`git diff --stat` 空、注入マーカーの grep 件数 **0**、再実行で **27 pass / 0 fail** に復帰

コミット `980cb6b06` `test(#3106): drive the settled-outcome history read on the in-process seam`(1 file、テストのみ)。push 済み。

### リモート CI(確定値)

run 32137269066(head `980cb6b06`)、conclusion **`success`**。

| ジョブ | 実測値(ログ逐語からの転記) |
|---|---|
| Tests (job 95711499440) | `Test files: 1055` / `Failed files: 0` / `Total assertions: 14039` / `Failed assertions: 0` / `RESULT: PASS` |
| Coverage Report (head) (job 95711499212) | `Failed files: 0` / `Failed assertions: 0` / `RESULT: PASS` |
| Project coverage gate | `OK — current 93.4141%, absolute minimum 90.00%, merge-base 40.9395%, relative tolerance 0.02pp, delta 52.4746pp` |
| Patch coverage gate | **`PASS`** / `measured added lines: 59, covered: 59, allowlisted: 0, uncovered: 0`(修正前は `covered: 55, uncovered: 4`) |

PR rollup: SUCCESS 17 / FAILURE 0 / PENDING 0、mergeStateStatus **`CLEAN`**(`BLOCKED` から解消)。

## 総合ステータス

| Unit | PR | head | CI conclusion | rollup | mergeStateStatus |
|---|---|---|---|---|---|
| `issue-2837-invoke-swarm-context` | #3202 | `7924e1914` | `success` | SUCCESS 17 / FAILURE 0 / PENDING 0 | `CLEAN` |
| `issue-3106-per-unit-outcome` | #3203 | `980cb6b06` | `success` | SUCCESS 17 / FAILURE 0 / PENDING 0 | `CLEAN` |

**両 unit とも blocking の正本(`ci-success` 集約ジョブ)が green。** 本ステージ開始時点の赤 3 クラス(t425 台帳の陳腐化 / t433 flake / patch coverage 未カバー 4 行)はすべて閉じた。

両 PR とも未解決レビュースレッドは 0 件(`reviewThreads.totalCount = 0`)。トップレベルコメントは `coderabbitai` / `cursor[bot]` のみで、#3202 の最新コメントは `Bugbot couldn't run - usage limit reached` というボット基盤の通知であり指摘ではない(`Check unresolved comments` チェックは SUCCESS)。

## 未検証面

- 本ステージはローカルでフルスイート(`bash tests/run-tests.sh --ci`)を完走していない。フルスイート・coverage・conformance の blocking 判定はリモート CI の実測に依拠する(push-first / remote-first)
- マージ可否そのものは本ステージの判定範囲外。base 競合・レビュー収束・必須 check の最新 head 再実測は後続の `pr-convergence` ステージが担う
- 実 conductor による end-to-end の swarm 実行(#2837 の directive を実際に消費する経路)は本 intent を通じて未実施。検証したのは engine が emit する directive 実物と配送先ツリーの記述の 2 断面(Unit 1 の code-summary の申告どおり)
