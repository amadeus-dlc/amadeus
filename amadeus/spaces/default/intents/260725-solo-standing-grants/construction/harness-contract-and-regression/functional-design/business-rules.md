# Business Rules: harness-contract-and-regression

## Design Inputs

規則は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`から導出する。

## Projection Rules

| Rule | Requirement |
|---|---|
| HR-01 | canonical sourceだけを編集し、generated harness fileを直接編集しない |
| HR-02 | 全6 harnessがroute→report→approved/await→human再開を同じ意味で持つ |
| HR-03 | harness固有UIはauthorization/state/audit contractを変更しない |
| HR-04 | new directive field/kindは全validator/example/goldenへ反映する |
| HR-04a | U2 route-intent bindingの正式決定前にprojection schemaを実装しない |
| HR-04b | carrier/record target/lookupはU2最終contractから導出し、harness独自fieldを足さない |
| HR-04c | opaque target UUID、session reservation、trusted presence mintを全harnessのhost adapterから同じcanonical APIへ投影する |
| HR-04d | intent UUIDは既存current-space `intents.json` rowだけを正本とし、exactly-one/in-flight以外を拒否する |
| HR-04e | session identity欠落harnessは共有keyへ退化せず、native stable identity adapter完成までtargeted mutation 0 |

## Compatibility Rules

| Rule | Requirement |
|---|---|
| HR-05 | team candidate finderとtie-breakを変更しない |
| HR-06 | leader/delegation/`DELEGATED_APPROVAL`を変更しない |
| HR-07 | human/team approve stdout/stderrを変更しない |
| HR-08 | `HUMAN_TURN` requirementを弱めない |
| HR-08a | machine injection、別session、invalid targetはowner `HUMAN_TURN`をmintしない |
| HR-09 | reject/Request Changes/halt-and-askを自動化しない |

## Policy Rules

| Rule | Requirement |
|---|---|
| HR-10 | phase-boundaryはexisting opt-inを維持する |
| HR-11 | walking-skeleton effective-onのfirst Construction gateだけhuman-only |
| HR-11a | stance offまたはscope-dependent effective-offは通常grant条件を評価 |
| HR-11b | scope-dependent解決不能はfail-closedでhuman-only |
| HR-12 | `amadeus-feature`をgreenfield-shapedとして回帰検証する |
| HR-13 | per-unit uncovered directiveにcarrierを付けない |
| HR-14 | all-covered final gateだけをgrant対象にする |

## Verification Rules

| Rule | Requirement |
|---|---|
| HR-15 | FR-01–26/NFR-01–08に少なくとも1 test traceを持つ |
| HR-16 | expected fallbackで3 audit delta 0、state bytes不変 |
| HR-17 | fallback前後でquality invocation count不変 |
| HR-18 | type、関連test、全testをblockingにする |
| HR-19 | `dist:check`と`promote:self:check`をblockingにする |
| HR-20 | flaky sleepではなくclock/audit fixtureを使用する |
| HR-21 | route後cursorを同名stageの別intentへ切替え、新intentのapproval/fallback/audit/state mutationが0であることを全harnessで検証する |
| HR-22 | generation後の同一working treeでfocused/full/drift checksを実行する |
| HR-23 | cursor switch→fallback→same-session human turn→targeted reportでownerだけを完了し非owner delta 0 |
| HR-24 | reservation stateはnone→armed→minted→consumedのone-shotで、crash/replay時もPresence Reservation Id当たりowner `HUMAN_TURN` exactly 1 |

## Documentation Rules

- helpは実際にpublicなverb/flagだけを記述する。
- state-machine referenceはprotected event、route/commit、fallback不変条件を記述する。
- doctorは既存責務に該当するcheckだけを追加し、単なるfeature listingへ拡張しない。
- frozen prototypeを前提、dependency、merge sourceとして記述しない。

## Completion Evidence

各checkはcommand、exit code、対象suiteを記録する。全testとdrift checkは生成後の同一working treeで再実行する。失敗をwarningとして完了扱いしない。
