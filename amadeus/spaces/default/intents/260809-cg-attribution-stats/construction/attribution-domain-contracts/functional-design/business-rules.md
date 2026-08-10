# Business Rules — attribution-domain-contracts

上流入力（consumes全数）は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` である。rulesはFR-EVT-5、FR-CLI-1〜2、NFR-1〜3/6〜7をU-01のpure contractへ落とす。

## Validation rules

| Rule | Contract | Failure |
|---|---|---|
| BR-DOM-01 Target stage default | 値未指定は`code-generation` | none |
| BR-DOM-02 Target stage syntax | ASCII lowercase kebab-case `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`、1〜64文字だけを受理 | `usage(field=stage)` |
| BR-DOM-03 Outlier default | 値未指定は10 | none |
| BR-DOM-04 Outlier range | decimal integer 0〜100。符号、小数、指数、空文字を拒否 | `usage(field=outliers)` |
| BR-DOM-05 Second interval | start/endはfinite integer second、`start < end` | typed `err` |
| BR-DOM-06 Nullable statistics | population 0は`null`、NaN/Infinityは禁止 | invariant failure |
| BR-DOM-07 Immutable values | domain value/collectionはreadonly、入力を変更しない | compile/test failure |

CLIでflag自体が指定されvalueが欠ける形はC-01 `parseArgs`がBR-DOM-02/04と同じusage categoryへ変換する。U-01はargv位置やusage renderingを知らない。

## Closed vocabulary rules

- `CandidateFamily`はsensor、swarm、bolt、subagent、loop-monitor、merge-dispatch、execution-event-set、unit-pool-event-set、transaction-envelopeの9値で閉じる。
- `AttributionCategory`は`sensor-execution`、`swarm-lifecycle`、`bolt-lifecycle`、`subagent-lifecycle`、`loop-monitor-lifecycle`、`merge-dispatch-lifecycle`、`execution-lifecycle`、`unit-pool-lifecycle`、`transaction-lifecycle`の9値で閉じ、renderer labelをdomain valueに混ぜない。
- familyからcategoryへのmappingは上記の列挙順で1対1とし、任意のfamily/category組合せをconstructorで許可しない。
- `CandidateRejectionReason`はbusiness-logic-modelの17値で閉じる。unknown文字列をcatch-allへ流さない。
- `CandidateAccountingDisposition`は`accounted`または`rejected`だけを持つ。
- `accounted`は1件以上の`CandidateWindowContribution`を持ち、各contributionは1件以上のpositive `SecondInterval` fragmentを持つ。
- post-accounting `rejected.reason`は`outside-window`または`empty-after-idle`だけである。
- `ExplicitLifecycleInterval`はcandidateの明示intent、family、categoryを必ず保持する。`AttributionWindow`も明示intentを必ず保持し、accountingは同じintentかつ同じstageの組だけを評価する。

tuple定義と型unionを別々に手書きでdriftさせず、runtime exhaustivenessが必要なvocabularyはcanonical readonly tupleから型を導出する。

## Error and precedence rules

1 candidate groupまたはouter envelope failureはprimary countへちょうど1回だけ現れる。複数findingが成立するときは固定precedenceの最初をprimaryにし、残りをsecondaryへ送る。

| Findings | Primary | Secondary example |
|---|---|---|
| malformed payload + missing intent/stage | `malformed-event-set` | missing fieldsは未知innerを推定せずdiagnostic止まり |
| missing stage + duplicate start + missing terminal | `missing-stage` | duplicate-start、missing-terminal |
| duplicate start + missing terminal | `duplicate-start` | missing-terminal |
| valid lifecycle + no window overlap | `outside-window` | none |
| overlapあり + 全fragment idle | `empty-after-idle` | none |

canonical wire duplicateはこのvocabularyのlifecycle duplicateではない。U-02でdedupされた後に残る同一identityの競合だけが`duplicate-start`/`duplicate-terminal`になる。

## Accounting type invariants

- `CandidateId`、`AttributionWindowId`、`LifecycleIdentity`は互いに代入できないbrandとする。
- window subjectのinvariant errorは必ず`windowId`を持つ。population subjectは問題candidateが特定できる場合だけ`candidateId`を持つ。
- `AttributionPopulationAccounting.dispositions.length`はU-03入力accepted candidate数と一致する。
- `windows`結果はeligible windowごとにちょうど1件で、window IDは一意である。
- ratioを持つ型はfinite numberまたは明示的`null`だけを許す。

## Forbidden behavior

- string castだけでbrandを作らない。
- timestamp containmentからintent、stage、lifecycle identity、family、categoryを推定しない。
- nullable primitiveをconstructor外から直接生成しない。
- expected decode/usage failureにexception classを導入しない。
- U-01からfilesystem、process、journal codec、renderer、U-02〜U-04をimportしない。
- reasonの表示順やCSV labelをdomain semanticsへ混ぜない。

## Verification rules

`t486-stage-attribution-domain.test.ts`は少なくとも次をtable-drivenで固定する。

- stage default、最短`a`、数字を含む`stage2`、hyphenを含む`code-generation`をsafeとして固定し、大文字、underscore、先頭/末尾hyphen、連続hyphen、空文字、65文字、非ASCII、値欠落をunsafeとして固定する。
- outlier 0/10/100と-1/101/小数/非数値/空値。
- interval境界、非integer、non-finite、non-positive。
- closed tuple全値とexhaustive mapping。
- `DecodedCandidate`→`ExplicitLifecycleInterval`でintent/family/categoryが欠落・変換されないこと、および同stage・別intentの重複windowをclip対象にしないこと。
- `candidatePrimaryReason([])`がbuilt-in `TypeError`を投げ、非空findingsでは常に17値の1つを返すこと。
- 複合finding precedenceと入力順permutation。
- accounted contribution非空と不正fixtureの拒否。
- public type import graphに循環がないこと。
