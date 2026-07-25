# Code Generation Summary — mirror-distribution-docs

## 1. 結果

Architecture Review Iteration 1の5指摘を全て実装した。Mirrorのruntime契約は、1つの閉じたProjection Registryから6 dist面、4 self-install面、16 core tool、skill／registration、Guide／Reference日英4文書へ投影される。配布writeは事前journal、backup、candidate、file単位atomic rename、fsync、rollback／roll-forward recoveryを備え、read-only checkはshared read sessionで未完了transactionを拒否する。

依存Unitのrepair CLIも保持した。`repair status`、`repair relink --issue`、`repair abandon --operation`、Provenance V2、V1読取互換、V1 relink拒否は変更後も全回帰を通過している。

## 2. 実装内容

### 2.1 Transaction／recovery

- `.amadeus/distribution-transaction/`にcandidate、backup、journal、writer、reader、recovery、quarantineを配置した。
- owner recordをcandidateで完成・fsyncしてからatomic publishし、tokenとmonotonic generationでfencingする。
- shared／exclusive／recovery lockは5秒のtyped timeoutを持つ。alive owner、foreign host、PID／process-start不一致、ambiguous ownerを区別し、stale writerだけをrecovery publish後にquarantineする。
- 全対象のold／new digest、backup／absent marker、Registry digest、固定順を公開変更前にschema 2 journalへ永続化する。
- `prepared → committing → committed → cleaned`を単調遷移させ、same-parent candidate fsync、rename、parent fsync、`applied`記録の各境界をfailure injection可能にした。
- `prepared／committing`はrollback、`committed／cleaned`はroll-forwardする。復旧失敗時はjournal、transaction data、quarantine、recovery ownerを保持してfail closedにする。
- 1 file 2 MiB、1 transaction 64 MiBをlock取得前に検査する。次のwriteは未完journalの復旧を必須preflightとして実行する。

### 2.2 Registry／package／promote／validator

- `packages/framework/harness/projections.ts`が6 surface、16 Mirror tool、skill、manifest registration、Codex `openai.yaml` registration、4文書、dist／self stance、raw／golden parity、scan policyを所有する。
- absolute path、Windows absolute path、`..`、NUL、duplicate surface／target、root collision、unknown surface／artifact kind、self stance不整合を拒否する。
- Claude／Cursor／Kiro／Kiro IDE manifestとCodex／OpenCode emitのMirror skill登録をRegistry queryへ統一した。
- package／promote writeはRegistry digestをjournalへ渡す。checkは未完journalを拒否し、shared read sessionを保持してwrite 0で比較する。
- digest validatorは195 unique source／dist／self payloadを検査する。`listPublicRoot`で未登録Mirror wrapperをextraとして検出し、findingをsurface→path→kind順に整列する。
- scannerはRegistry由来の199 public filesを走査し、credential／token、absolute user path、2 MiB/file、64 MiB totalを検査する。内容やsecret値は出力しない。

### 2.3 Runtime contract／skill／docs／root解決

- `MIRROR_USER_CONTRACT`にmode、default、boolean compatibility、precedence、selector default、boundary、manual／repair command schema、completion order、failure、close guard、scope exclusionを集約した。
- C8 renderer、legacy CLI help、lifecycle CLI help、strict parser、skill、docs validatorが同じcontractを一方向に消費する。runtimeからbuild-time validatorへのimportはない。
- lifecycle parserはcommandごとのrequired／optional optionだけを許可し、duplicate、cross-command option、positional argument、欠落required optionをusage errorにする。
- 4文書は32 canonical topicを共有し、command schemaとactive Space／Intent defaultを含む。same-wrong locale、missing／duplicate／unknown marker、legacy／矛盾表現をfailさせる。
- `resolveMirrorRecordIdentity(projectDir, space?, intent?)`を追加し、module pathの親階層数に依存せず、sourceと4 self layoutから同じSpace／Intent UUID／record pathを解決する。

### 2.4 CI／performance

- 通常checkはtypecheck→Biome→complexity→distribution→dist→promote→testsの順序を維持する。
- `ubuntu-24.04`、Bun 1.3.13の3 replicaが、それぞれ3 warm-up＋20 runで次の5 workloadを測定する。
  - package write: p95 30秒、RSS 512 MiB
  - package check: p95 30秒、RSS 512 MiB
  - promote: p95 20秒、RSS 512 MiB
  - docs parity: p95 2秒、RSS 512 MiB
  - digest matrix: p95 2秒、RSS 128 MiB
