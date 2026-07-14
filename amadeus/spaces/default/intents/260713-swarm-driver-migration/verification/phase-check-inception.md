# Inception → Construction Phase Boundary Verification

## 判定

**VERIFIED — 条件付きGO。**

FR-01〜FR-26、NFR-01〜NFR-12、USR-01〜USR-10、REL-01〜REL-02はApplication Design、6 Unit、6 Boltへ欠落なく追跡できる。`stories`と`mockups`はscopeで意図的にSKIPされており、requirements内のUSR／RELがstory相当の受入シナリオを担うため、orphanはない。

Constructionへ進む条件はDelivery Planningの人間承認である。pre-code checkpoint [PR #955](https://github.com/amadeus-dlc/amadeus/pull/955)はmerge済みである。ADR-009回復条件として、B-02の[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)へprovider-neutral transport/captureを追加し、B-04の[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)を更新headへrebaseしてClaude固有diffだけにする。B-03 Codexのschema discoveryが失敗した場合はintent全体を再審議し、native proofをfloorで代替しない。

## Artifact Completeness

| Artifact | 状態 | Verification |
|---|---|---|
| `requirements` | PASS | FR 26件、NFR 12件、USR 10件、platform／test／failure契約を定義 |
| `stories` | N/A | User Stories stageはSKIP。USR-01〜USR-10とREL-01〜REL-02が受入scenarioを提供 |
| `mockups` | N/A | Rough／Refined MockupsはSKIP。CLI／headless scopeでGUIなし |
| `components` | PASS | C-01〜C-12、method／service／dependency、ADR-001〜ADR-009が要求境界をcover |
| `unit-of-work` | PASS | U-01〜U-06の責務、test、完了条件、single ownershipを定義 |
| `unit-of-work-dependency` | PASS | acyclic DAG、provider parallel ready set、registry convergence seamを定義 |
| `unit-of-work-story-map` | PASS | USR 10件＋REL 2件をUnit／test／evidenceへ割当 |
| `team-practices` | PASS | brownfield stance、main／squash、Comprehensive test、release契約を確認 |
| `bolt-plan` | PASS | 6 Unitを6 Boltへ割当し、DoD、confidence、demo、entry gateを定義 |
| `team-allocation` | PASS | Developer lead、Architect重点review、human decision rightsを定義 |
| `risk-and-sequencing-rationale` | PASS | 基盤先行＋risk-first、Codex principal gate、parallel waveを説明 |
| `external-dependency-map` | PASS | CLI／auth／schema／macOS／Linux／PR／Issue gateを定義 |

## Coverage Metrics

| Metric | Coverage | Result |
|---|---|---|
| FR → Architecture | 26 / 26（100%） | PASS |
| NFR → Architecture／Unit acceptance | 12 / 12（100%） | PASS |
| USR → Unit／evidence | 10 / 10（100%） | PASS |
| REL → Unit／evidence | 2 / 2（100%） | PASS |
| Architecture component → Unit | 12 / 12（100%） | PASS |
| Unit → Bolt | 6 / 6（100%） | PASS |
| DAG edge respected | 5 / 5（100%） | PASS |
| Orphan Unit | 0 / 6 | PASS |
| Orphan scenario | 0 / 12 | PASS |

## Requirements → Architecture → Unit → Bolt Traceability

| Requirement group | Story-equivalent scenario | Architecture | Unit | Bolt | Result |
|---|---|---|---|---|---|
| FR-01〜FR-04 | USR-06、USR-09、全driver selection | C-02、C-03 | U-01 | B-01 | PASS |
| FR-05〜FR-10 | USR-01〜USR-08 | C-01〜C-04、C-08〜C-10 | U-01、U-02 | B-01、B-02 | PASS |
| FR-11〜FR-12 | USR-01〜USR-03 | C-05＋C-01/C-11 | U-03 | B-04 | PASS |
| FR-13 | USR-04 | C-06＋C-01/C-11 | U-04 | B-03 | PASS |
| FR-14 | USR-05 | C-07＋C-01/C-11 | U-05 | B-05 | PASS |
| FR-15 | USR-01、USR-02、USR-04、USR-05、USR-10 | C-01、C-08〜C-11 | U-02〜U-05 | B-02〜B-05 | PASS |
| FR-16〜FR-17 | USR-08 | C-02〜C-04、C-05〜C-07 | U-01、U-03〜U-06 | B-01、B-03〜B-06 | PASS |
| FR-18〜FR-21 | USR-07、USR-10 | C-01、C-08〜C-11 | U-02、active provider | B-02〜B-05 | PASS |
| FR-22〜FR-23 | 全USR | C-01〜C-11 | U-01〜U-06 | B-01〜B-06 | PASS |
| FR-24〜FR-26 | REL-01、REL-02 | C-12＋closed C-04 registry | U-06 | B-06 | PASS |
| NFR-01〜NFR-03 | selection／lifecycle／resume | C-02〜C-04、C-08〜C-10 | U-01、U-02 | B-01、B-02 | PASS |
| NFR-04〜NFR-05 | 全native／audit scenario | C-05〜C-10 | U-01〜U-05 | B-01〜B-05 | PASS |
| NFR-06〜NFR-07 | contract／legacy／distribution | C-02〜C-04、C-12 | U-01、U-06 | B-01、B-06 | PASS |
| NFR-08〜NFR-09 | macOS／Linux、Windows対象外 | C-05〜C-07、C-12 | U-03〜U-06 | B-03〜B-06 | PASS |
| NFR-10〜NFR-12 | wave、Comprehensive test、drift | C-01、C-07、C-12 | U-01〜U-06 | B-01〜B-06 | PASS |

## Scenario Alignment

| Scenario | Architecture behaviour | Primary Unit / Bolt | Required proof | Result |
|---|---|---|---|---|
| USR-01 | coordinated topology → Claude Agent Teams | C-02/C-03/C-05/C-08/C-11 | U-01/U-03、B-01/B-04 | selector＋Agent Teams live＋referee | PASS |
| USR-02 | independent topology → Claude Ultra Code | C-02/C-03/C-05/C-08/C-11 | U-01/U-03、B-01/B-04 | selector＋workflow live＋referee | PASS |
| USR-03 | unknown topology → Ultra＋reason | C-02/C-03/C-05/C-10 | U-01/U-03、B-01/B-04 | unknown fixture＋audit＋live | PASS |
| USR-04 | explicit Codex Ultra | C-06/C-08/C-11 | U-04、B-03 | Ultra handshake＋hook＋2 child＋referee | PASS |
| USR-05 | Kiro 5 Unit → 3+2 | C-07/C-08/C-11 | U-05、B-05 | wave fixture＋session live＋referee | PASS |
| USR-06 | cross-harness driver hard error | C-02/C-03 | U-01、B-01 | no-side-effect fixture | PASS |
| USR-07 | `auto` loud fallback | C-03/C-04/C-10 | U-01/U-02、B-01/B-02 | probe failure＋plan/audit | PASS |
| USR-08 | 0.1.x legacy behaviour | C-02〜C-07/C-10/C-12 | U-01〜U-06 | legacy matrix＋docs/distribution | PASS |
| USR-09 | new／legacy env conflict | C-02/C-03 | U-01、B-01 | pre-attempt hard error | PASS |
| USR-10 | crash後のresume | C-01/C-08〜C-11 | U-02＋provider、B-02〜B-05 | failure injection＋reconcile | PASS |
| REL-01 | 全harness release | C-04/C-12 | U-06、B-06 | registry＋drift＋platform matrix | PASS |
| REL-02 | 0.2.0削除追跡 | C-12 | U-06、B-06 | 日本語Issue＋URL | PASS |

## DAG and Sequencing Verification

Approved DAG:

```text
U-01 -> U-02 -> {U-03, U-04, U-05} -> U-06
```

Planned economic order:

```text
U-01 -> U-02 -> U-04 -> {U-03, U-05} -> U-06
```

U-04を他providerより先に置くことは、provider間にdependency edgeを追加せず、同じready set内のrisk-first priorityを指定するだけである。U-03／U-05は互いに独立しており、parallel implementationとserialized live proofはDAGを変更しない。cycle、self-loop、未宣言Unit、fan-in欠落は0件である。

## Consistency Checks

| Check | Result | Evidence |
|---|---|---|
| Public driver 5値が全成果物で一致 | PASS | requirements、components、U-01、B-01、B-06 |
| Pure selectionとstateful lifecycleが分離 | PASS | C-02/C-03 vs C-01/C-08〜C-10、U-01 vs U-02 |
| Provider proofがproduction registryを通る | PASS | U-02 placeholder＋closed transport/capture seam、U-03〜U-05 DoD、B-03〜B-05 |
| Native successとfloorが混同されない | PASS | FR-06/FR-10〜FR-14、ADR-006/ADR-009、provider entry/exit gates |
| Native evidenceとreferee／mergeがAND | PASS | FR-15/FR-21、C-08/C-11、U-02/B-02 |
| Provider raw dataが共通auditへ漏れない | PASS | FR-19/NFR-04、adapter normalization、secret scan |
| Legacy bridgeと0.2.0削除が分離 | PASS | U-01互換、U-06追跡Issue。削除実装はscope外 |
| Sourceとgenerated treeの方向が一意 | PASS | `packages/framework`正本、C-12、B-06 drift guard |
| Platform contractが一致 | PASS | macOS native、Linux fake/deterministic、Windows N/A |
| Formal walking skeleton stanceがpracticeと一致 | PASS | Brownfieldのためmarker off。B-03はnative proof milestoneのみ |
| Pre-code recovery pointがある | PASS | checkpoint PRをB-01 Code Generation前に人間merge |
| U-02/U-03の回復所有権が一意 | PASS | [PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)がcommon seam、[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)がClaude固有。rebase gateあり |

## Unresolved but Bounded

- Codex UltraとKiro sessionの実field path、interactive Claude Agent Teamsのexact team/task/hook pathはprovider-entry schema discoveryで確定する。Claude Ultra Codeのsnapshot/journal/hook surfaceとheadless Agent Teams不成立は実測済みである。外部surface取得不能時は実装へ進まない。
- Local credential／trustの有効性は保存せず、各probeで確認する。認証不足をPASSへ読み替えない。
- GitHub Actionsの実runと0.2.0 Issue URLはB-06で取得する。それまではPENDINGであり、設計欠落ではない。
- WindowsはOut of Scopeであり、未検証を成功表現へ変換しない。

## Mandatory Conditions for Construction

1. pre-code checkpoint [PR #955](https://github.com/amadeus-dlc/amadeus/pull/955)を既知の復帰点として維持する。
2. B-02の[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)でclosed transport/captureを収束させ、B-04の[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)をその更新headへrebaseする。U-03 diffへcommon runtimeを混在させない。
3. B-03 entryでCodex Ultraとnative multi-agentをfloorから機械判定できなければintent全体を再審議する。
4. 各providerはentry discoveryとexit live proofの両方を満たす。
5. B-04/B-05の片方がparkされても他方は続行できるが、B-06は全provider完了まで開始しない。
6. provider proofはtest injectionではなく、対応harness conductorからproduction registryを通す。
7. `packages/framework`だけを正本として編集し、生成先を直接変更しない。
8. PR merge、credentialed live操作、仕様変更は人間のdecision rightを維持する。

## Human Approval

- [ ] Delivery PlanningとInception phase boundaryを承認し、Constructionへ進む。engineのapproval auditを正本とし、このcheckboxはreview promptを示す。
