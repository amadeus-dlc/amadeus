# Business Logic Model — numeric-provenance-sensor-cli

上流参照: `unit-of-work.md` のU2境界、`unit-of-work-story-map.md` のDS-1〜DS-4/DS-6、`requirements.md` のFR-SEN/FR-PRED/FR-CUT/FR-SWP/NFR、`components.md` の単一tool module責務、`component-methods.md` のdesign-time index/sweepとpure evaluator seam、`services.md` の同期短命CLI契約。U1のschema・fixture・受け入れ条件を実装してApproved Mappingを生成し、runtimeは承認済みMappingをreadonly入力として再計算しない。

## Design-time mapping pipeline

1. `indexSweepArtifacts(graphSnapshot)` がdeclared producesからMapping非依存のdescriptorを安定順で導出し、codekb re-scanをscan-only descriptorとして加える。
2. `scanNumericClaims` と `measureNearestProvenanceDistance` がruntime Evaluator / Classifierと生成前Mappingを呼ばず、構造境界内を`W`なしで全探索する。
3. U1 contractどおりlabel、false-positive率、provenance-positive数、距離分布を集計し、`W = max(nearest-rank p95, min + 1)` かつ `W < max` のgroupだけをenforcementとする。
4. lower-bound saturationはstrict interiorへ補正し、upper-bound saturationと他の閾値未達はmeasurement-onlyへ分類する。
5. SweepReportを実測authorityとして保存し、同じ意味集合からreadonly Generated Mappingとstage配線を生成する。

このpipelineはU2が所有する単一tool module内のdesign-time経路であり、U1は実行コードや生成結果を所有しない。

## End-to-end evaluation pipeline

`evaluateNumericProvenance` は次の順序で1つの成果物を評価する。各short-circuitは終端verdictを返し、後段へ進まない。

1. `content.kind = unavailable` ならAdapterが確定した `outside-root` / `not-regular-file` を `not-applicable` のskipped verdictへ写す。
2. `content.kind = missing` なら `file-not-found` のskipped verdict。
3. Adapterが検証済みの `outputPath` をrecord contextへ正規化できなければ `not-applicable` のskipped verdict。
4. intent recordの先頭6桁日付がcutoff未満なら `pre-cutoff`、日付不能またはintents外なら `not-applicable`。
5. questions、memory、verification、audit、state、ack basenameのmechanical exclusionなら対応reasonのskipped verdict。
6. exact lightweight basename、またはGenerated Mappingのexact produces keyがlightweight集合なら `lightweight-report`。
7. `stage + normalized record-relative output path` がMappingに一致しなければ `unmapped-artifact`。
8. Markdownを単一passでregion化し、固定4クラスのclaimを抽出する。候補0件かつ100行未満なら `not-applicable`。
9. claimごとにMappingのclass policyを参照し、`bounded(W)` は同一regionの前後 `W` 論理行、`full-structural-region` は同一region全体でprovenanceを探索する。
10. enforcement policyの未併記claimは1 claim = 1 findingへ変換する。measurement-only policyはfindingを作らずmetricsだけへ集計する。
11. 全class集計からmode別のtotal verdictを構築する。

この順序により、file-not-foundを`fail`へ流す、pre-cutoffをscanする、measurement-onlyを失敗扱いする、といった誤った状態遷移を排除する。

## Markdown region and claim scan

### Region construction

入力を改行で分割し、各論理行へ `lineNumber`、`fenceState`、`regionKind`、`regionId` を付ける。走査状態は現在のfence、paragraph、list indentationとmarker、table rowだけである。

- fenced code blockの開始・終了を追跡し、fence内部はclaim候補から除外する。
- headingはそれ自身で境界となり、前後paragraphを接続しない。heading番号はclaimにしない。
- 空行はparagraphを閉じる。
- list item markerを検出した行は新しいitemを開始する。同じitemの継続行だけを同一regionとし、次の同階層itemを越えない。
- tableは1物理行を1regionとし、隣接rowを越えない。
- その他の連続非空行は1 paragraph regionとする。

