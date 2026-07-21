# Code Generation Plan — team-up Codex safety-wait

## 目的とdegraded input境界

本計画はCode GenerationのPART 1（Planning）を起点とし、承認済み契約に従ってTDD実装まで継続する。対象は`team-up.sh`が管理するcurrent runのleaderと全engineerのCodex paneで、既知の`Additional safety checks` UIが`Keep waiting`を現在選択中であることを完全fingerprintで証明できた場合だけEnterを1回送り、作業継続を妨げる停止を解除するbugfixである。2026-07-21T10:01:45ZにleaderがHerdr 0.7.1／Codex 0.144.6／120x34の自然modalをexact captureし、選択済み`Keep waiting`へEnterを1回だけ送りmodal消失を確認したため、そのsanitized positive fingerprintをproduction内部allowlistへ固定する。test-only closed-schema fixtureは同じ公開契約の回帰検証にだけ使い、production entrypoint、CLI、environment、filesystemから機械的に到達不能にする。

post-send visible stateは`modal-present`／`confirmed-absent`／`unknown`の閉じた三値にする。完全一致したpositiveだけを`modal-present`、明示的なtest seamの完全一致だけを`confirmed-absent`とし、非一致text、ANSI、wrap、partialはすべて`unknown`とする。productionにはconfirmed-absence oracleを置かず、`unknown`ではpane latchを維持して再送しない。これにより自然captureでproduction activationを行っても、送信後の不確実な表示から二度目のEnterへ到達しない。

bugfix scopeではUser Stories、Application Design、Units Generation、Functional/NFR DesignがSKIPで、runtime graphにもUnit集合がない。engine-resolved memory pathは`amadeus/spaces/default/intents/260721-teamup-safety-wait/construction/code-generation/memory.md`のまま維持する。一方、`code-generation` stageは`for_each: unit-of-work`であり、artifact guardが`construction/<unit>/code-generation/`を正規成果物境界とするため、暗黙の単一Unit `team-up-safety-wait`として正準plan pathを次へ固定する。

`amadeus/spaces/default/intents/260721-teamup-safety-wait/construction/team-up-safety-wait/code-generation/code-generation-plan.md`

storyを捏造せず、`requirements.md`のFR-1〜6、AC-1〜10、Reverse Engineering由来の`business-overview.md`、`architecture.md`、`code-structure.md`へ各Stepを追跡する。このdegraded input注記は実装後の`code-summary.md`にも引き継ぐ。

## 所有境界と停止条件

- 所有するのは、pure fingerprint判定、Herdr 0.7.1のrole→pane一意解決/visible read/Enter seam、pane単位latch/rearm、supervisor排他とteam-up fresh/resume/kill/failure cleanupだけである。team-up既存規約に従い、Codex role `leader`はHerdr agent label `leader`へ、`eN`は`engineer-N`へexact変換し、変換不能・0件・複数件をfail-closedにする。
- `scripts/team-up.sh`がsupervisorの起動・停止だけを所有し、長寿命poll loopとfingerprint判定は専用helperへ分離する。
- server-side safety check、Codex/Herdr本体、approval policy、通常質問、composer、shell、Claude pane、別session/run、agmsg bridge、`scripts/team-msg.sh`、pane ID永続化、fuzzy/scrollback/recent match、選択移動keyは変更しない。
- production support allowlistは、leaderのagmsg一次証拠（capture UTC 2026-07-21T10:01:45Z、Herdr 0.7.1、Codex 0.144.6、120x34、title／説明／choices順／selected marker／guidance、secret/PII 0、Enter総数1、modal消失確認）をsanitizedしたexact positiveだけに限定する。test-only fixtureはproductionから参照せず、CLI flag、environment variable、runtime path、公開注入parameterを設けない。productionのconfirmed-absence集合は空とし、任意の非一致textをabsence oracleへ昇格させない。
- production差分は新helperと`team-up.sh`を合わせて250〜400 LOC、test差分は250〜450 LOCを目安とする。productionが400 LOCへ到達、対象file追加が必要、既存`team-msg.sh`/`run-codex.sh`/agmsg/Herdr/Codex契約変更が必要、またはtest-only fixtureがproductionから到達可能になる場合は実装を継続せず再承認を求める。

