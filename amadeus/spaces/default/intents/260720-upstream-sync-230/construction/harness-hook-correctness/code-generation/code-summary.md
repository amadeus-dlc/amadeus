# Code Summary: harness-hook-correctness

## 結果

FR-4.13〜15を、承認済みの3 canonical seamだけで実装した。

- `spawnHookWithRuntime(...)`: 実child-spawnを持つCodex、Cursor、Kiro CLI、Kiro IDEの4 harnessで、文字列`bun`ではなく`process.execPath`を使う。引数、stdin、stdout、stderr、cwd、exit codeの契約は維持した。
- `parseKiroIdeHookContext(...)`: Kiro IDEの`USER_PROMPT`を1回だけ読み、実測済み4 fieldだけを正規化する。成功した既知write結果のみをaudit→sensorへ転送する。
- `renderClaudeHookCommand(...)`: Claudeの11 hook commandだけを、空白入りproject pathでも安全なquoted commandへ統一した。`statusLine`とpermission globは不変である。

新API、schema、parser DSL、policy、threshold、allowlist、coreへのhost payloadは追加していない。Claude/OpenCodeにはdormant runtime wrapperを追加していない。

## 実行契約

| 判断点 | record | 反映内容 |
|---|---|---|
| Plan | `E-USSU07CGP1` | 13-step planを承認 |
| Kiro IDE migration境界 | `E-USSU07CGM1` | payload-free audit-tailを採用し、legacy session shim/global latchを追加しない |
| full CI既知赤 | `E-USSU07CGF1` | `t199-generated-prefix-contract`の12 pathはU07無関係baselineとして受理し、改竄・allowlist・self-exclusionを禁止 |
| coverage registry | `E-USSU07CGF2` | `t231` integrationを`EXPECTED_NONE_TO_CLI`の正規集合へ追加 |
| test size | `E-USSU07CGF3` | 4つの実spawn caseをintegrationへ移し、unitをpure parser/rendererに維持。threshold/allowlistは不変 |
| U07 patch coverage | `E-USSU07CGF4R` | 6/6全会一致のchoice1に従い、契約外の単一用途import-time validationを削除。post-M21正本LCOVでU07限定diffは71/71、allowlisted 0、uncovered 0 |
| Formal review Iteration 1 | `E-USSU07CGR1` | NOT-READY（Critical/Major/Minor `0/1/1`、GoA FAIL）をchoice1 6/6・GoA1 6/6で受理。同一U07内で両転送経路の`toolSuccess === true`必須化と未使用`dir`除去をtest-firstで実施 |
| Formal review Iteration 2 | `E-USSU07CGR2` | READY（Critical/Major/Minor `0/0/0`、GoA PASS、新規finding 0）をchoice1 6/6・GoA1 6/6で受理 |
| §13 | `E-USSU07CGS13` | 正規surfaceのmemory entries / candidates / parked questionsが`0 / 0 / 0`であることをchoice1 6/6・GoA1 6/6で確認し、persist 0件で閉包 |

## 実装

### Runtime spawn seam

- Codex: `packages/framework/harness/codex/hooks/amadeus-codex-hook-runtime.ts`
- Cursor: `packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts`
- Kiro CLI: `packages/framework/harness/kiro/hooks/amadeus-kiro-hook-runtime.ts`
- Kiro IDE: `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-hook-runtime.ts`
- 各adapterの既存spawn siteを上記seamへ接続し、各manifestへ必要なwrapper projectionだけを追加した。
- ClaudeとOpenCodeは該当spawn siteがないため非対象とした。

### Kiro IDE deterministic context

- `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-vocab.ts`
  - `toolName`、`toolArgs`、`toolResult`、`toolSuccess`だけを返すpure parserを追加した。
- `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts`
  - stdin待機とtimeout raceを削除し、`USER_PROMPT`を唯一のtool context入力とした。
  - `fs_write`、`fs_append`、`fs_replace`の成功した既知resultだけを転送する。
  - 相対pathはproject root基準で絶対化し、既存の絶対path表記は保持する。realpathはcontainment判定だけに使う。
  - project外path、失敗、unknown wording、path不明はvisible hook-dropとする。
  - auditを先、sensorを後に実行する。
  - state syncはpayload-free audit tailからlatest unfinished stageだけを採用し、parked/completed/skipped stageを再開しない。
  - subagent identityは成功したsubagent toolのresult先頭8行にある`Reviewer`または`Agent`だけから取得する。
  - debugは`AMADEUS_KIRO_IDE_HOOK_DEBUG=1`または`amadeus/.amadeus-hook-debug`でのみ有効にし、marker/stat/log失敗はfail-open、stdoutは無汚染とした。
