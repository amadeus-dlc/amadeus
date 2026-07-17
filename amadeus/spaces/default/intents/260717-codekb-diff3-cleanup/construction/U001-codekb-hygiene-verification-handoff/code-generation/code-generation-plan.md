# Code Generation Plan — U001 CodeKB hygiene verification handoff

## Planning Status

本書はCode GenerationのPART 1(Planning)だけを確定する。PART 2(Generation)は未実行であり、plan approval前にapplication code、test、configuration、dependency、対象CodeKB本文を変更しない。

- Current unit: `U001-codekb-hygiene-verification-handoff`
- Active test strategy: Comprehensive
- User stories: 0件。`unit-of-work-story-map.md`に従い、FR-1〜FR-5とNFR-1〜NFR-4へ直接traceする。
- Implementation posture: application implementationはno-op。既存Git / Bun / Amadeusの検証面を使い、対象2 Markdownがcleanであることとlifecycle evidenceを記録する。
- Approval boundary: leaderが2026-07-17T20:56:19Z、standing grant `de2842f3`に基づき`Approve Plan`を承認した。PART 2をStep 1から順番どおり実行する。

## Planning Baseline

Planning時点のread-only実測は、no-op判定の妥当性確認にだけ使う。Generationでは新しい`MeasurementRef`を固定し、同じ検査を全件再実行する。

| Field | Planning observation |
|---|---|
| Observed HEAD | `7ec1301a82a91564653aec1693ccc876c707d78c` |
| `reverse-engineering-timestamp.md` marker counts | `<<<<<<<`=0、`|||||||`=0、`=======`=0、`>>>>>>>`=0 |
| `reverse-engineering-timestamp.md` H2 counts | latest=1、history260715=1 |
| `code-structure.md` marker counts | `<<<<<<<`=0、`|||||||`=0、`=======`=0、`>>>>>>>`=0 |
| `code-structure.md` H2 counts | latest=1、history260715=1 |
| Fix ancestry | `git merge-base --is-ancestor 5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0 7ec1301a82a91564653aec1693ccc876c707d78c` → exit 1(non-ancestor) |
| Target worktree diff | 0件(`git diff --quiet -- <2 target files>` → exit 0) |

## No-op Application Implementation Decision

| Change surface | Generation decision | Rationale |
|---|---|---|
| Business logic / runtime module | N/A、0 files | Functional Designのlogical operationsは証拠処理契約であり、application classではない |
| API / endpoint | N/A、0 files | FR-3bとApplication Designがpublic API追加を禁止 |
| Repository / data access | N/A、0 files | 永続化は既存Git recordだけで、DB / cache / queueを追加しない |
| Schema / migration | N/A、0 files | 新規schema / databaseがない |
| Frontend / UI | N/A、0 files | user-facing interactionを変更しない |
| Deployment / IaC | N/A、0 files | deployable unit、AWS resource、containerを追加しない |
| Test files | N/A、0 files | 新規code / component / behaviorがなく、既存suiteとrequirement-driven検査で現状を検証する |
| Test configuration | N/A、0 files | 既存`bun:test` / TypeScript / Biome / CI設定を変更しない |
| Dependency / package configuration | N/A、0 files | 既存Git / Bun / text scanで十分で、追加dependencyを禁止 |
| Record documentation | plan + `code-summary.md`のみ | Code Generationの検証結果とno-op決定をversion controlへ残す |

Comprehensive test strategyは通常、unit / integration / E2E / performance / security test filesを要求する。本unitは実行コードとdeployable componentが0件であり、テスト対象となる新規behaviorも0件であるため、新規test fileの作成は要件違反となる。代わりにStep 3〜Step 7でFR / NFRを全件検証し、既存のComprehensiveなrepository checkをCode Generation内で実行する。Build and Testへ検証作成を先送りしない。

## Sequential Generation Plan

### Step 1: Measurement scopeを固定する

- [x] 実行開始時の明示refを`git rev-parse <ref>^{commit}`で40桁SHAへ解決し、`MeasurementRef(ref, sha)`として記録する。
- [x] SHA上に次の2 pathが存在することを`git cat-file -e "${measurement_sha}:${target_file}"`相当で確認する。
  - `amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md`
  - `amadeus/spaces/default/codekb/amadeus/code-structure.md`
- [x] 以後のcontent、heading、ancestry検査が同じ`measurement_sha`を使うことを確認する。ref解決不能またはpath欠落ならfail-fastし、暗黙にcurrent HEADへ切り替えない。

