# Domain Entities — numeric-provenance-sensor-cli

上流参照: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。entityは単一Bun process内のimmutable valueであり、database、network、長時間service、UI stateを持たない。

## Aggregate overview

`NumericProvenanceEvaluation` aggregateが1成果物の入力context、classification、claim、evidence、集計、終端verdictを所有する。U1の `NumericProvenanceMapping` はaggregate外部のreadonly authority projectionである。

```text
NumericProvenanceEvaluation
├── EvaluationInput
│   ├── ArtifactContext
│   └── ContentState
├── ArtifactClassification
│   └── ArtifactPolicy*
├── MarkdownRegion*
│   ├── NumericClaim*
│   └── ProvenanceCandidate*
├── ClaimEvaluation*
├── EvaluationMetrics
└── NumericProvenanceVerdict
```

## Input and context entities

### `EvaluationInput`

| Attribute | Meaning | Invariant |
| --- | --- | --- |
| `stage` | dispatcherから渡るstage slug | trim後非空 |
| `outputPath` | 対象成果物path | 元入力を保持し、派生contextと混同しない |
| `content` | present(markdown) / missing | exactly one state |

missingはMarkdown空文字列で代用しない。

### `ArtifactContext`

| Attribute | Meaning | Invariant |
| --- | --- | --- |
| `repositoryRoot` | path normalizeの基準 | runtime identityにはしない |
| `space` | active space segment | outputPathから導出 |
| `intentRecord` | record directory | `intents/<record>` と一意対応 |
| `recordDate` | 先頭6桁またはundatable | runtime clock非依存 |
| `recordRelativePath` | record内POSIX path | absolute/root escapeなし |
| `basename` | mechanical exclusion用 | pathから決定的導出 |
| `stageSlug` | invocation stage | Mapping lookup key |

contextを構築できないpathはinvalid entityにせず、typed classification reasonへ写す。

### `EvaluationDeps`

`fileExists(path)` と `isRegularFile(path)` のreadonly capability pair。Evaluatorはこれ以外のI/O能力を受け取らない。テストではfixture factsを注入し、production adapterでは同期filesystem実装を渡す。Generated Mappingはこのentityの属性ではなく同一moduleのreadonly生成定数であり、mapping単体testは `classifyArtifact(context, mapping)` seamを使う。Mapping schema revision・authority digest・lookup key競合の検証はAdapterがEvaluator呼出前に所有し、破損時は起動不能として`fail`へ写す。

## Markdown and claim entities

### `MarkdownRegion`

paragraph、list-item、table-rowのいずれか。`regionId`、kind、開始/終了物理行、region内logical line sequenceを持つ。heading、空行、次の同階層list item、別table rowは同一regionに含めない。

### `SourceSpan`

1-originのstart/end line、columnと、region内logical line indexを持つvalue object。startがendより後のvalue、region外のline、負indexを構築できない。

### `NumericClaim`

| Attribute | Meaning | Invariant |
| --- | --- | --- |
| `claimClass` | count / ratio / percentage / measured-value | closed set |
| `span` | source位置 | fence外のregionに属する |
| `sourceText` | 表示用原文 | 非空 |
| `normalizedText` | 決定的比較/identity用 | predicate revisionで一意 |
| `policyKey` | Mapping lookup用 | stage/path/classから導出 |

### `ProvenanceCandidate`

command、measurement-reference、sha、relative-linkのdiscriminated union。共通にkind、span、logical distance、normalized evidenceを持つ。relative-linkだけはraw targetと解決結果を持つ。

### `RelativeLinkResolution`

次のいずれかの終端stateを取る。

- `accepted`: normalized target、allowed root kind、実在通常file。
- `rejected-url`
- `rejected-absolute`
- `rejected-root-escape`
- `rejected-other-intent`
- `rejected-disallowed-artifact`
- `rejected-missing`
- `rejected-directory`

acceptedとrejected reasonを同じoptional field群で表現しない。

## Classification entities

### `GeneratedMapping`

U1のApproved Mappingから生成されたreadonly projection。schema revision、authority digest、cutoff、artifact rows、class policies、wired stage setを持つ。runtime側でentryを追加・上書きしない。

### `ArtifactPolicy`

`stageSlug + recordRelativeOutputPattern + producesKey + claimClass` に対するmodeと `W` を持つ。modeはenforcement/measurement-only、`W` は非負整数で、authority evidence IDへtraceできる。