region identityは入力順で単調増加する整数とkindから構成する。claimとprovenanceのlogical distanceは同一region内の論理行index差であり、物理行番号差へ暗黙変換しない。

### Fixed claim extraction

各fence外lineへFR-PRED-1の4 matcherを適用する。

| Class | Candidate condition | Mandatory exclusion |
| --- | --- | --- |
| count | 桁区切りを許す整数/小数の直後に固定count unit | heading番号、ISO日付、Issue/FR/id、SHA、semver単独 |
| ratio | 整数/整数の直後にcase-insensitive PASS/FAIL | pathやversionとしてしか成立しないtoken |
| percentage | 整数/小数の直後に `%` | code fence内 |
| measured-value | 固定測定語から同一行後方40文字以内の整数/小数 | 測定語より前の数値、40文字超過 |

重なるmatcherが同一spanを返す場合は、開始column、終了column、classの固定順でcanonicalizeし、同じclass/spanの重複だけを除く。異なるspanは別claimとして保持する。normalized textはsample identityとfinding表示で同じ正規化関数を使う。

## Provenance resolution

各claimはpolicyの `searchScope` に従い、同一region内の `[-W, +W]` 論理行またはregion全体だけを候補範囲とする。次の固定kindを抽出し、受理条件を個別に評価する。

1. backtick code内のcommand token: token境界で `git|grep|rg|wc|find|ls|jq|gh|bun` のいずれか。
2. measurement reference: `測定 ref|measurement ref|observed at|HEAD|origin/main` のいずれか。
3. 7〜40桁のhex SHA。
4. 相対Markdown link: `#fragment` を除去後、安全性・許可root・実在通常fileを満たすもの。

複数の受理候補がある場合、logical distance昇順、source line昇順、column昇順、kind固定順で最初を `ProvenanceMatch` とする。この選択はpass/fail意味論を変えないが、同一入力のfinding/metric evidenceを決定的にする。

### Relative-link decision pipeline

linkは次の順序で処理する。

1. URL scheme、protocol-relative、absolute filesystem pathを拒否する。
2. fragmentを除去し、対象成果物directoryを基準にPOSIX normalizeする。
3. `..` 解決後のpathがrepository rootを脱出する場合は拒否する。
4. 同一intent recordの `verification/**`、`construction/**/{measurements,verification}/**`、許可basename、またはactive codekb re-scanに含まれるかを判定する。
5. 別intent、一般成果物、directory-only pathを拒否する。
6. lexical判定を通過したpathだけを注入された `fileExists` と `isRegularFile` で確認する。

不正linkは例外にせず、理由付きのrejected candidateとして扱う。他の正当provenanceがなければclaimは未併記となる。

## Artifact classification and mapping use

Generated Mappingのlookup keyは `stageSlug + normalized record-relative output path + claimClass` である。artifact rowはU2のDesign-time Artifact Indexがruntime graph snapshotから固定したproduces keyを持つため、runtime CLIはgraphを読まない。

公開seamはApplication Designどおり `evaluateNumericProvenance(input, deps)` の2引数を維持し、`deps` は `fileExists` と `isRegularFile` だけを持つ。Evaluatorは同一moduleのreadonly生成定数 `GENERATED_NUMERIC_PROVENANCE_MAPPING` を参照する。この定数はmodule評価後に変更されず、runtime I/Oやgraph読込を伴わないため、同じinput/depsに対してEvaluatorは純粋である。mapping固有の単体testは既存の `classifyArtifact(context, mapping)` seamへfixture mappingを明示注入し、Evaluatorの統合testは生成定数に存在するfixture pathを使う。

生成定数のschema revision、authority digest、lookup key競合はCLI AdapterがEvaluator呼出前に1回検証する。破損は成果物の業務状態ではなく配送されたprogramの起動不能なので`fail`へ写す。Evaluatorは検証済みMappingだけを受け取り、runtimeで補完・修復しない。