- aggregate jobは3 artifact必須、schema、runner image完全一致、20-run completeness、max/min比2.0以下、median p95、median RSSを検査する。
- `distribution-release-gate`は通常checkとaggregateの両方が`success`の場合だけ成功する明示AND gateである。

## 3. Test

- `t285`: closed Registry、path／collision／stance、unknown kind、emit list／contract duplicate禁止
- `t286`: atomic owner publish、reader race、typed timeout、stale／alive／ambiguous fencing、path／symlink／capacity
- `t287／t291`: 4 docs、skill、両CLI help、canonical contract、negative wording
- `t288`: 199 public fileのsecret／absolute path／capacity scan
- `t289`: 195 payload parity、1-byte drift、未登録wrapper extra
- `t290`: journal全境界、disk-full相当、rollback／roll-forward、失敗証跡保持、管理外file保持
- `t292`: 5 workload protocol、3 replica aggregateの欠損／image／分散／budget failure
- `t293`: release blockingとsource＋4 self layout、default／non-default Space、active／explicit Intent matrix

## 4. 検証結果

| 検証 | 結果 |
|---|---|
| 対象配布回帰 | 9 files、45 pass、0 fail、325 expect |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0、273 warnings、17 infos、fix 0 |
| `bun tests/complexity-gate.ts --check` | exit 0、0 new violations、0 regressions、baseline 58不変 |
| `bun run distribution:check` | exit 0、195 payloads、4 documents／32 topics、199 public files |
| `bun run dist:check` | exit 0、6 harness同期 |
| `bun run promote:self:check` | exit 0、4 self-install面同期 |
| `bun tests/gen-coverage-registry.ts --check` | exit 0、fresh、guards green、ratchet held |
| local 5-workload benchmark | 全workload 20 runs、各local budget内 |
| local 3-replica aggregate fixture | exit 0、5 workloads |
| `bun run test:all` | PASS、594 files、7,540 assertions、0 fail |
| `git diff --check` | exit 0 |

local benchmarkはprotocol確認であり、固定GitHub Actions runnerの性能達成証拠には昇格しない。CIの3-replica aggregate結果が性能budgetの正本である。既存Biome warningとcomplexity baselineは緩和していない。test-size driftは既存の`t-codex-hooks-migration.test.ts` 1件（medium→large）のみで、新規driftはない。

## 5. 計画との差分

### 5.1 人間承認済みのlifecycle owner移管

当初C9 `mirror-distribution-docs`を開始した時点で、文書化対象の`repair status`、`repair relink --issue <n>`、`repair abandon --operation <id>`がproduction lifecycle adapterから到達不能だった。このhard stopに対し、2026-07-25に人間が「C9でruntime semanticsを仮定せず、ownerである先行Unit `mirror-operation-lifecycle`へ戻して実装し、その後C9へ戻る」方向を承認した。

変更ownerは`mirror-operation-lifecycle`であり、変更方向はC9から先行lifecycle ownerへの差戻しである。同ownerがrepair CLI wiring、parser／selector、challenge／atomic consumeを実装した。さらに既存Provenance V1がinspection-clock `createdAt`をdigestへ含めないsecurity contract矛盾について、人間が選択肢1の明示Provenance V2を承認した。lifecycle ownerはV1 read互換を保持しつつ、新規relinkをV2限定とし、C3 reducer内でprovenance／plan bindingを再計算する変更を所有した。

C9はruntime command、failure semantics、Provenance schemaをskill、両CLI help、Guide／Referenceへ一方向に投影するUnitであるため、到達可能なrepair CLIと確定済みV2 contractなしにはcontract parityを閉じられなかった。C9側はこれらのruntime semanticsを再実装せず、確定後のcontractをRegistry、生成、docs validator、release gateへ投影した。

### 5.2 Registry基数の確定

予備計画のentrypoint tool＋skillだけを数える概念subsetから、closed Registryが所有する実公開集合へ拡張した。最終ownerは`packages/framework/harness/projections.ts`であり、16 core Mirror tools（entrypoint 1＋wrapper 15）、skill、registrationを6 dist面＋4 self-install面へ展開する。

