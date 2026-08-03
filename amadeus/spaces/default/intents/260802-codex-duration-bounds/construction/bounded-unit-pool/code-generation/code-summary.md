# Code Summary — bounded-unit-pool

## 実装結果

[#1919](https://github.com/amadeus-dlc/amadeus/issues/1919) の実装をBolt branch `bolt-bounded-unit-pool` で完了し、[PR #2071](https://github.com/amadeus-dlc/amadeus/pull/2071) をsquash mergeした。merge後に検出したE2E fixtureの契約不整合は [PR #2075](https://github.com/amadeus-dlc/amadeus/pull/2075) で追補し、同じIssueへ着地した。

- 最終PR head: `b396fe764cc794ac15595c7321cdb6ff65cb38af`
- squash merge commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`
- 追補PR head: `cb40ef31a2eb49d3c07e0ade89ccdadfdc079a63`
- 追補squash merge commit: `11fc8a7206c2b6960d122ef7cd99ef404fd846ce`
- rebase base: `origin/main` の `906612bdd`
- Issue状態: closed
- `in-progress` ラベル: 除去済み

## 主な作成・変更ファイル

- Unit pool core: `packages/framework/core/tools/amadeus-unit-pool.ts`、`amadeus-unit-pool-runtime.ts`
- orchestration／CLI: `amadeus-orchestrate.ts`、`amadeus-directive.ts`、`amadeus-swarm.ts`
- config／audit: `amadeus-config.ts`、`amadeus-audit.ts`、event registry、audit format knowledge
- harness契約: Claude、Codex、Cursor、Kimi、Kiro、Kiro IDE、OpenCodeのorchestrator surface
- tests: `t425-unit-pool.test.ts`、`t425-unit-pool-harness-parity.integration.test.ts`、`t379-swarm-canonical-emit.test.ts`、既存config／directive／audit回帰
- E2E追補: `t134-swarm-referee.test.ts` を固定pool lifecycle経由へ更新し、canonical queue eventの機密field非出力testを追加
- distribution: 7 harnessのpackageとroot self-install面。すべて正本から生成した。
- Intent実測: `fixed-workload.ts`（SHA-256 `d10e9e8fcd42f845f5ff42a2148f8081be2f2ec5aeae2595a34be1a606f4472c`）

## 主要な設計判断

- Codexで顕在化した長時間化だが、固定長Unit pool、cap解決、queue、attempt、retry admissionは全harness共通coreの意味論とし、Codex専用gate／専用counterを追加しない。
- `max-parallel-units` は project → space → intent の順で解決し、既定値とhard capを4に固定する。invocation overrideは解決済みcapを狭める場合だけ許可する。
- queue順、slot、依存ready判定、attempt budget、terminal resultはcanonical Unit poolだけが所有する。harnessはnative dispatchの受付、完了、reconciliationという観測事実だけを報告する。
- permit取得だけでは開始とせず、native handleを伴うdispatch確認だけを開始事実にする。no-effect確認は有界にFIFO tailへ戻し、effect possible／unknownはbatchをdrainする。
- 非成功Unitは推移的依存だけをcancelし、独立Unitは空いたslotで継続する。systemic uncertainty時は新規acquireを止め、active Unitのsettlementは受理する。
- 全状態遷移を検証済みEvent Setとして原子的にappendし、同じidempotency keyの再送は同一結果を返す一方、別requestへの再利用は拒否する。
- finalizeはpoolが存在しterminalであること、claimed Unitのpool outcomeが成功であることを再検証し、conductorの自己申告だけではmergeしない。

## 固定workloadのcontrol／treatment比較

同一入力 `codex-duration-bounds/four-independent-units/v1`（input digest `sha256:58f36fdd5015228b692f06892e9e57a4a4368314b1785cfcacc474557f3403c7`）を使用した。4個の独立Unitは各20msのfake workerで必ず成功し、3回warmup後に20回測定した。control checkoutは #1919直前の `906612bddeed6b46ede1991ab83be8682c7e50cc`、treatment checkoutは機能mergeの `a8e1ce025a918310ab7d803270bb6fc6b649c598` である。

| 指標 | control: whole-batch | treatment: cap=2 |
|---|---:|---:|
| median duration | 21.916ms | 43.176ms |
| p95 duration | 22.196ms | 44.839ms |
| Unit attempt | u0〜u3 各1 | u0〜u3 各1 |
| maximum active | 4 | 2 |
| queue order | u0, u1, u2, u3 | u0, u1, u2, u3 |
| termination reason | completed | completed |
| forbidden event fields | 0 | 0 |

cap=2は同時実行数を4から2へ機械的に半減し、全Unit完了、attempt不変、FIFO不変を維持した。均一fake workerでは2 waveになるためdurationが約2倍になるのは期待どおりであり、速度改善とは解釈しない。狙いはproviderのレート制約下でwhole-batch fan-outを防ぐことである。実providerのwall-clock値は環境差が大きいため、この決定的capacity probeとは分離して扱う。

## Worktree隔離と機密情報境界

- worker起動contractは全harnessで「割当Unit worktree内の相対pathだけを使用し、その外でgit操作を行わない」を固定する。Codex専用contractではない。
- `amadeus-swarm.ts` は `--test-file` がUnit worktree外へ解決される場合にtyped errorで拒否し、tracked protected fileをworktree自身のHEADと比較する。永続digestを別管理する代わりに、正本HEADから毎回integrity predicateを再導出する。
- `t134-swarm-referee.test.ts` のcase 5／8がprotected file改変をcheck／finalize双方で拒否し、case 11が `../` escapeを拒否する。
- `UnitPoolEvent` はtyped outcome、Unit／attempt／slot／native correlation factだけのclosed unionであり、producerはそのevent setだけをcanonical auditへappendする。`t425-unit-pool.test.ts` は実際に生成したevent setへprompt／credential／raw output fieldがないことを検証し、固定workloadでも該当field 0件を確認した。

## Comprehensive test configurationとTDD証跡

- test runnerは既存のBunを再利用した。`package.json` の `test:ci` はsmoke＋unit＋integration、`bunfig.toml` はcoverage ignoreだけを定義するため、新しい設定fileは追加していない。
- Unit: `t425-unit-pool.test.ts`。pure transition、cap 1／2／4、Unit 0／1／4／8、FIFO、retry、DAG、atomic append、機密field非出力を検証する。
- Integration: `t379-swarm-canonical-emit.test.ts` がCLI／audit／finalize、`t425-unit-pool-harness-parity.integration.test.ts` が7 harness同一coreとnative-fact-only contractを検証する。
- E2E: `t134-swarm-referee.test.ts` がreal git worktree、protected file、path confinement、lying-conductor、merge failureを検証する。
- TDD red→green 1: allowlist縮小後のCI run `30769637939`（head `d58a72f28`）で `terminalOutcome` 2行がredになり、依存Unit昇格test追加後のrun `30770083451`（head `b396fe764`）でGreenになった。
- TDD red→green 2: #2071 merge後の `t134` は7 pass／6 fail。pool lifecycle fixture追加後は13 pass／0 fail、対象4 fileは85 pass／0 failになった。

## テスト結果

- 最終GitHub CI run `30770083451`: `CI Success` を含む全必須job成功
- 追補GitHub CI run `30771097123`: `CI Success`、head/base/relative coverage、reviewを含む全必須job成功
- 追補後のfull `test:ci`: 754 files、10,239 assertions、0 failures
- CI外のE2E `t134`: 13 pass、0 failures、69 assertions
- 対象回帰: Unit pool／audit emission／harness parity／coverage gateを含む92 testsが成功
- 追加依存昇格test: 43 pass、148 assertions、0 failures
- `terminalOutcome` のLCOV実測: 232行24回、233行82回
- `bun run typecheck`: pass
- `bun run lint`: pass。既存warningのみ
- `bun scripts/package.ts --check`: 7 harness pass
- `bun run promote:self:check`: pass
- project coverage: 90.1663%
- patch coverage: measured 854、covered 701、allowlisted 153、uncovered 0
- CodeRabbit: pass
- unresolved review threads: 0
- Formal Model Check: このIntentではユーザーの明示判断によりskip

## 計画との差分

- review収束中に、Kiro系だけでなく全5つのskill型harnessでprepare例が解決済みcapを渡していないことを確認した。個別修正ではなくClaude／Codex／Kimi／Kiro／Kiro IDEを同じ共通契約へ揃えた。
- 最終reviewで数値型の往復、到達不能条件、CursorのMarkdown表分断、coverage allowlistの実行コード混入、失敗理由属性の未検証が見つかり、すべて修正した。
- allowlist縮小後の最初のCIで `terminalOutcome` 2行の未カバーが実証された。allowlistへ戻さず、成功した前提Unitが依存Unitをreadyへ昇格させる実動testを追加し、次のCIでpatch coverageを成功させた。
- merge後の追加確認で、`test:ci` 対象外の `t134` が新しいterminal-pool preconditionを通していないことを検出した。Issueを再openして `in-progress` を付け、fixtureを実運用と同じpool lifecycleへ修正し、追補PRの全CI・coverage・review成功後に再closeした。
- worker／PR側ではbatch 4の実装・監査・mergeが完了していたが、conductorへUnitのcode-generation plan／summaryだけが未反映だった。重複swarmや再mergeを行わず、本成果物へ既存の実装・CI・監査証跡を記録してcoverage ledgerを閉じた。

## 残課題

製品実装上の残課題はない。4 Issueの依存チェーンは #1602 → #1998 → #1999 → #1919 の順でmainへ着地し、#1919のE2E追補もmain `11fc8a7206c2b6960d122ef7cd99ef404fd846ce` に含まれる。実provider下のdurationはこの決定的capacity probeの性能値として流用しない。