- `packages/framework/harness/kiro-ide/hooks/amadeus-sync-statusline.kiro.hook`
  - 実測登録に合わせて`shell` matcherとし、audit-tail state syncを起動する。
- `packages/framework/core/hooks/amadeus-runtime-compile.ts`
  - IDE audit markerだけを既存command filterから分離し、runtime graph mtimeが最新active audit shard以上なら再compileしない。その他harnessの意味論は不変である。

### Claude command renderer

- `packages/framework/harness/claude/manifest.ts`
  - 唯一のnamed public functionとして`renderClaudeHookCommand(...)`を公開した。`HookSpec`は内部型のままである。
  - authored settingsの11 commandをproduction rendererと一致させる。
- `packages/framework/harness/claude/settings.json.example`
  - 11 hook commandだけを`bun "$CLAUDE_PROJECT_DIR/.claude/hooks/..."`へ変更した。
  - `statusLine.command`とpermission globは変更していない。

### テストとfixtureの閉包

- `tests/unit/t231-harness-hook-correctness-seams.test.ts`
  - pure parserとpure rendererだけを直接検証するSmall unitとした。
- `tests/integration/t231-harness-hook-correctness.test.ts`
  - 4 harnessの実runtime spawn、Kiro IDE shipped adapter subprocess、Claude空白path shell起動を検証する。
- `tests/integration/t222-migration-routing.test.ts`
  - 単体copy fixtureへKiro runtime wrapperを同梱した。production manifest/distは既に同梱済みであり、production意味論は変更していない。
- `tests/unit/gen-coverage-registry.test.ts`
  - deterministic spawnerである`t231` integrationをexact setへ追加した。
- `tests/unit/t209-kiro-ide-dual-vocab.test.ts`
  - payload-free audit-tail契約に更新した。legacy `session_id`/非live stdinはlatchをarmせず、state/auditを変更しない。
- `tests/unit/t210-adapter-mint-classifier.test.ts`
  - Kiro IDEのhuman turnはraw `USER_PROMPT` channelで分類し、JSON tool contextはopaqueとした。

## 独立review findingの是正

| ID | disposition |
|---|---|
| M1 | `toolSuccess=false`のsubagentは`SubagentStop`を転送しない |
| M2 | parked runtimeはaudit-tail state syncを転送しない |
| M3 | project外write pathはvisible drop |
| M4 | 時間thresholdを追加せず、stdinを開いたまま終了する構造的テストでrace削除を実証 |
| M5 | human-turn mintはshared classifierを再利用し、`t210` 31/31で回帰確認 |
| M6 | `E-USSU07CGM1`どおりpayload-free契約を採用し、session shim/global latchを不採用 |
| M7 | containment確認後もabsolute symlink pathの元表記を保持 |
| M8 | subagent identity抽出前にtool名を検証 |
| M9 | Kiro IDE登録を`shell` matcherへ修正 |
| M10 | canonical IDE audit markerとmtime idempotencyを追加 |
| M11 | debug env/marker/log/fail-openをexact実装し、他adapterへ流入させない |
| M12 | orphan `StateSyncInput`/mapping/self-testを削除 |
| M13 | `HookSpec`を非公開に維持 |
| M14 | Claude 11 core hook実在、basename、空白path実起動を検証 |
| M15 | `t222`単体fixtureのmissing runtime wrapperをRED再現し、正規依存同梱で43/43 GREEN |
| M16 | `E-USSU07CGF1`によりU07無関係baseline既知赤として受理。対象12 pathへ非接触 |
| M17 | `E-USSU07CGF2`どおりcoverage registry exact setへ追加 |
| M18 | `E-USSU07CGF3`どおり4 spawn caseをintegrationへ移動。test削除・文字列弱化・scan除外なし |
| M19 | full CIとcoverageの並走時だけ`t05`の固定名fixtureが競合。単独coverageでは28/28 PASSのためfinding不成立。コード・test・threshold・allowlistは変更なし |
| M21 | `E-USSU07CGF4R`のrecorded choice1に従い、正準3 seam外だったClaude manifestの単一用途import-time validationを削除。renderer、11 command、空白path実shell、source実在、statusLine/permission不変を維持し、post-M21限定patch 71/71を確認 |
| R1-Major | `audit-and-sensors`と`log-subagent`の両方を`kiro.toolSuccess !== true`でfail-closed化。missing/null/string/number/falseのtable-driven integration negative fixtureで各経路の転送0を固定 |
| R1-Minor | `tests/unit/t209-kiro-ide-dual-vocab.test.ts`の未使用`dir`引数だけを削除し、2 call siteを更新。fixtureの意味論は不変 |

