# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-wave-contract-definition/tasks.md) | B001/T001, B001/T002 | `skills/amadeus-construction/SKILL.md` と昇格先 | [test-results.md](bolts/B001-wave-contract-definition/test-results.md) | [PR #371](https://github.com/amadeus-dlc/amadeus/pull/371) | verified | B001/T002 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B002-verification-alignment/tasks.md) | B002/T001, B002/T002 | 変更なし（確認のみ。eval fixture の調整は不要だった） | [test-results.md](bolts/B002-verification-alignment/test-results.md) | [PR #371](https://github.com/amadeus-dlc/amadeus/pull/371) | verified | B002/T002 は skill-forge 確認の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002 | [test-results.md](bolts/B001-wave-contract-definition/test-results.md), [pr.md](bolts/B001-wave-contract-definition/pr.md), [PR #371](https://github.com/amadeus-dlc/amadeus/pull/371), [PR #372](https://github.com/amadeus-dlc/amadeus/pull/372) | verified |
| B002 | B002/T001, B002/T002 | [test-results.md](bolts/B002-verification-alignment/test-results.md), [pr.md](bolts/B002-verification-alignment/pr.md), [PR #371](https://github.com/amadeus-dlc/amadeus/pull/371) | verified |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-construction/SKILL.md` と昇格先 | B001/T001, B001/T002 | 実装済み | 検証済み | [PR #371](https://github.com/amadeus-dlc/amadeus/pull/371), [PR #372](https://github.com/amadeus-dlc/amadeus/pull/372) | verified |
| 検証整合の確認（eval fixture の変更なし） | B002/T001, B002/T002 | 実施済み | 検証済み | [PR #371](https://github.com/amadeus-dlc/amadeus/pull/371) | verified |
