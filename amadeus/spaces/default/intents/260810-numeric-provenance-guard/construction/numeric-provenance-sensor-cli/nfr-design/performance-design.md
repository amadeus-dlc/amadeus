# Performance Design — numeric-provenance-sensor-cli

唯一のpresent consumeは `business-logic-model.md` である。同成果物のsingle-pass方針 (`business-logic-model.md:113-120`) と100KB/50KB測定契約 (`business-logic-model.md:120`) を実装可能な性能設計へ落とす。NFR Requirements成果物はabsent-and-expectedのため、新しいrequirement IDは作らない。

## Performance budget

既存要件の予算を変更せず、次の4条件を独立に判定する。

| Measure | Workload | Budget |
| --- | --- | --- |
| median latency | 100KB adversarial Markdown、20 measured runs | 100ms以下 |
| p95 latency | 同上 | 250ms以下 |
| linearity ratio | 100KB median / 50KB median | 2.5以下 |
| completion | regex timeoutまたはrun未完了 | 不許可 |

各caseは同一processで5回warm-up後に20回測定する。計時範囲はoutput file read開始からverdict構築完了までで、dispatcher process起動時間、fixture生成、JSON printは除外する。Bun 1.3.13、`ubuntu-latest`、単一processを測定metadataへ残す。

## Processing architecture

### One read, one indexed traversal

CLI Adapterはfileを同期で1回だけ読み、Evaluatorへpresent contentを渡す。Evaluatorは改行分割後の1 traversalで次を構築する。

- fence stateとparagraph/list-item/table-row region identity。
- 固定4 classのNumericClaim。
- regionごとのcommand/ref/SHA/link provenance candidate index。
- line/region offset table。

claim評価でMarkdown全文を再scanしない。各claimは同一regionの `bounded(W)` または `full-structural-region` indexだけを参照する。relative link validationはlexical受理候補だけfilesystem capabilityを呼ぶ。

## Complexity constraints

- line/region/claim/provenance indexingは入力文字数 `n` に対してO(n)。
- claim resolutionは索引済みregion内候補数に比例し、全claim×全文のO(n²)を禁止する。
- regexはnested unbounded quantifier、曖昧なbacktracking alternation、unbounded dot-starを使わない。
- 同一normalized link targetのfilesystem結果だけevaluation-local Mapでmemoizeする。
- global/cross-process cacheを持たず、evaluation完了時に全一時stateを解放する。

## Adversarial workload

50KB/100KB fixtureは同型の繰返しで構成し、次を含める。

- 長い非一致行、桁区切り、ratio、percentage、measured語彙。
- 多数のbacktick、未閉じfence、list indentation、table row。
- 多数のrelative link、root escape、URL、missing target。
- claimがregion境界と `W` / `W+1` に密集するcase。

入力sizeはUTF-8 byte lengthで判定する。100KBを越えるproduction inputをskipするhard limitは設けず、予算保証の検証点だけを100KBに固定する。

## Measurement algorithm

1. 同じcompiled moduleとfixtureを使う。
2. warm-up結果を統計へ含めない。
3. measured durationをmonotonic high-resolution clockで記録する。
4. durationを昇順sortし、medianとnearest-rank p95を決定的に算出する。
5. 50KB/100KBそれぞれ20 runのmedianからratioを算出する。
6. threshold超過、非有限値、run欠落をtest failureとする。

GC制御やCPU pinningを利用可能性前提にしない。単発外れ値を捨てず、p95予算で吸収する。

## Non-applicable optimizations

DB query、connection pool、CDN、network cache、async queue、paginationは存在しないため非該当である。worker thread/parallel regexはStandard designに追加せず、single-process baselineが予算を満たさない実測が出た場合だけ別設計変更とする。

## Verification

- 4 matcherそれぞれにadversarial non-matchを与え、timeoutなく完了する。
- 50KB/100KBのmedian、100KB p95、ratioを同一test outputへ記録する。
- file read countがexactly 1、同一link targetのfilesystem probeがevaluation内で最大1回であることをfixture dependencyで確認する。
- region数・claim数を倍増したとき、処理時間比が予算内であることを確認する。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:54:29Z
- **Iteration:** 1
- **Scope decision:** none

性能予算はwarm-up、測定区間、標本数、統計手法、失敗条件まで測定可能に定義され、fail-openとstartup failure、stateless scale、component依存・blast radius、absent-and-expectedの扱いも5成果物間で概ね整合しています。ただし、output fileのfilesystem security boundaryが評価順序と一致せず、repository外ファイルを読み得るためNOT-READYです。

### Findings

- BLOCKER | output fileのrepository境界がread前に強制されません。security-design.md:13-15はroot escape等をtyped skippedへ写して任意fileをscan対象にしないとしますが、business-logic-model.md:101-107ではCLI Adapterがoutput fileを先に読み、repository/record正規化はEvaluatorの後続判定（同:9-10）です。この順序ではrepository外の`--output-path`をskipped判定前に読み、さらにintent内の字句pathがroot外へのsymlinkならcanonical containment規則がoutput pathにはないため外部内容を評価できます。CLI Adapterがread前にoutput pathの字句・canonical containmentとregular-file性を検証するのか、拒否時をtyped verdictとstartup failureのどちらにするのかを一意に定義し、business-logic-model.md、security-design.md、logical-components.mdの処理順を統一してください。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:57:47Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1で不足していたread前のlexical/canonical containment、regular-file性、拒否時のtyped unavailable input、およびEvaluatorでのskipped verdictへの変換は成果物間で整合しました。ただし、canonical preflightと後続readが同一filesystem objectへ束縛されておらず、競合時にrepository外内容を読み得るため、security boundaryはまだ閉じていません。

### Findings

- BLOCKER | output fileのcanonical containment/regular-file preflightと実際のreadの間にTOCTOUがあります。security-design.mdのOutput path、business-logic-model.mdのCLI adapter workflow、logical-components.mdのFilesystem boundaryはいずれも`realpathとregular-file性を確認してから読む`という別操作の順序だけを定義し、確認済みobjectをfile descriptorへ束縛してread時に再検証する契約を定義していません。preflight後にroot内regular fileをroot外symlinkへ置換すれば、後続readがrepository外contentを開けます。成果物はENOENT raceだけをtyped missingとして扱っており、この置換raceを閉じていません。open後のdescriptorに対するregular-file検証と、descriptorが解決するcanonical targetのroot containmentをread前に保証するなど、検証対象と読込対象が同一objectであることを一意に定義してください。