## 対象ファイル

| 種別 | path | 役割 |
| --- | --- | --- |
| New production | `scripts/team-up-codex-safety-wait.ts` | pure fingerprint、version gate、role/pane identity照合、poll/stability transaction、Enter 1回、latch/rearm、診断、CLI supervisor |
| Existing production | `scripts/team-up.sh` | Codex roleごとのsupervisor起動、PID/lock metadata、fresh/resume/`--kill`/failure cleanup。Claudeと非対象sessionは不変 |
| New unit test | `tests/unit/t-team-up-codex-safety-wait.test.ts` | FR-1〜4/6とAC-1〜4/8〜10の決定的unit regression |
| Existing integration test | `tests/integration/t-team-up-codex-resume.test.ts` | fake Herdrへ必要なread/list/send seamを追加し、FR-5とAC-5/6のfresh/resume/kill/failure lifecycleを回帰検証 |
| New fixtures | `tests/fixtures/team-up-codex-safety-wait/` | test-only closed-schemaのpositive/negative visible text fixture。production import・CLI/env注入・runtime filesystem参照を禁止し、secret、個人データ、pane IDを含めない |
| Record | `amadeus/spaces/default/intents/260721-teamup-safety-wait/construction/team-up-safety-wait/code-generation/code-generation-plan.md` | 本承認前plan |
| Later record | `amadeus/spaces/default/intents/260721-teamup-safety-wait/construction/team-up-safety-wait/code-generation/code-summary.md` | 承認後の実装結果、degraded input、検証、逸脱 |

`package.json`、lockfile、`tsconfig*.json`、Biome/test runner設定、`packages/framework/`、`packages/setup/`、`dist/`は変更しない。既存設定が`scripts/**/*.ts`と`tests/**/*.ts`を対象にするため、新test configurationは不要であることをStep 1で再確認する。

## Test strategy

active strategyはMinimalであり、新規unit testはrequirement-drivenにする。pure helperのhappy pathと各fail-closed分岐をFR/ACごとに最低1ケース置く。FR-5はshell/Herdr process lifecycleを伴いunit testだけでは検出できないため、既存の`tests/integration/t-team-up-codex-resume.test.ts`へ限定的に回帰ケースを追加する。新規integration test fileやE2E suiteは作らない。

test-first順序を強制し、1 test→最小実装のvertical sliceで進める。最初のtracerは「test-only positive fixtureではpure state machineをgreenにできるが、同じfixtureをproduction activation entrypointへ到達させる経路がなく、production decisionは入力0件のまま」である。実環境のcurrent paneへEnterを送るlive testは行わず、送信はfake Herdrだけで検証する。

## 実装手順