### `ArtifactClassification`

discriminated unionで次を表す。

- `skipped(reason)`
- `applicable(artifact row, class policies)`

`reason` はfile-not-found、pre-cutoff、not-applicable、excluded、lightweight-report、unmapped-artifactのclosed vocabulary。applicable stateは少なくとも1つのpolicyを持つ。

## Evaluation entities

### `ProvenanceMatch`

1 claimに採用されたexactly 1つのcandidate。claimと同一region、distance `<= W`、kind固有受理条件を満たす。複数候補からの選択順を決定的に保持する。

### `ClaimEvaluation`

| Attribute | Meaning | Invariant |
| --- | --- | --- |
| `claim` | 評価対象 | exactly one |
| `policy` | class policy | claim classと一致 |
| `provenance` | accepted matchまたはnone | 最大1件 |
| `outcome` | provenanced / unprovenanced | provenance有無から導出 |

modeはpolicyから読むためClaimEvaluationへ重複保存しない。

### `NumericProvenanceFinding`

unprovenancedかつenforcementのClaimEvaluationからだけ生成する。path、stage、claim class、line、column、normalized excerpt、expected provenance kindsを持つ。finding identityはevaluation内のclaim位置とclassから決定的に導出する。

### `EvaluationMetrics`

全体とclass別にcandidate count、provenanced count、unprovenanced count、unprovenanced rateを持つ。countsからrateを導出し、candidate 0では0とする。finding countはenforcement finding collection lengthから導出する。

### `NumericProvenanceVerdict`

次のdiscriminated terminal stateをJSON schemaへ投影する。

| State | Invariant |
| --- | --- |
| skipped | pass=true、skipped=true、findings empty、reason必須 |
| passed | pass=true、skipped=false、findings empty、metrics必須 |
| failed | pass=false、skipped=false、findings non-empty、metrics必須 |

measurement-onlyは必ずpassedへ、enforcement/mixedはfinding有無によりpassed/failedへ写る。通常verdictにprocess exit codeを保存しない。

## Lifecycle

| State | Required data | Allowed transition |
| --- | --- | --- |
| received | stage、outputPath | file read-or-missing |
| missing | missing content | skipped verdict |
| present | Markdown | context derivation |
| context-resolved | ArtifactContext | cutoff/exclusion/classification |
| classified-skipped | typed reason | skipped verdict |
| classified-applicable | artifact row + policies | region scan |
| scanned | regions + claims | provenance resolution |
| resolved | ClaimEvaluation set | metrics/finding aggregation |
| completed | terminal verdict | JSON output |

前段stateへmutationで戻さず、修復後は新しいEvaluationを開始する。1 evaluationはexactly 1 terminal verdictを持つ。

## Relationships and ownership

- EvaluationInput 1つにArtifactContext 0または1つ。missing/undatableではcontextの一部がなくてもskippedへ進める。
- ArtifactContext 1つにArtifactClassification exactly 1つ。
- applicable classification 1つにMarkdownRegion 0件以上。
- MarkdownRegion 1つにNumericClaim 0件以上、ProvenanceCandidate 0件以上。
- NumericClaim 1つにClaimEvaluation exactly 1つ、ProvenanceMatchは0または1つ。
- unprovenanced enforcement ClaimEvaluation 1つにFinding exactly 1つ。
- Evaluation 1つにEvaluationMetrics 0または1つ、Verdict exactly 1つ。

## Invalid states made unrepresentable

- missing inputなのにMarkdownを持つ状態。
- skipped verdictなのにfindingまたはmetrics-only failureを持つ状態。
- measurement-only claimからfindingが生成された状態。
- provenance matchが別region、`W+1`、rejected linkを指す状態。
- Mappingにないartifact/classをenforcementとする状態。
- NaN/Infinityのrate、negative count、count合計不一致。
- Evaluatorがruntime graph、network、process exitを所有する状態。

## Serialization and compatibility

verdictのfinding collection順はpath、line、column、classの固定順とし、JSON key schemaは既存sensor verdict契約へ合わせる。Generated Mappingのschema revisionまたはauthority digestが期待値と異なる場合、runtime heuristicでmigrationせず明示的なprojection修復を要求する。timestampやabsolute workspace pathを意味論的outputへ含めない。