- exact basename exclusionはMapping lookupより前に適用する。
- produces keyによるlightweight判定はMapping rowのexact keyだけを使う。
- policy modeは `enforcement | measurement-only` のいずれかで、unmappedをenforcementへfallbackしない。
- `W` は探索距離であり、finding許容量ではない。
- 1成果物内でclassごとにmodeが異なる場合、enforcement findingを優先して最終passを決め、measurement metricsも失わない。

## Verdict state machine

| Terminal state | `pass` | `skipped` | `findings` | Required metrics/reason |
| --- | --- | --- | --- | --- |
| skipped | true | true | empty | typed reason |
| enforcement-pass | true | false | empty | candidates、provenanced、unprovenanced、rate |
| enforcement-failed | false | false | 1件以上 | 同じmetrics、finding count |
| measurement-only | true | false | empty | candidates、unprovenanced、rate |
| mixed-pass | true | false | empty | class別enforcement/measurement metrics |
| mixed-failed | false | false | enforcement findingのみ | class別metrics、finding count |

候補数0件でも100行以上かつMapping対象なら非skippedのpassとしてmetricsを返す。100行未満かつ候補0件だけが `not-applicable` skippedとなる。未併記率は `candidateCount = 0` のとき0として表現し、NaN/InfinityをJSONへ出さない。

## CLI adapter workflow

`main` は `requireFlagValue` で `--stage` と `--output-path` を取得し、次の境界だけを所有する。

1. 必須flag不足は起動不能として `fail`。
2. read前にoutput pathをproject root基準でlexical normalizeする。root外なら `{ kind: unavailable, reason: outside-root }` とし、fileを開かない。
3. pathが存在する場合はcanonical realpathがproject root内であることとregular file性を確認し、pre-open statのdevice/inodeを保持する。
4. canonical targetをread-only + `O_NOFOLLOW` でopenし、open済みdescriptorを `fstat` する。regular fileでない、またはpre-open statとdevice/inodeが異なる場合はdescriptorを読まず閉じ、`{ kind: unavailable, reason: path-race }` とする。
5. open後に元のrequested pathを再度realpath/statし、project root containmentとdescriptorのdevice/inode一致を再確認する。不一致、root外、`ELOOP` はdescriptorを読まず閉じ、`path-race` とする。以後はpathを再openしない。
6. 不在またはopenまでのENOENTは `{ kind: missing }` とする。
7. 全検証を通過した同一descriptorから同期で1回読み、finallyでcloseし、`{ kind: present, markdown }` とする。ENOENT以外のread errorは `fail`。
8. filesystem capabilityだけを `EvaluationDeps` としてEvaluatorへ渡す。Evaluatorは検証済みmodule-level生成定数を参照する。
9. verdictを1 JSON objectとして標準出力へ書く。

通常のFAILED verdict、対象外、cutoff、outside-root/not-regular-file、file-not-foundはprocess exit code 0で返す。権限拒否や不正encodingなどENOENT以外の起動不能は`fail`へ流し、業務findingと混在させない。

## Complexity and performance model

claim scanとregion構築は同じline traversalで行い、provenance候補もregion単位でindex化する。各claimがMarkdown全体を再走査せず、同一region内の有限windowだけを見るため、主要計算量は入力文字数とcandidate数に対して線形である。

- regexはbounded repetitionまたは単純なcharacter classで構成し、nested unbounded quantifierを使わない。
- linkのfilesystem checkはlexical受理候補だけに限定し、同一normalized targetをrun内memoizationする。
- global mutable cacheは持たず、1 evaluation終了時にmemoを破棄する。
- 100KB、50KBの敵対fixtureを5 warm-up + 20 measured runで検証し、median/p95と倍増比を別々に判定する。

## Scenario and error matrix