## #10a既知例外

upstream `300b640`で観測されたKiro IDEは、tool contextをlive `USER_PROMPT`で渡し、stdinはopenかつ未書込み、state syncはpayload-free audit tailで行う。したがって、旧fixtureの`session_id`または非live stdinからmigration decisionをarmする互換shimは追加していない。この判断はFR-0、NFR-3、`E-USSU07CGM1`に従う。

## Generated projection

`bun scripts/package.ts`でClaude、Codex、Cursor、Kiro CLI、Kiro IDE、OpenCodeの6配布物を再生成し、`bun scripts/promote-self.ts --apply`でproject-local self installを同期した。`dist/`とself projectionは手編集していない。

## 検証証跡

| command / evidence | result |
|---|---|
| `bun test tests/unit/t231-harness-hook-correctness-seams.test.ts tests/integration/t231-harness-hook-correctness.test.ts` | 30 pass / 0 fail / 165 expect |
| `bun test tests/integration/t222-migration-routing.test.ts` | 43 pass / 0 fail / 347 expect |
| `bun test tests/unit/t209-kiro-ide-dual-vocab.test.ts` | 8 pass / 0 fail |
| `bun test tests/unit/t210-adapter-mint-classifier.test.ts` | 31 pass / 0 fail |
| targeted 14-file regression | 214 pass / 0 fail / 661 expect |
| M17/M18 isolated 4-file regression | 88 pass / 0 fail / 1244 expect |
| post-M21 targeted 7-file regression | 170 pass / 0 fail / 1697 expect |
| Iteration 1 Major RED（`audit-and-sensors`） | 27 pass / 4 fail / 166 expect。missing/null/string/numberが転送され、falseだけが既存GREEN |
| Iteration 1 Major RED（`log-subagent`） | 32 pass / 4 fail / 176 expect。missing/null/string/numberが転送され、falseだけが既存GREEN |
| Iteration 1 `t231` integration GREEN | 36 pass / 0 fail / 176 expect |
| Iteration 1 targeted 7-file regression | 180 pass / 0 fail / 1717 expect |
| `bun run typecheck` | PASS |
| `bun run lint:check` | exit 0。既存complexity warning 209、info 16、fixなし |
| `bun run dist:check` | 6/6 PASS |
| `bun run promote:self:check` | PASS |
| code-generation sensors | 変更したauthored/test TS 19 pathすべてで`linter` 19/19・`type-check` 19/19 PASS。post-M21 manifestの最終fireは`cc32a7c1` / `1936bbec`。関連Q&Aの`answer-evidence`は`e0be1045` PASS |
| full CI（M15修正後、M17/M18 RED保存） | 393 files / 5551 assertions / 3 fail。M16/M17/M18のみ |
| final full CI | `tests/logs/2026-07-21T05-43-25Z/`: 393 files / 5551 assertions / 1 fail。唯一の失敗はrecorded M16。summary `e338eccdb6b4c52c7fd07c42d64b9292e94d4eae77aae8a6cf040d4c172a8925`、failures `d4ce2273620bb0f561887c8ad4ea24c14bcb66e3adbc9740732c6dab02315d47` |
| post-M21 final full CI | `tests/logs/2026-07-21T06-17-01Z/`: 393 files / 5551 assertions / 1 fail。唯一の失敗はrecorded M16。summary `48dded785d189b4f813d9f97fcaa717a25f4066f18a8e3cc842433cd10b69f29`、failures `cf5155ab9f082e4c16dc2c6a7330f14c53731bf21e8f148081654e10b0816dd9` |
| pre-M21 coverage（他runnerなしで単独実行） | `tests/logs/2026-07-21T05-50-25Z/`: 393 files / 5551 assertions / 1 fail。唯一の失敗はrecorded M16。summary `e52a9ad4097c4427a326f6bc5976ea8d81ce0d85e6a557661038a2ab13a08f54`、failures `43358f9c68e15332ac9e2db7411d210ba0799f56e255b8fb85dac50f1003e0da`。実行時LCOVは`b44620d7f9da92334d1a917e95a3426d8217ddfd6d7655f0fa82ba8dd36b0164`、17559 / 24438 lines hit |
| post-M21 coverage（他runnerなしで単独実行） | `tests/logs/2026-07-21T06-23-54Z/`: 393 files / 5551 assertions / 1 fail。唯一の失敗はrecorded M16。summary `730436d86daedcba82fa4e771dc7b0ae5324cd3bf3e42bbb029262443474fb2c`、failures `8173e2066b3de11406f3e9415dad92001aec6c070a535a58444031dbbe4539ba`。`coverage/lcov.info`は`32abb67e73245aabb077c22a011616d85957907f0aeac2671cb39a43c48400e2`、17548 / 24425 lines hit |
| post-M21 `bun tests/coverage-project-gate.ts --check` | PASS。current 71.8444%、baseline 40.9395%、delta +30.9049pp |
| post-M21 U07限定 `bun tests/coverage-patch-gate.ts --check` | PASS。added 71、covered 71、allowlisted 0、uncovered 0。patch stream SHA-256 `4e45e155e3006b30922374c30186943bc65601e70a8571f4fec1f61c1b046469` |
| Iteration 1 final full CI | `tests/logs/2026-07-21T06-52-20Z/`: 393 files / 5561 assertions / 1 fail。唯一の失敗はrecorded M16。summary `25cc78ca0bba9cc1e3c2ff57c93f12a42d8482f06b470619c1c866ef510ec5b3`、failures `8e7d40076e44209c7204fc5bda2d5c9ac3906d8c79af39f9b39cf8e81e84be76` |
| Iteration 1 standalone coverage | `tests/logs/2026-07-21T06-59-05Z/`: 393 files / 5561 assertions / 1 fail。唯一の失敗はrecorded M16。summary `8f7bd61f678b80fd85d8bb48114d3998b7aac81a4cb01e059525ba52e39c79d5`、failures `6d7f636a5d6aee028ae28b64b2e680d32ced21e04d383ccce49eb37358f43d20`。LCOV `32abb67e73245aabb077c22a011616d85957907f0aeac2671cb39a43c48400e2`、17548 / 24425 lines hit |
| Iteration 1 project coverage gate | PASS。current 71.8444%、baseline 40.9395%、delta +30.9049pp |
| Iteration 1 U07限定 patch coverage gate | PASS。1800 lines / 78637 bytes、stream SHA-256 `965a6e25c66c5bd3c13a2f5aebcdafc995ca3628a2ded4c63d882496c30cfe77`、measured 71、covered 71、allowlisted 0、uncovered 0 |
| Iteration 1 sensors | 変更3 pathの`linter`/`type-check`を各3/3 PASS。adapter `8c664cc7` / `14bd50ee`、`t231` integration `6df7df9a` / `8efa0826`、`t209` unit `d62e2345` / `d5288bb1` |