- [x] **Step 1: fixture境界とtest configurationを固定する。** production supported fingerprint allowlistを空の定数として固定し、production entrypointへallowlist/fixtureを渡すparameter、CLI flag、environment variable、runtime fixture pathを設けない。`tests/fixtures/team-up-codex-safety-wait/`だけにpositive/negative closed-schema fixtureを置き、positiveは`Keep waiting`現在選択marker、modal title、説明全文、全選択肢順、confirm guidance、version、pane columnsを含むテスト契約とする。production fileから`tests/`参照0をstatic negative testで固定し、既存tsconfig/Biome/Bun discoveryでtest config変更0を確認する。実表示のexact raw bytes・version・columns provenanceが後日揃うまでactivationはdisabledを維持する。Trace: FR-2、Constraints、Assumptions、AC-1/10。
- [x] **Step 2: production非到達tracerをRED→GREENにする。** `t-team-up-codex-safety-wait.test.ts`へ、test-only positive fixtureをpure matcherへ明示注入するとpositive stateを表現できる一方、引数を持たないproduction decision interfaceは空allowlistだけを使い、同じfixtureでも`unsupported-fingerprint`かつ入力0件になる1 testを先に追加する。production import graph、CLI help、environmentからfixture/allowlist injection seamがないことも同じ公開境界で固定する。最小実装でこの1 testだけをGREENにしてから、未知version、marker欠損、ANSI/wrap/空白/行順差、role 0/複数、二重読取不一致、1,000ms境界内外、pane identity変更、同一modal latch、modal不在2回rearm、事後確認失敗、秘匿診断を1件ずつ追加する。Trace: FR-1〜4/6、AC-1〜4/8〜10。
- [x] **Step 3: lifecycleのfalling integration regressionを先に作る。** 既存fake Herdrをversion/list/read/send-keys/action-log対応へ最小拡張し、Codex freshでleader+全engineer supervisor起動、Claudeは0件、resumeの冪等性、同一session/run/roleのactive owner高々1、`--kill`とlaunch failureでhelper残存0を追加する。production配線前に該当caseが赤になることを記録する。Trace: FR-5、AC-5/6/8。
- [x] **Step 4: pure fingerprint/version/state machineを実装する。** 新helperへclosed fixture schema、CRLF→LF以外を許可しない比較、test adapterが明示allowlistを渡せるpure matcher、空allowlistだけを所有してfixture注入interfaceを公開しないproduction decision、単調時計のnormal poll/stability transaction、one-shot latch、modal不在連続2回rearm、typed no-input reasonを実装する。filesystem/Herdr processを呼ばないdeep module seamを保つ。Trace: FR-2〜4/6、AC-1〜4/10。
- [x] **Step 5: Herdr adapterと安全なCLI supervisorを実装する。** Codex role `leader`/`eN`を既存team-up規約のHerdr agent label `leader`/`engineer-N`へexact変換し、`agent list`からsession/run/roleに対応するephemeral pane identityをexactly oneで解決する。2回のvisible readと送信直前再解決が同一で、最初のread完了からstability read完了および送信開始まで各1,000ms以下の場合だけ`pane send-keys <pane> enter`を1回実行する。送信後1秒以内の再読取、session/pane消失、version drift、read failure、lock競合は入力0件で診断する。pane本文全体は永続化しない。Trace: FR-1〜4/6、Reliability/Security、AC-1〜4/8〜10。
- [x] **Step 6: supervisor排他とlifecycle cleanupをteam-upへ配線する。** runtime=codexのcurrent run rolesだけを対象に、`(session, run, role)`単位の原子lockとPID metadataをrun record配下へ置く。全pane生成後にfresh/resumeの各roleを起動し、既存live ownerは再利用、unknown/stale/multiple ownerはfail-closedにする。`--kill`、pane/session終了、layout/start failure、rollbackでhelperをcleanupし、worktreeやCodex processは巻き込まない。Trace: FR-1/5/6、AC-5/6/8。
- [x] **Step 7: falling regressionsをgreenへ反転する。** Steps 2/3の同一commandsを再実行し、Enter action logがpositive transactionごとに1件、全negative caseで0件、cleanup後process/lock残存0であることを確認する。Trace: 全FR、AC-1〜10。
- [x] **Step 8: focused既存回帰を実行する。** `t-team-up-codex-safety-wait`、`t-team-up-codex-resume`、`t-team-up-msg-backend`、`t-team-msg`、`t-run-codex-project-target`を実行し、既存messaging/monitor/resume/kill/named instance契約の非退行を確認する。実Herdr paneへの入力は0件とする。Trace: NFR Maintainability/Testability、AC-7。
- [x] **Step 9: static/negative scope verificationを実行する。** `bun run typecheck`、対象Biome、`git diff --check`を通す。差分scanで`team-msg.sh`、`run-codex.sh`、agmsg、`packages/framework`、`packages/setup`、`dist`、lockfile変更0、fuzzy/recent/scrollback/選択移動key/approval bypass追加0を確認する。production/test LOCと対象file集合を計測し、上限到達時は停止する。Trace: Constraints、Out of scope、AC-7/10。
- [x] **Step 10: repository gateを実行する。** `bun run check`、`bun run dist:check`、`bun run promote:self:check`、`bun run test:ci`を同一最終SHAで実行する。既存失敗がある場合は対象差分との独立性を証明し、greenへ読み替えずleaderへ報告する。Trace: NFR、AC-7。
- [x] **Step 11: Code Generation成果物・sensor・独立reviewを閉じる。** `code-summary.md`へ変更file、degraded input、red→green、Enter 0/1件、production allowlist空・disabled-by-default、test-only fixtureのproduction非到達、LOC、全検証、逸脱を記録する。linter/type-check/answer-evidence sensorを確認し、amadeus-architecture-reviewer-agentの最大2回reviewでsecurity boundaryとlifecycleを審査する。review上限後の未解決findingは隠さずgateへ送る。
- [x] **Step 12: upstream normとpositive provenanceを再固定する。** `git fetch origin main`後の`origin/main` SHA `890351ed41b524ddd358a8e8036d1d2f52981759`から`team.md`全文を再読し、一次証拠・一意fact・決定済み契約・機械適用が揃う場合はelection不要、それ以外はelection、plan preflight＋SHA freeze、既存election履歴は非遡及というnormの前向き適用をACKした。HEADとは相互に非祖先でdirty 224件、origin差分との交差14件のため統合不能と判定し、merge／stash／reset／checkout／rebaseを行わない。leaderの2026-07-21T10:01:45Z自然modal captureをagmsg一次証拠としてsanitized positive provenanceへ固定する。
- [x] **Step 13: C1を再現するREDを追加する。** post-send最初のreadがANSI／wrap／partialになり、その後も同じunknownが続き、exact modalが再出現する各caseで、最初の結果が`sent-unconfirmed`、latchが維持され、Enter総数が1であることを先にtestへ追加する。任意の`normal output`をabsence oracleにした既存testは、明示されたtest-only confirmed-absenceへ置換する。Trace: FR-3/4/6、AC-2/3/4/10。
- [x] **Step 14: 閉じた三値分類を最小実装する。** post-sendと後続pollの双方で`modal-present`／`confirmed-absent`／`unknown`を同じpure classifierから判定する。unknownとmodal-presentはabsence連続数をリセットしてlatchを維持し、明示test seamのconfirmed-absenceが連続2回だけrearmする。production confirmed-absence集合は空の内部定数とする。Trace: FR-3/4/6、AC-2/3/4/10。
- [x] **Step 15: 120x34 positiveをproduction内部allowlistへ固定する。** fingerprint schema、pane identity、送信直前再解決へrowsを追加し、exact sanitized natural modalをproduction source内のprivate constantへ固定する。test fixtureは同じsanitized bytesでschemaを検証するが、production source/import graph／CLI／env／runtime filesystemから`tests/fixtures`への到達0をstatic testで固定する。`production-enabled`はこの内部positiveが存在する場合だけ0とする。Trace: FR-1/2/3、AC-1/2/8/10。
- [x] **Step 16: GREENと全検証を閉じる。** focused unit→integration 5-suite→typecheck→format→complexity→full coverage→sensor→summaryを同一差分で実行する。実Herdr／current runへの入力は0件、fake adapterのpositive transactionごとのEnter総数は1件、全negative／unknown caseは追加入力0件であることを記録する。既知の他Intent差分には触れず、background processを操作しない。
- [x] **Step 17: e4独立確認と例外Formal Review I3を一回だけ行う。** GREEN証拠、差分、production caller接続、fixture非到達、三値分類、dirtyをe4へread-onlyで渡す。e4結果を得た後、Formal Review Iteration 3を例外的に一回だけ実施し、新Criticalのみescalateする。READYなら次Stepへ進み、Minorは非ブロッキングとして記録する。
- [ ] **Step 18: §13・engine report・Build and Test・Intent closure・PR handoffを行う。** learnings surface/persistをprotocolどおり実施し、Code Generation承認後にengine reportでBuild and Testへ進む。全workflowとfresh検証後にIntent Completedを確認してから、英語Conventional Commit、branch push、Draft PR作成まで行う。PRはmergeせず、URL/head/CI/review/mergeability/dirtyのmerge-ready証跡をleaderへ送り、人間merge承認経路へ委ねる。