Traceability: FR-1、FR-2、NFR-1、NFR-2、NFR-PERF-1、NFR-REL-4、LC-1。

### Step 2: Application implementationのno-op境界を再確認する

- [x] Application / framework source、API、repository、schema、migration、UI、IaC、dependency、configurationの変更対象が0件であることを上流成果物と`git diff --name-only`で確認する。
- [x] 対象2 Markdownはplanning baselineでcleanなため、marker削除やfix commitを盲目的に再適用しない。
- [x] 本stageのproduct変更をplan / summary以外へ拡張しない。Target Markdownに差分が生じていた場合はgenerationを停止し、conductorへ返す。

Traceability: FR-2、FR-3b、NFR-3、NFR-4、ADR-001、U001 Out of scope。

### Step 3: Requirement-driven content verificationを実行する

- [x] `git show "${measurement_sha}:${target_file}"`のblobを行単位で全数走査し、行頭が`<<<<<<<`、`|||||||`、`=======`、`>>>>>>>`の各語彙である件数をpath別に記録する。8 / 8 fieldsが存在し、全値0であることを要求する。
- [x] 同じSHAの各blobでH2だけを走査し、`reverse-engineering-timestamp.md`の`## 実行メタデータ(最新: ...)`、`code-structure.md`のタイトルに`最新:`を含むH2、両fileの`260715-opencode-cursor-harness`履歴H2をそれぞれ計数する。4 / 4 fieldsが存在し、各値1であることを要求する。
- [x] 同じSHA、同じcommand / patternで全12 count tupleを再計測し、12 / 12 equalであることを確認する。
- [x] Marker非0ならSHA / path / 語彙 / count / file:line、H2不一致ならSHA / path / category / actual countを保持して`stop`とし、cleanを報告しない。

Traceability: FR-1、NFR-1、NFR-PERF-1〜3、NFR-REL-1 / 2、NFR-SCALE-1 / 2、BR-1〜BR-4、LC-2。

### Step 4: Content、lineage、lifecycleを分離して検証する

- [x] `git merge-base --is-ancestor 5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0 "${measurement_sha}"`のexit codeをancestor / non-ancestorへ写像し、content countと別fieldに記録する。
- [x] `non-ancestor`でもStep 3がgreenならfixを再適用せず、`ancestor`でもStep 3を省略しない。
- [x] CI、起票者以外2名の独立green review、declared sensor、§13、gate authority / verdict、artifact push SHAは別々のadmissibility fieldであることを`code-summary.md`へ引き渡す。missing / non-greenを他fieldで代替しない。

Traceability: FR-2、FR-3a、FR-4c、NFR-2、NFR-REL-3、NFR-4、BR-5〜BR-9、LC-3〜LC-5。

### Step 5: Test filesのN/A判定を確定する

- [x] Unit test files: N/A(0 files)。新規function / class / moduleがないことを根拠として記録する。
- [x] Integration test files: N/A(0 files)。新規API / DB / queue / external boundaryがないことを根拠として記録する。
- [x] E2E test files: N/A(0 files)。新規UI / end-user flow / deploymentがないことを根拠として記録する。
- [x] Performance / security test files: N/A(0 files)。runtime workload / security surfaceを追加しておらず、NFRはStep 3、Step 4、Step 7のdeterministic verificationで直接検証する。

Traceability: FR-3b、NFR-3、NFR-4、NFR Requirements / Design、Tech Stack Decisions。

### Step 6: Test configurationとdependencyのN/A判定を確定する

- [x] `package.json`、lockfile、`tsconfig*.json`、Biome設定、test runner設定、`.github/workflows/ci.yml`の変更が0件であることを確認する。
- [x] 新規dependency、script、environment variable、credential、CI policy、AWS / deployment configurationを追加しない。
- [x] Code Generationの`linter` / `type-check` declared sensorはTS / JS path filter上、新規application outputがないためN/Aであることを記録する。ただしStep 7の既存repository lint / typecheckは省略しない。

Traceability: FR-3b、NFR-3、NFR-4、Security Requirements、Tech Stack Decisions。

### Step 7: 既存test / CIとrequirement-driven checksをCode Generation内で完了する

#### Execution stop — dependency substrate missing

