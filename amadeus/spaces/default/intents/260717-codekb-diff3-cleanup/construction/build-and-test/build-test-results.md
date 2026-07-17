# Build and Test Results — CodeKB hygiene verification handoff

## Measurement scope

`code-generation-plan.md`の検査契約と`code-summary.md`の直前baselineを入力にした。Fresh `MeasurementRef`は`fe939451529ef40b8811bf55f3829ea92ceb7d9a`であり、同じSHAからcontent / heading / ancestryを測定した。

## Build results

| Command | Exit / verdict | Fresh evidence |
|---|---|---|
| `bun run typecheck` | 0 / PASS | `tsconfig.json`と`tsconfig.tests.json`を検証 |
| `bun run lint` | 0 / PASS | 572 files、206 warnings、16 infos、blocking error 0 |
| `bun tests/complexity-gate.ts --check` | 0 / PASS | new violations 0、regressions 0、baseline 43、worst CCN 65、threshold 15 |
| `bun run dist:check` | 0 / PASS | 全harness tree drift 0 |
| `bun run promote:self:check` | 0 / PASS | project-local self-install drift 0 |

Lint時にBunはdependency resolutionと`Saved lockfile`を表示したが、実行直後の`git diff -- bun.lock package.json`は0件であり、dependency / package configurationのtracked changeはない。

## Test and coverage results

| Command | Test files | Assertions | Failed files / assertions | Verdict |
|---|---:|---:|---:|---|
| `bun run test:ci` | 374 | 5275 | 0 / 0 | PASS |
| `bun run coverage:ci` | 374 | 5275 | 0 / 0 | PASS、`coverage/lcov.info`生成 |

- Unit / integration passed files: 374 / 374、wall-clock drift 0。
- Runner-declared skipped files: 23。Claude substrate unavailableのderived live mechanismであり、AWS credential warningとともにpass数へ偽装していない。
- Observed inventory: executed 374 + explicit skip 23 = 397 files、failed 0。
- Coverage gate: current 68.4853%、baseline 40.9395%、delta +27.5458pp、PASS。

## Performance and security results

Performance / content verification:

- Target blob existence: 2 / 2。
- Marker fields: 8 / 8 present、全count 0。
- Heading fields: 4 / 4 present、全count 1。
- Repeatability: 同一SHA / command / patternで12 / 12 equal。
- Fix ancestry: `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0`はMeasurementRefの`non-ancestor`（exit 1）。Content verdictとは独立。
- Target CodeKB diff: Code Generation baseline `7ec1301a82a91564653aec1693ccc876c707d78c`からMeasurementRefまで0件。

Security / change-surface verification:

- Application source、test、package / lock、TypeScript / Biome / CI configuration、対象CodeKBのdiffは0件。
- 新規credential、token、customer data、AWS / IaC / container surfaceは0件。
- PR操作、main merge、Issue close、force push、branch protection変更は0件。
- Content、ancestry、repository suite、sensor、§13、gate、pushは相互代替しないfieldとして維持する。

## Failure details and skips

Failureは0件。既存runnerはinvalid / expired AWS credentialを必要とするlive SDK / substrate testと、利用不能なClaude substrate由来23 filesを明示skipした。新規runtime、endpoint、dependency、IaC、containerがないためload / stress / soak、DAST、追加SAST、dependency / IaC / container scanはN/Aである。

Engine-resolved producesに従い本fileを生成した。Stage proseの`test-results.md`との不整合はnonblocking framework Deviationとしてhandoffし、`test-results.md`は生成していない。
