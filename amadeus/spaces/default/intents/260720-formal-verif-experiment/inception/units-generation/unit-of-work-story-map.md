# Unit of Work Scenario Map — 形式検証対照実験

## 上流入力とmapping stance

User Storiesはexecution planでSKIPされ、`stories.md`は存在しない。そのためstoryを捏造せず、`requirements.md` のFR-1〜FR-9 / NFR-1〜NFR-4から検証scenarioを定義し、`components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`の8 unitへ対応付ける。これは実装順ではなくcoverage mapである。

## Requirement scenarios

| Scenario | Requirement outcome | Primary unit | Supporting units |
| --- | --- | --- | --- |
| S-1 Defect universe closure | 7独立falling proofs、不能時5へ縮約、6禁止、1 branch / defect | sealed-fixture-registry | experiment-contract-provenance |
| S-2 Blind freeze provenance | 2armの公開入力hash、author / worktree / freeze SHA、開示順 | experiment-contract-provenance | tla-invalid-timestamp-skeleton、ts-arm |
| S-3 Deterministic arm verdict | 共通DETECTED / NOT_DETECTED / HARNESS_ERRORと再実行一致 | execution-evidence | tla-arm-toolchain、ts-arm |
| S-4 Risk-first skeleton | frozen Arm T × #1252のend-to-end proof、failure時停止 | tla-invalid-timestamp-skeleton | sealed-fixture-registry、execution-evidence、tla-arm-toolchain |
| S-5 Independent Arm S | universe / direct product / PBT / two timestamp brandsをblind freeze | ts-arm | experiment-contract-provenance |
| S-6 Full matrix and cost | baseline + D-COUNT × 2、suite timing、LOC / event elapsed | full-matrix-suite | sealed-fixture-registry、execution-evidence、両arm |
| S-7 Closed selection | hard eligibility、3-axis Pareto、trade-off no winner | eligibility-report | experiment-contract-provenance、full-matrix-suite |
| S-8 Reproducible decision record | branch / freeze / matrix / cost / command / CI / artifact trace、Alloy判定 | eligibility-report | 全unit |
| S-9 Fixture data safety | fixture内のsecret / 個人データ / 外部選挙store参照0件とscan receipt | sealed-fixture-registry | execution-evidence |

## Coverage matrix

| Unit | FR / NFR coverage | Scenario coverage |
| --- | --- | --- |
| experiment-contract-provenance | FR-3、FR-4、FR-5、NFR-1、NFR-2 | S-1、S-2、S-3、S-4、S-7、S-8 |
| sealed-fixture-registry | FR-1、FR-2、FR-3、NFR-2、NFR-3 | S-1、S-4、S-6、S-8、S-9 |
| execution-evidence | FR-4、FR-5、FR-9、NFR-1、NFR-2、NFR-3、NFR-4 | S-3、S-4、S-6、S-8、S-9 |
| tla-arm-toolchain | FR-3、FR-4、FR-7、FR-8、NFR-1、NFR-3 | S-3、S-4、S-6、S-8 |
| tla-invalid-timestamp-skeleton | FR-3、FR-8、NFR-1、NFR-2 | S-2、S-4、S-8 |
| ts-arm | FR-3、FR-4、NFR-1、NFR-4 | S-2、S-3、S-5、S-6、S-8 |
| full-matrix-suite | FR-4、FR-5、FR-9、NFR-1、NFR-2 | S-3、S-6、S-8 |
| eligibility-report | FR-4、FR-6、FR-7、FR-9、NFR-2、NFR-4 | S-3、S-7、S-8 |

すべてのFRは少なくとも1 primary / owning unitへ割り当てられ、すべてのunitは2件以上のscenarioへ参加する。NFR-3はTLA toolchainのartifact checksum面とsealed-fixture-registry primary / execution-evidence supportの禁止データscan面に分け、NFR-4 maintainabilityはcontract / evidence / TS / report境界で覆う。

## Unit内の検証flow

ここで示す順序はunit内testの依存だけであり、unit間の実装順ではない。

| Unit | Internal verification flow |
| --- | --- |
| experiment-contract-provenance | parser red tests → canonical hash → fake handler injection → routing / error propagation → invalid transition rejection |
| sealed-fixture-registry | baseline green → isolated revert red → branch / hunk validation → forbidden-data scan → seal / reveal / promotion guard |
| execution-evidence | schema negative → append / identity → missing / duplicate matrix → suite result validation |
| tla-arm-toolchain | checksum negative → finite profile parse → counterexample normalize → exhaustive completion proof |
| tla-invalid-timestamp-skeleton | T freeze proof → sealed reveal → deterministic verdict → evidence links → stop / pass transition |
| ts-arm | brand negative → universe enumeration → PBT replay → adapter normalization → input allowlist check |
| full-matrix-suite | canonical order → warmup exclusion → 5 measured suites → verdict equality → median recompute |
| eligibility-report | ineligible fixtures → Pareto cases → no-winner trade-off → Alloy trigger → trace-link verification → all-handler wiring-only test |

## Unassigned / cross-cutting check

- Unassigned requirements: 0。
- Unassigned units: 0。
- Cross-cutting S-8は全unitのevidence pathを使うが、最終所有者は`eligibility-report`。
- production CI、deployment、UI、Alloy実装はOut of Scopeのためscenarioへ割り当てない。