M17/M18のREDログは`tests/logs/2026-07-21T05-34-38Z/`に保存した。

- `gen-coverage-registry.test.ts.log`: `797b00f6ea8616bbea44dfea7f914beae95a19bdebce10ccdfc0e3b4e4ae78e1`
- `t-test-size-drift.test.ts.log`: `e179015b9f612e6c0145cf3e4b2cbe5b35199d55b836221776950f889f018493`
- `t199-generated-prefix-contract.test.ts.log`: `ab06344ad0e4b63335be9bdde1b9d94a6b9b123ba5e59307a37e482db6274d96`
- `summary.txt`: `3f3d57c5d6c5ed2b7e9e4d30875f6795dce33067867dab115c077c242d5ca36e`
- `failures.txt`: `5697d02c4b0e1097d100f1b135870cac0753e829a5d35de26f0f8a3167748d0f`

## M19並走競合の非成立証跡

final full CIとcoverageを同時実行したrunでは、coverage側の`t05-run-tests-parallel`だけが固定名のplanted fixture競合によりDONE markerを観測できず赤になった。並走を解消し、run-tests/coverage PID、`tZ1-4`/`tY1-4` planted files、recent `_results` metadata、temp/lockがないbaselineを確認してからcoverageを単独再実行した。

- 並走時`t05` log: `tests/logs/2026-07-21T05-43-31Z/t05-run-tests-parallel.test.ts.log`、`cf49fc4963ec4c9cd1bbee72109538d59a5039f5433a6c2a47a128f6ea8a3cae`
- final full CIの`t05`: 28 pass / 0 fail
- 単独coverageの`t05`: 28 pass / 0 fail / 65 expect
- 単独`t05` log: `tests/logs/2026-07-21T05-50-25Z/t05-run-tests-parallel.test.ts.log`、`14311821addbd2a0e6ab6b6f70a65780937fb62979e01d23e03135de0aa9296a`