## 実行結果と計画差分

- Step 8の最終focused suiteは114件PASS、失敗0、assertion 753件だった。team-up lifecycle単体も52件PASS、失敗0、assertion 520件である。実Herdr/current runへの入力は0件で、Enterはunit test adapterとintegration fake helperに限定した。
- Step 10の最終unfiltered coverageは389 files、失敗2、assertion 5,538件、失敗assertion 2件、全体17,730/24,685 linesだった。`tests/integration/t199-generated-prefix-contract.test.ts`は他Intentのelection recordに由来する既知失敗、`tests/integration/t163-reaper-steal-race.test.ts`はcoverage走行時だけ2 winnerとなった並行性flakyで、runner 0後の単独再実行は2件PASSだった。いずれも全PASSへ読み替えず、team-up lifecycle 52/52 GREENと分離して記録した。参考として、I3前の`t199`だけを除外した走行は388 files、失敗0、assertion 5,533件でPASSしている。
- `bun run check`、`bun run typecheck`、`bun run dist:check`、complexity gate、`git diff --check`、`bash -n scripts/team-up.sh`はPASSした。`bun run promote:self:check`だけはteam-up差分外の`.codex/.tmp-*` orphan 73件で失敗し、既存dirty差分として非接触にした。
- production差分は新helper 523行と`team-up.sh`追加187行で、計画目安の400行を310行超過した。Iteration 1のCritical/Major findingに対するcurrent runtime exact照合、unknown drift三態化、正準owner三態、dead-owner再検証、run lifecycle自己終了を加えた結果であり、人間の「reviewまで停止せず」の後続指示を優先して実装を継続した。この超過自体をFormal Review Iteration 2対象とし、隠さず`code-summary.md`へ引き継ぐ。