| Scenario | Result |
| --- | --- |
| enforcement claimに窓内commandあり | non-skipped PASS |
| commandが `W+1` または別region | claim単位finding、FAILED |
| measurement-only claimに根拠なし | findings空、PASS、metrics増加 |
| cutoff前record | `pre-cutoff` skipped |
| undatable/intents外path | `not-applicable` skipped |
| exact lightweight basename/produces key | `lightweight-report` skipped |
| `performance-summary.md` の数値claim | substringで除外せずMappingどおり評価 |
| file不在/ENOENT | `file-not-found` skipped、exit 0 |
| 別intentまたはroot脱出link | provenance不成立、他根拠がなければfinding |
| Mapping不一致 | `unmapped-artifact` skipped |

## Invariants

- 同一input、同一EvaluationDeps、同一module revisionからbyte-equivalentなverdict dataが得られる。finding順はpath、line、column、classの順とする。
- 1未併記enforcement claimはexactly 1 findingとなる。
- measurement-onlyはfindingと失敗を生成しない。
- skipped verdictは常にpass、空finding、typed reasonを持つ。
- runtimeはMappingのmode、`W`、produces key、stage集合を推定・再計算しない。
- Evaluatorはfilesystem、process、network、runtime graphを直接読まない。
- output fileはlexical/canonical root containment、`O_NOFOLLOW` open、descriptor `fstat`、pre/post device+inode一致を通過するまで読まず、検証済み同一descriptorからだけ読む。
- 新規runtime dependency、database、長時間service、UIを追加しない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:31:27Z
- **Iteration:** 1
- **Scope decision:** none

上流要件の主要シナリオ、fail-open、判定順序、構造境界、性能条件は概ね反映されていますが、決定的出力の順序とEvaluatorへのMapping供給契約が成果物間で矛盾しており、実装者が追加判断なしに公開seamを確定できません。

### Findings

- BLOCKER | findingの決定的な並び順が成果物間で矛盾しています。business-rules.mdのBR-U2-09は`path、line、column、class`順を要求する一方、domain-entities.mdのSerialization and compatibilityはverdict collectionを`class、line、column`順としています。異なるclassが異なる行にある入力ではJSON内のfinding順が変わり、`byte-equivalentなverdict data`というbusiness-logic-model.mdの不変条件を単一の実装で両方満たせません。canonical orderを一つに統一してください。
- BLOCKER | Generated Mappingをpure Evaluatorへ供給する呼出契約が閉じていません。business-logic-model.mdのCLI workflowはAdapterがGenerated MappingをEvaluatorへ渡すと明記し、domain-entities.mdもMappingをaggregate外部のreadonly authorityとしていますが、component-methods.mdの`evaluateNumericProvenance(input, deps)`にはMapping引数がなく、`EvaluationDeps`も`fileExists`と`isRegularFile`だけです。module-level定数をEvaluatorが直接参照するのか、第三引数として注入するのかで公開seam、単体試験、Mapping schema破損時の所有者が変わるため、関数形と依存所有を一意に定義してください。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:33:48Z
- **Iteration:** 2
- **Scope decision:** none

findingのcanonical orderはpath、line、column、classへ統一され、iteration 1の指摘(a)は解消しました。一方、Generated Mappingの注入契約はFunctional Design内では明記されたものの、上流の公開型契約と依然矛盾しています。

### Findings

- BLOCKER | Generated MappingのEvaluator供給契約が上流成果物と整合していません。business-logic-model.md、business-rules.md、domain-entities.mdはreadonly mappingを`deps.mapping`として`evaluateNumericProvenance(input, deps)`へ注入すると定義していますが、consumeであるcomponent-methods.mdの公開`EvaluationDeps`は`fileExists`と`isRegularFile`だけを持ち、mapping fieldを定義していません。実装者は上流公開型を変更するか、Functional Designに反してmodule global等を使うかを判断する必要があるため、公開型とFunctional Designを一つの契約へ統一してください。