単独では再現せずU07 production差分を通るassertでもないため、M19はconcurrent-run artifactとしてfinding不成立である。再発防止としてfinal full CIとcoverageは直列実行した。

## M21 patch coverage証跡

U07のauthored source/testだけを対象に、tracked 16 pathの`git diff --unified=0`と、新規runtime wrapper 3 pathおよび`t231` unit/integration 2 pathの`git diff --no-index --unified=0 /dev/null <path>`を同一streamへ結合した。workflow成果物、generated projection、他Unit差分は入力へ含めていない。

- recorded裁定: `E-USSU07CGF4R`、choice1 6/6、GoA favor 6 / against 0、留保なし
- patch stream: 76326 bytes、SHA-256 `4e45e155e3006b30922374c30186943bc65601e70a8571f4fec1f61c1b046469`
- post-M21 LCOV: `coverage/lcov.info`、SHA-256 `32abb67e73245aabb077c22a011616d85957907f0aeac2671cb39a43c48400e2`
- gate: measured 71、covered 71、allowlisted 0、uncovered 0
- disposition: 正準rendererと11 authored commandの一致はM13/M14の既存testsで固定し、契約外の単一用途`readFileSync`、`AuthoredSettings`、import-time validation loop/throwだけを削除した。新public/test seam、threshold、allowlist、scan除外は追加していない。

pre-M21 LCOVでは削除後の空行に旧実行行のDA番号が重なり一時的に72/72と表示されたが、post-M21で再生成した正本LCOVではその非実行行がDA対象外となり71/71である。full CIと単独coverageは直列で完走し、いずれも唯一の失敗はrecorded M16である。

## Formal review Iteration 1 finding disposition

recorded裁定は`E-USSU07CGR1`（choice1 6/6、GoA1 6/6、reservationなし）である。正本recordは`/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/runs/20260719-231310-08a0/leader/amadeus/spaces/default/elections/E-USSU07CGR1/record.md`。

- Major: `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts`の`audit-and-sensors`と`log-subagent`は、いずれも`toolSuccess`が厳密なboolean `true`のときだけ転送する。missing、`null`、string、number、`false`は全件0転送である。新API、parser shape、policy、threshold、allowlistは追加していない。
- Minor: `subagentPayload(toolName)`へ狭め、未使用`dir`と2 call siteの余分な実引数だけを除去した。
- RED→GREEN: 両経路でmissing/null/string/numberの4件がRED、既存falseはGREENであることを先に確認した後、本体ガードを1行ずつ変更した。最終`t231` integrationは36/36、targeted 7-file regressionは180/180である。
- Projection: `bun scripts/package.ts`でKiro IDEを含む6配布物を再生成し、`bun scripts/promote-self.ts --apply`後に`dist:check` 6/6と`promote:self:check`を通した。
- 全体検証: full CIとstandalone coverageは直列実行し、各393 files / 5561 assertions / 1 fail。唯一の失敗は既に`E-USSU07CGF1`で受理済みのM16であり、その12 path、allowlist、self-exclusionには非接触である。
- Coverage: 正本LCOVはpost-M21と同一hashで、U07限定patchは71/71、projectは71.8444%。Iteration 1でcoverage退行はない。

このdispositionはformal Iteration 2の独立review入力であり、plan Step 13はIteration 2 READY受理と§13のrecorded閉包後に完了した。

## M16 baseline provenance

検証時HEADは`b99ef748cd876a096ef1f1133cb26ecb1fd4ee53`。`t199-generated-prefix-contract`が報告した次の12 pathは、本Unit開始前から存在するupstream名称を含む成果物であり、本Unitでは変更、allowlist、self-exclusionを行っていない。