- tool: source 1＋dist 6＋self 4＝11
- wrapper: source 15＋dist 90＋self 60＝165
- skill: source 1＋dist 6＋self 4＝11
- registration: 6 manifest sources＋Codex dist 1＋Codex self 1＝8
- unique parity set: 11＋165＋11＋8＝195 paths
- public scan set: parity 195＋Guide／Reference日英4文書＝199 files

Codex `openai.yaml`のsource ownerとdist pathは同一pathなのでunique集合では一度だけ数える。性能はRegistry展開後の実workloadを測り、capacityは2 MiB/file／64 MiB/transactionの実bytesを検査するため、拡張に伴うbudget／threshold緩和はない。上記の人間承認済みowner移管とRegistry基数確定以外に、承認済み計画からの差分はない。

### 5.3 変更インベントリ

source／設定／文書:

- `packages/framework/harness/projections.ts`
- `packages/framework/harness/{claude,codex,cursor,kiro,kiro-ide,opencode}/manifest.ts`
- `packages/framework/harness/{codex,opencode}/emit.ts`
- `scripts/{manifest-types,package,promote-self,distribution-transaction,mirror-distribution-check,mirror-docs-contract,scan-public-projections,mirror-distribution-benchmark,mirror-distribution-benchmark-aggregate}.ts`
- `packages/framework/core/skills/amadeus-mirror/SKILL.md`
- lifecycle owner変更: `packages/framework/core/tools/{amadeus-mirror.ts,amadeus-mirror-config.ts,amadeus-mirror-coordinator.ts,amadeus-mirror-executor.ts,amadeus-mirror-lifecycle.ts,amadeus-mirror-presentation.ts,amadeus-mirror-repair.ts,amadeus-mirror-state-codec.ts,amadeus-mirror-state-reducer.ts,amadeus-mirror-types.ts,amadeus-orchestrate.ts}`
- `.github/workflows/ci.yml`、`package.json`
- `docs/{README.md,README.ja.md,guide/22-intent-mirror.md,guide/22-intent-mirror.ja.md,reference/20-intent-mirror.md,reference/20-intent-mirror.ja.md}`

test:

- 既存回帰更新: `tests/{unit,integration,e2e}/t258-amadeus-mirror-skill*`、`tests/{unit,integration,e2e}/t265-engine-boundary*`、`tests/unit/t268-amadeus-mirror-policy.test.ts`
- lifecycle owner追加: `tests/unit/t279-amadeus-mirror-executor.test.ts`、`t280-amadeus-mirror-coordinator.test.ts`、`t281-amadeus-mirror-presentation.test.ts`、`t283-amadeus-mirror-repair-cli.test.ts`、`tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`、`t284-amadeus-mirror-repair-cli.integration.test.ts`
- C9追加: `tests/unit/t285-mirror-projection-registry.test.ts`、`tests/integration/t286-distribution-transaction.integration.test.ts`、`t287-mirror-docs-contract.integration.test.ts`、`t288-public-projection-scanner.integration.test.ts`、`t289-mirror-distribution-projection.integration.test.ts`、`t290-distribution-transaction-recovery.integration.test.ts`、`t291-mirror-docs-parity.integration.test.ts`、`t292-mirror-distribution-performance.integration.test.ts`、`tests/e2e/t293-mirror-distribution-release-gate.test.ts`

generated:

- 6 dist面: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/`配下の各harness tool rootにある`{amadeus-mirror.ts,amadeus-mirror-{config,coordinator,executor,lifecycle,presentation,repair,state-codec,state-reducer,types}.ts,amadeus-orchestrate.ts}`と、各skill rootの`skills/amadeus-mirror/SKILL.md`
- 4 self-install面: `.claude/`、`.codex/`＋`.agents/`、`.cursor/`、`.opencode/`配下の同じtool集合と`skills/amadeus-mirror/SKILL.md`
- 既存harness同期の付随生成物: `.claude/tools/team-up.sh`

workflow state、audit、先行Unitのplan／summaryは既存変更として保持し、このUnitの生成インベントリへ混在させていない。

## 6. 生成・変更の扱い

6 dist面は`bun scripts/package.ts`、4 self-install面は`bun scripts/promote-self.ts --apply --no-build`だけで最終再生成した。generated fileを直接編集していない。

このworktreeには本Unit開始前から`mirror-operation-lifecycle`、workflow state、auditの未commit変更が存在した。それらを保持したまま依存修復と配布変更を追加しており、Git commitは作成していない。