- Command: `bun run typecheck`
- Exit: `127`
- Output: `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json` の起動時に `tsc: command not found`。Bunは`error: script "typecheck" exited with code 127`を返した。
- Action: fail-fast。Step 7以降のcheckboxは未完了のままとし、lint / complexity / dist / self-install / test / coverage / summaryを実行していない。Dependency追加やconfig変更で自己補完せずconductorへ返す。
- Recovery: leader承認のsubstrate recoveryとしてconductorが`bun install --frozen-lockfile` exit 0を確認した。前後HEADは`7ec1301a82a91564653aec1693ccc876c707d78c`、`package.json` SHA-256は`0545fbd616475fc686ea1481ca0c65fd52af7bd84818ad2dd04f5d8339e4ac05`、`bun.lock` SHA-256は`087adc8c68ad57201175313bc6054a1b866d42c4a929f78ef8bce72de9527957`で不変、tracked statusも同一、`node_modules/.bin/tsc` executableを確認済み。Step 1〜6を再利用し、typecheckから再開する。

- [x] `bun run typecheck`を実行し、両tsconfigのtype checkを確認する。
- [x] `bun run lint`を実行し、既存Biome checkを確認する。
- [x] `bun tests/complexity-gate.ts --check`を実行し、既存complexity baselineを確認する。
- [x] `bun run dist:check`と`bun run promote:self:check`を実行し、distribution / self-install driftがないことを確認する。
- [x] `bun run test:ci`を実行し、既存smoke / unit / integration suiteを確認する。
- [x] `bun run coverage:ci`と`bun tests/coverage-project-gate.ts --check`を実行し、Comprehensive strategyの既存coverage面を確認する。
- [x] Step 3の12-field count / repeatability、Step 4のancestry分離を再確認し、repository checksのgreenをU001固有検証の代理にしない。
- [x] `git diff --check`を実行し、whitespace error 0件を確認する。

Traceability: FR-1〜FR-3、NFR-1〜NFR-4、NFR-PERF-1〜3、NFR-REL-1〜7、NFR-SCALE-1〜3、Security Validation。

### Step 8: Code Summaryを生成する

- [x] `code-summary.md`を作成し、application / test / configuration / dependency files created=0、modified=0を明記する。
- [x] `MeasurementRef`、path別marker 8件、heading 4件、repeatability、fix ancestry、既存test / CI commandsとverdictをexact valueで記録する。
- [x] Planからのdeviation、failed / skipped check、N/A判定の根拠を隠さず記録する。失敗があればgreen summaryを作らずconductorへ返す。
- [x] `code-generation-plan.md`の各checkboxは、対応する実作業の完了直後にだけ`[x]`へ更新する。

Traceability: FR-3a / 3c、FR-4c、NFR-1 / 2、U001 Responsibilities and Deliverables。

### Step 9: External-operation boundaryを確認してhandoffする

- [x] GitHub上の[PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183)を含むPull Requestの作成・更新・merge、main merge、force push、branch protection変更を0件のまま維持する。
- [x] [Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129)をcloseせず、engine doneとmain landing / close eligibilityを同一視しない。
- [x] Human landing後のlanded main再計測は本stageで先取りしない。`landing-pending`と、landed SHAに対する新しい`MeasurementAttempt`が必要であることを`code-summary.md`へ明記する。
- [x] Conductorへplan / summary、検証verdict、未実施外部操作を返し、reviewer、sensor、§13、gate、exact commit / pushを正規loopへ委ねる。

Traceability: FR-4、FR-5、NFR-2、NFR-4、LC-6 / LC-7、U001 external handoff boundary。

## Completion Conditions

Generationは次をすべて満たした場合だけ成功とする。

- Sequential Steps 1〜9のcheckboxが、N/A判定を含めて証拠付きで完了している。
- Application / framework source、test file、test configuration、dependency、対象2 Markdownの差分が0件である。
- Marker 8 / 8 fieldsがすべて0、heading 4 / 4 fieldsがすべて1、repeatabilityが12 / 12 equalである。
- Fix ancestryがcontent cleanとは別verdictで記録されている。
- 既存repository test / CI parity checksと`git diff --check`がgreenである。失敗または未実施をBuild and Testへ隠して先送りしていない。
- `code-summary.md`がexact measurement、verification verdict、files changed、N/A、deviation、external pendingを保持している。
- Pull Request操作、main merge、Issue close、force pushが0件である。

未決事項は0件。上流要件と設計はno-op implementationと検証手順を一意に決めている。