1. `amadeus/spaces/default/codekb/amadeus/business-overview.md`
2. `amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md`
3. `amadeus/spaces/default/intents/260720-upstream-sync-230/ideation/approval-handoff/initiative-brief.md`
4. `amadeus/spaces/default/intents/260720-upstream-sync-230/ideation/feasibility/feasibility-assessment.md`
5. `amadeus/spaces/default/intents/260720-upstream-sync-230/ideation/intent-capture/intent-statement.md`
6. `amadeus/spaces/default/intents/260720-upstream-sync-230/ideation/intent-capture/stakeholder-map.md`
7. `amadeus/spaces/default/intents/260720-upstream-sync-230/inception/requirements-analysis/requirements.md`
8. `docs/research/upstream-sync/ledger.json`
9. `docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md`
10. `leader/amadeus/spaces/default/elections/E-USSU01FD3/ballots/e1.json`
11. `leader/amadeus/spaces/default/elections/E-USSU01FD3/ledger.json`
12. `leader/amadeus/spaces/default/elections/E-USSU01FD3/tally.json`

## 状態

- commit: なし（禁止契約どおり）
- push / PR / merge: なし
- dirty: U07 authored source、tests、generated projection、workflow成果物を保持。共有worktreeの他Unit差分には非接触。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-21T06:37:30Z`
- Verdict: `NOT-READY`
- Critical / Major / Minor: `0 / 1 / 1`
- GoA: `FAIL`（Major finding解消まで承認不可）

### Scope decision

stage definition、指定Q&A、primary artifact、およびprimaryが列挙したU07 authored source/test/generated projectionとそのworking-tree diffだけを対象とした。`code-generation-plan.md`、`memory.md`、他Unit差分、M16の12 baseline path本体は読んでいない。追加scope、statusLine、permission glob、Claude/OpenCode dormant wrapperは検査対象・実装対象へ加えていない。

### Findings

- Critical: なし。
- Major: Kiro IDE adapterの成功判定がfail-closedではない。`packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts`のartifact転送とsubagent転送は`kiro.toolSuccess === false`だけを拒否するため、`toolSuccess`が欠落またはwrong-typeでparserから除去されても、既知の`toolName`と`toolResult`があればPostToolUseまたはSubagentStopを転送する。これは「成功した既知write結果のみ」「成功したsubagent toolのみ」というcode summary・設計契約に反する。両経路で`toolSuccess === true`を必須化し、欠落・wrong-typeが転送0となるintegration fixtureを追加する必要がある。現行targeted 170 testは`false`を検査するが、欠落成功判定を検査していない。
- Minor: U07で更新した`tests/unit/t209-kiro-ide-dual-vocab.test.ts`の`subagentPayload(dir, toolName)`は`dir`を使用しない。直接Biome検査でも`noUnusedFunctionParameters` warningとなるため、不要引数を除去する。

### 契約評価

- 3 canonical seam: scope内。Codex/Cursor/Kiro CLI/Kiro IDEのruntime spawnは`process.execPath`を使用し、Claude rendererはnamed public function 1件、Kiro IDE parserは実測4 fieldに限定されている。
- Kiro IDE deterministic context: stdin timeout race除去、`USER_PROMPT`、audit-first、payload-free audit-tail、identity先頭8行、path containment、opt-in debug、mtime receiptを確認した。ただしMajor findingのsuccess判定だけ未閉包である。
- Claude 11 command: authored 11件だけがquoted rendererと一致し、statusLineとpermission globは不変。空白path実shell検証もPASSした。
- Projection: `dist:check`は6/6 PASS、`promote:self:check`は4面PASS。generated/self projectionに手編集由来driftはない。
- M16 recorded exception: post-M21 full CIの唯一の失敗は記録済み`t199-generated-prefix-contract`で、U07 patch streamは列挙12 pathへ非接触。exception境界の拡張、allowlist、self-exclusionはない。

### 検証証跡

- targeted 7-file regression: `170 pass / 0 fail / 1697 expect`。
- typecheck: `bun run typecheck` exit 0。
- configured lint: `bun run lint:check` exit 0（既存warning 209 / info 16）。code-generation audit sensorはauthored/test TS 19 pathでlinter 19/19、type-check 19/19 PASS、answer-evidence `e0be1045` PASS。
- direct 19-path Biome: exit 1。既存Codex switch診断等に加え、U07更新testの未使用`dir` warningを確認した。上記Minorとして扱う。
- post-M21 full CI/coverage artifacts: summary、failures、LCOVのSHA-256はprimary記載値と全件一致。両runの唯一の失敗はM16。
- project coverage gate: PASS（71.8444%、baseline 40.9395%、+30.9049pp）。
- U07 patch stream: 76,326 bytes、SHA-256 `4e45e155e3006b30922374c30186943bc65601e70a8571f4fec1f61c1b046469`を独立再構築して一致。
- U07 patch coverage gate: PASS（measured 71、covered 71、allowlisted 0、uncovered 0）。

Major findingがruntime false-positive audit/subagent eventを許すため、既存green evidenceとM16 exceptionを踏まえてもIteration 1は承認できない。

## Review — Iteration 2

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-21T07:12:50Z`
- Verdict: `READY`
- Critical / Major / Minor: `0 / 0 / 0`
- GoA: `PASS`