## Traceability matrix

| Requirement | Plan steps |
| --- | --- |
| FR-1 対象pane限定 | 2、3、5、6、7 |
| FR-2 完全fingerprint/fail-closed | 1、2、4、5、7 |
| FR-3 Enter 1回/identity/TTL/事後確認 | 2、4、5、7 |
| FR-4 latch/rearm | 2、4、5、7 |
| FR-5 fresh/resume/kill/rollback lifecycle | 3、6、7、8 |
| FR-6 診断・秘匿 | 2、4〜7 |
| NFR/Constraints/Out of scope | 1、5、6、8〜10 |
| AC-1〜10 | 1〜10 |

## 承認後に用いる検証commands

```sh
bun test tests/unit/t-team-up-codex-safety-wait.test.ts
bun test tests/integration/t-team-up-codex-resume.test.ts
bun test tests/integration/t-team-up-msg-backend.test.ts
bun test tests/integration/t-team-msg.test.ts
bun test tests/integration/t-run-codex-project-target.test.ts
bun run typecheck
bunx @biomejs/biome check scripts/team-up-codex-safety-wait.ts tests/unit/t-team-up-codex-safety-wait.test.ts tests/integration/t-team-up-codex-resume.test.ts
git diff --check
bun run check
bun run dist:check
bun run promote:self:check
bun run test:ci
```

実Herdr/Codexのread-only version/visible captureを除き、検証中のHerdr入力はfake binaryだけへ送る。negative dependency/scope scanは0件を成功としてexit codeを明示的に判定する。
