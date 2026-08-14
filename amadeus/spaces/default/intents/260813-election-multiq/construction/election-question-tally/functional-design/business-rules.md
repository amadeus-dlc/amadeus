# Business Rules — election-question-tally

## Sources

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) からU2 ruleを抽出する。

## Resolution rules

| Rule | Contract |
|---|---|
| BR-R1 | resolution keyは`(voter, questionId)` |
| BR-R2 | receivedAtの大きいresponseが勝つ |
| BR-R3 | receipt同値はappend順の後勝ち |
| BR-R4 | unstamped legacyはstampedより前、unstamped同士はappend順 |
| BR-R5 | submittedAtをorderingへ使わない |
| BR-R6 | output orderはdefinition voter/question順 |

## Partition and coverage rules

| Rule | Contract |
|---|---|
| BR-P1 | target IDsはunique definition subset |
| BR-P2 | preserved IDsはestablished resultsだけ |
| BR-P3 | targetとpreservedはdisjoint |
| BR-P4 | target∪preservedは全definition questionsを被覆 |
| BR-P5 | 初回targetはall questions、preserved empty |
| BR-P6 | rerun targetはcurrent hold IDsだけ |
| BR-P7 | expected preserved digest不一致はcommit前fail-closed |

## Tally rules

- BR-T1: questionごとに独立したresponses/choices/GoAだけを使用する。
- BR-T2: GoA8が1件以上なら最優先で`block`。
- BR-T3: 2-voter rosterはfull participation必須。
- BR-T4: 2-voterでdiscuss≥1は`discussion-needed`、abstain≥1は`quorum-short`、favor/against 1:1は`split`。
- BR-T5: 3+ rosterでdiscuss≥2は`discussion-needed`、favor+against=0は`quorum-short`。
- BR-T6: winner countからGoA4を除外する。
- BR-T7: top choiceが複数なら`tie`、一意ならestablished。
- BR-T8: counts/resultsはdefinition順で決定的。
- BR-T9: 他questionの低GoA、reservation、choiceは影響しない。

## Early and late rules

- BR-E1: early tallyはquestionごとに判定する。
- BR-E2: block可能性またはpolicy未成立ならfalse。
- BR-E3: missing全票が反対でもfavor優勢が覆らない場合だけtrue。
- BR-L1: latenessはsubmittedAtでなくreceivedAtとquestion boundaryで判定する。
- BR-L2: ballot内responsesは個別にonTime/lateへ分割可能。
- BR-L3: established questionのlate responseはcurrent tallyへ混入しない。
- BR-L4: late GoA8はreexamRequiredだが自動reopenしない。

## Preservation and lifecycle rules

- BR-S1: preserved established resultをmutation/re-tallyしない。
- BR-S2: outputは全question resultをちょうど1件ずつ持つ。
- BR-S3: output established digestはU1 canonical helperで再計算する。
- BR-S4: holdが1件以上なら`partial`、0件なら`tallied`。
- BR-S5: error時はpartial outputを返さない。

## Complexity and traceability

Map/Setを使い、resolution/tally/assemblyをO(R+C+Q+V)またはordering込みO(n log n)に収める。FR-BAL-3/4、FR-TAL-1〜6、FR-RER-1/2、NFR-1/3/4を本rule群で被覆する。