### Findings

- 新規findingなし。
- Iteration 1 Major: CLOSED。`audit-and-sensors`と`log-subagent`はいずれも`kiro.toolSuccess !== true`でfail-closedとなり、strict boolean `true`だけを転送する。各経路でmissing、`null`、string、number、`false`の5種、計10 negative caseが転送0を固定し、既存のtrue成功経路も維持している。
- Iteration 1 Minor: CLOSED。`subagentPayload(toolName)`から未使用`dir`が除去され、2 call siteだけが追随している。

### 契約評価

- `E-USSU07CGR1`のchoice1 6/6・GoA1 6/6の裁定どおり、Iteration 1 findingsは同一U07 scope内で閉包された。
- canonical seamは`spawnHookWithRuntime(args, input)`、`parseKiroIdeHookContext(payload)`、`renderClaudeHookCommand("$CLAUDE_PROJECT_DIR", hook)`の3件に限定されている。新scope、新public/test seam、policy、threshold、allowlist、M16例外境界の変更はない。
- Claudeのauthored hook commandは11件だけで、statusLineとpermission globは不変。package/dist/self projectionにdriftはない。
- plan Step 13はpendingのまま、§13とengine stateは非変更である。

### 検証証跡

- targeted 7-file regressionを独立再実行: `180 pass / 0 fail / 1717 expect`。
- `bun run typecheck`、`bun run lint:check`、`bun run dist:check`（6/6）、`bun run promote:self:check`（4面）はすべてexit 0。lintは既存warningのみでfixなし。
- final full CI `tests/logs/2026-07-21T06-52-20Z/`とstandalone coverage `tests/logs/2026-07-21T06-59-05Z/`は各393 files / 5561 assertions / 1 fail。summary/failuresのSHA-256はprimary記載値と一致し、唯一の失敗はrecorded M16である。
- `coverage/lcov.info`のSHA-256は`32abb67e73245aabb077c22a011616d85957907f0aeac2671cb39a43c48400e2`。project coverage gateはPASS（71.8444%、baseline 40.9395%、+30.9049pp）。
- U07 zero-context patch streamを独立再構築し、1800 lines / 78637 bytes、SHA-256 `965a6e25c66c5bd3c13a2f5aebcdafc995ca3628a2ded4c63d882496c30cfe77`で一致。patch coverage gateは71/71、allowlisted 0、uncovered 0。
- Iteration 1変更3 pathのsensor記録はlinter/type-check各3/3、計6/6 PASS（`8c664cc7`、`14bd50ee`、`6df7df9a`、`8efa0826`、`d62e2345`、`d5288bb1`）。e4のread-only独立再確認も追加finding 0で一致した。

Iteration 1 findingsは閉包され、U07の承認済みscopeと既知M16境界を維持しているため、Iteration 2をREADYとして承認する。

## §13閉包

- review acceptance: `E-USSU07CGR2`、choice1 6/6、GoA1 6/6、reservationなし。
- 正規surface: `memory_entries_total=0`、`candidates=[]`、`parked_open_questions=[]`。
- §13裁定: `E-USSU07CGS13`、choice1 6/6、GoA1 6/6、persist 0件。
- 新規learning本文を作成せず、既存norm、threshold、allowlist、M16例外境界を変更していない。
- plan Step 13を完了し、engine report/nextへ渡すU07成果物と証跡を閉包した。
