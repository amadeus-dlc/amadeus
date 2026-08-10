# Business Rules — numeric-provenance-sensor-cli

上流参照: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。本UnitはU1のApproved Mappingを消費し、FR-PREDの固定語彙とFR-CUTのcutoffをruntime verdictへ写す。

## Rule catalogue

### BR-U2-01: Total input handling

- present/missingを明示した `EvaluationInput` だけをEvaluatorへ渡す。
- missingは最初に `pass: true, skipped: true, findings: []` と `file-not-found` reasonへ写す。
- present inputの空文字列はmissingと同一視せず、通常の適用性/候補判定へ進める。

### BR-U2-02: Cutoff precedence

- record directory basenameの先頭6桁だけをYYMMDDとして解釈し、cutoff以上だけを評価候補とする。
- cutoff未満は `pre-cutoff`、undatableまたはintents外は `not-applicable` としてfail-openする。
- 本intentの着地日をcutoff定数とし、runtime clockやfile mtimeを使わない。

### BR-U2-03: Mechanical applicability

- questions、memory、verification、audit、state、ack basenameをexact path/basename ruleだけで除外する。
- lightweight reportはexact basename集合、またはGenerated Mappingのexact produces key集合だけで識別する。
- `summary` / `report` substring、本文の短さ、実装者判断で除外を拡張しない。
- 100行未満かつcandidate 0件だけを候補走査後の `not-applicable` とする。

### BR-U2-04: Mapping authority

- runtime classificationはApproved Mappingのgenerated projectionだけを読む。
- 公開seamは `evaluateNumericProvenance(input, deps)` の2引数とし、`deps` はfile capabilityだけを持つ。Evaluatorは同一moduleの検証済みreadonly生成定数を参照し、mapping単体testは `classifyArtifact(context, mapping)` seamへfixtureを注入する。
- lookup不一致、競合row、invalid modeはenforcementへfallbackせずskippedまたは起動時検証failureとする。
- U2はsweep統計、label、mode、`W`、wired stage集合を変更しない。

### BR-U2-05: Fixed claim classes

- claim classはcount、ratio、percentage、measured-valueの4種だけである。
- matcherはFR-PRED-1のunit、PASS/FAIL、`%`、測定語+後方40文字を1対1で表現する。
- heading番号、ISO日付、Issue/FR/id、hex SHA、semver単独、code fence内command argumentはcandidateにしない。
- class追加・語彙拡張はMappingやruntime heuristicではなくrequirements変更を要する。

### BR-U2-06: Structural neighborhood

- provenance探索はclaimと同一paragraph/list item/table row内に限定する。
- 空行、次heading、次の同階層list item、次table rowを越えない。
- 前後 `W` 論理行内は探索対象、`W+1` は必ず対象外である。
- `W` はfinding許容量ではなく、根拠探索範囲だけを制御する。

### BR-U2-07: Provenance vocabulary

- command token、measurement reference、7〜40桁SHA、許可relative linkだけを正当候補とする。
- 裸の「測定」「確認済み」、linkのないfilename、URL、absolute pathは受理しない。
- 複数候補は距離、位置、kindの固定順で1つを選び、入力順以外のfilesystem enumerationへ依存しない。

### BR-U2-08: Safe relative links

- URL/absolute/root escapeをfilesystem access前に拒否する。
- normalize後pathが同一intentの許可measurement/verification、許可basename、またはactive codekb re-scanに一致する必要がある。
- 別intent、一般artifact、directory、nonexistent targetは拒否する。
- 実在性は注入された `fileExists` と `isRegularFile` の両方で成立する場合だけ受理する。

### BR-U2-09: Enforcement verdict

- provenanceがないenforcement claim 1件につき1 findingを生成する。
- `pass = findings.length === 0`、`skipped = false` とする。
- thresholdや未併記率をfinding許容量に使わない。
- finding順はpath、line、column、classのcanonical orderとする。

### BR-U2-10: Measurement-only verdict

- candidate数、provenanceあり/なし、未併記率をmetricsへ記録する。
- findingsは常に空、passはtrue、skippedはfalseである。
- measurement-onlyの値をenforcement findingへ混入させない。

### BR-U2-11: CLI and failure boundary

- `main` は `--stage` と `--output-path` だけを必須入力とし、追加dispatcher armを要求しない。
- file不在/ENOENTはmissing stateへ変換して通常verdictを返す。
- 必須flag不足などEvaluatorを開始できない状態だけを`fail`と非zero exitへ写す。
- 通常FAILED verdictはJSONで表し、process exit codeは0とする。

### BR-U2-12: Performance and dependency policy

- claim、region、provenance候補はsingle-passまたはbounded-window処理とし、候補ごとの全文再scanを行わない。
- 新規runtime dependencyを追加せず、Bun標準機能と既存flag helperだけを使う。
- 100KB adversarial Markdownのmedian/p95、50KB→100KBのmedian比をNFR-3の条件で検証する。
- 正規表現timeout、予算超過、非線形比超過はいずれもtest failureとする。

## Decision table

| Condition | Mode | Findings | Pass | Skipped | Reason/metrics |
| --- | --- | --- | --- | --- | --- |
| missing/ENOENT | skipped | empty | true | true | file-not-found |
| pre-cutoff | skipped | empty | true | true | pre-cutoff |
| excluded/lightweight/unmapped | skipped | empty | true | true | typed reason |
| enforcement、全claimに根拠あり | enforcement | empty | true | false | counts/rate |
| enforcement、根拠なしclaimあり | enforcement | claimごと | false | false | counts/rate |
| measurement-only | measurement-only | empty | true | false | counts/rate |
| class別mode混在、enforcement findingなし | mixed | empty | true | false | class別metrics |
| class別mode混在、enforcement findingあり | mixed | enforcement分のみ | false | false | class別metrics |

## Validation rules

- `stage` は空でなく、Mappingのstage vocabularyで解決可能であること。
- `outputPath` はnormalize後にrepository/record contextを一意に導出できること。不能ならskipped。
- line/columnは1-origin、logical offsetは0-originで内部統一し、表示境界で混同しない。
- metricは有限numberだけを持ち、candidate 0件のrateは0とする。
- reason codeはclosed vocabularyで、自由文をcontrol flowに使わない。

## Error and recovery policy

| Failure | Owner | Recovery |
| --- | --- | --- |
| Mapping不一致 | Classifier | skippedとして記録し、authority/projection修復後に再実行 |
| invalid relative link | Resolver | rejected evidenceとして継続 |
| file missing/ENOENT | Adapter + Evaluator | skipped verdictで完了 |
| required flag missing | Adapter | `fail`、dispatcher起動エラー |
| Mapping schema破損 | module initialization/adapter | 起動不能として明示的に失敗 |
| regex/performance budget failure | Build and Test | matcherを同じ意味論の範囲で修復し再測定 |

silent widening、runtime threshold tuning、best-effort link acceptanceは行わない。

## Invariants

- enforcement以外のclaimからfindingを生成しない。
- skipped verdictにfindingを含めず、measurement-only verdictをskippedにしない。
- 1 claimを複数findingへ展開しない。
- `W` 内でも構造境界を越えたprovenanceを受理しない。
- U1 authorityとU2 projectionの意味集合を変更しない。
- dispatcher、runtime graph compiler、audit schemaを変更しない。
