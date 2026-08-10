# Code Generation Plan — stage-stats-attribution-service

## 方針

U-04 は既存 `amadeus-stage-stats.ts` を互換 façade / one-shot service として維持し、U-01〜U-03 の公開契約を1回ずつ呼び出して、window selection、semantic report、3 renderer、CLI、pipe を統合する。legacy measured population と既存 field は変更せず、attribution を append-only で追加する。filesystem scan は1回、元 records は legacy branch へ非破壊で渡し、typed invariant error では部分 report を出さない。User Stories stage は scope 上生成されていないため、`requirements.md`、`unit-of-work.md`、Functional Design、NFR Design へ代替 trace する。Depth は Standard、Test Strategy は Comprehensive である。

所有範囲は C-01 façade の `packages/framework/core/tools/amadeus-stage-stats.ts`、C-05 pure composer の新規 `packages/framework/core/tools/amadeus-stage-attribution-report.ts`、既存 `tests/unit/t486-stage-stats.test.ts`、既存 `tests/integration/t487-stage-stats.integration.test.ts` の4ファイルに限定する。C-05はU-03 accountingを呼ばず、format固有renderingやC-01への逆依存を持たない。U-01〜U-03 の source/test、generated `dist/`、self-install surface、project file は変更しない。

## 実装チェックリスト

- [x] Step 1: 既存 `buildWindows`、`composeReport`、Markdown/CSV/JSON renderer、argv/exit/write の振る舞いをcharacterization testで固定する。
- [x] Step 2: original recordsを変更せず、legacy windowと平行するidentity evidenceを構築し、ambiguous identity、zero-net、eligibleを排他的に選別する。`targetMeasured = eligible + zeroNet + ambiguous` を検証する。
- [x] Step 3: `--stage` と `--outliers` をI/O前にparseし、既定値、範囲、usage exit 2を既存引数互換のまま追加する。
- [x] Step 4: corpus scanを1回だけ行い、同じeligible window列に対してU-02 decoderを1回、U-03 accountingを1回、固定順序で呼び出す。typed invariant errorではlegacy outputを含むstdoutを出さずexit 1にする。
- [x] Step 5: `scanScope` と `unreadableShardCount` を含むcanonical semantic attribution reportを構成し、window/candidate/disposition/accountingのcross-component bijectionをfail-closedで検証する。
- [x] Step 6: positive duration populationのmedian/P95、eligible全件を母数とするshare、coverage/unattributable/observable/overlap、9 family、9×17 reason matrix、missing terminal dedup、strict `> 0.5` high-unattributable、observed factとinstrumentation hypothesisの分離を実装する。
- [x] Step 7: outlierをunattributable seconds降順、intent/start/end/window ID昇順で全体sortした後にlimitし、既存semantic reportへcanonical optional attribution fieldをappendする。
- [x] Step 8: 1つのsemantic modelからMarkdown、CSV、JSONをrenderし、attribution absent時の既存出力をbyte-compatibleに保つ。
- [x] Step 9: normal/empty exit 0、partial corpusはreport + stderr + exit 1、invariantはstdoutなし + stderr + exit 1とし、`process.exitCode` と1回の完全stdout write/natural drainを使用する。
- [x] Step 10: unit/integration/PBT fixtureで25 FR・7 NFR・完了条件1〜10、複数intent/stage、全failure matrix、順序/入力非破壊、3 format semantic parityを検証する。
- [x] Step 11: 229 shards・136,011 rows以上のpreconditionをassertするscale fixtureと、各format 65,536 bytes超のproducer/consumer exit 0、full-capture digest parity、JSON parse可能性を検証するoversized pipe testを実装する。
- [x] Step 12: focused test、既存t486/t487、repository typecheck、lint、関連CIを実行し、所有4ファイルだけをConventional Commitにする。

## Functional requirements全数トレーサビリティ

| 要件 | Step | 具体的な実装・検証証拠 |
|---|---:|---|
| FR-POP-1 | 1、4、10 | legacy scan入力を非破壊で維持し、U-02 canonical dedup回帰、unreadable shard partial integration、反復出力一致を検証 |
| FR-POP-2 | 3、10 | `--stage` default/safe slug/missing-invalidのunit・spawn test、legacy all-stage report非filterを検証 |
| FR-POP-3 | 1、2、8、10 | attribution absentのMarkdown/CSV/pretty JSON SHA-256 characterization、既存stage/sensor/model/review bucket testを維持 |
| FR-POP-4 | 2、10 | ambiguous→zero-net→eligible排他、canonical除外2行、target population equationをunit/integrationで検証 |
| FR-EVT-1 | 4、6、10 | U-02のclosed 9-family censusをprovider回帰し、U-04の9 family summaryを常時出力 |
| FR-EVT-2 | 4、10 | execution/unit-pool/transaction envelopeのschema・digest・identity・inner検証とfail-closedをU-02回帰で確認 |
| FR-EVT-3 | 4、10 | explicit intent/stage一致、別intent/stage非干渉、same eligible window参照をprovider/U-04 integrationで確認 |
| FR-EVT-4 | 4、10 | explicit lifecycle identity、start/terminal cardinality、timestamp対をU-02回帰しU-03へ一度だけ接続 |
| FR-EVT-5 | 4、5、6、10 | 17 reason precedence、secondary diagnostics、post-accounting reason、9×17 zero-filled matrixとcandidate ID非重複を検証 |
| FR-INT-1 | 4、10 | half-open clip、境界、safe integerをU-03 example/PBT回帰で確認 |
| FR-INT-2 | 4、10 | intent別idle subtraction、全idle時empty-after-idleをU-03回帰とU-04 integrationで確認 |
| FR-INT-3 | 4、6、10 | category内nested/adjacent/parallel/overlap unionと二重計上防止をU-03回帰で確認 |
| FR-INT-4 | 4、5、6、10 | global union、observable+unattributable=net、coverage+rate=1、finite rateをprovider/C-05で再検証 |
| FR-STAT-1 | 5、6、10 | positive durationだけのsummary、zeroを含むeligible全window share、empty/odd/even/nearest-rank P95をunit検証 |
| FR-STAT-2 | 5、6、10 | window/aggregate observable・unattributable・coverage・overlapを同じeligible populationで検証 |
| FR-OUT-1 | 5、6、8、10 | scan scope、unreadable count、target/population/exclusion/methodologyをcanonical modelと3形式へ投影 |
| FR-OUT-2 | 7、10 | unattributable秒降順、intent/start/end/window ID昇順、全aggregate後limit、0 limitをunit/integration検証 |
| FR-OUT-3 | 6、8、10 | 9×17 reason、missing-terminal ID dedup、strict `>0.5`、observed factsとhypothesis分離を3形式で検証 |
| FR-OUT-4 | 1、8、10 | 1 semantic modelから全semantic areaを3形式へappendし、legacy bytesと反復出力を固定 |
| FR-CLI-1 | 3、9、10 | `--outliers` default 10、0/10/100受理、-1/101/小数/非数値/欠落をscan前exit 2で検証 |
| FR-CLI-2 | 5、9、10 | eligible 0のn=0/null report、normal/partial/invariant/usage exit ladder、corpus byte不変/read-onlyを検証 |
| FR-COMP-1 | 1、8、9、10、11 | 既存public seam/`--json`/renderer SHA、t486/t487、`process.exitCode`、3形式natural drainを検証 |
| FR-TEST-1 | 2〜10 | identity、複合欠陥、FIFO、zero-net、interval、idle、union、argvをfocused 91件とprovider 38件で検証 |
| FR-TEST-2 | 10 | real-corpus相当fixture、同一corpusの3形式反復一致、real workspace scan 60秒以内をintegrationで検証 |
| FR-TEST-3 | 11 | 全3形式で65,536 bytes超、producer/consumer exit 0、digest parity、JSON parse/`jq empty`を検証 |

## 完了条件1〜10トレーサビリティ

| 完了条件 | Step | 具体的な検証証拠 |
|---:|---:|---|
| 1 | 4、10 | Fire id lifecycle、nested/parallel、idle、別stage同秒、開始/終端欠落をprovider回帰とsynthetic integrationで検証 |
| 2 | 2、4〜6、10 | zero-net/ambiguous除外後の全windowで秒・率恒等式、非負・finiteをU-03 PBTとC-05 reconciliationで検証 |
| 3 | 4、6、10 | category内unionとglobal unionのnested/identical/overlap fixtureで重複秒非計上を検証 |
| 4 | 2、5、6、8、10 | identity不明、ambiguous window、lifecycle欠落を推定せず、除外/reason件数を3形式へ投影 |
| 5 | 3、7、10 | `--stage code-generation --outliers 10`再実行、0/100/-1/101/小数/非数値境界、決定的outlierを検証 |
| 6 | 6、8、10 | `unattributableRate > 0.5`のobserved factと不足境界`candidateBoundary` hypothesisを分離して3形式へ報告 |
| 7 | 5、10 | cross-window/candidate bijection、秒・率恒等式、重複identity破壊fixtureがtyped error/REDになるtestを固定 |
| 8 | 8、10 | Markdown/CSV/JSONが同じreference、母集団、規則、除外、統計、reason、outlierを表すparity test |
| 9 | 1、8、10、12 | stage duration/sensor/model/reviewBuckets、既存renderer/public argsをSHA/focused/parent 129件で非退行確認 |
| 10 | 11 | 229 shards・136,011 rows、Markdown 134,039 / CSV 95,972 / JSON 456,935 bytes、exit/digest/`jq empty`成功 |

NFR-1〜7は上表のcorrectness、determinism、fail-closed、pipe、scale、pure module、read-only証拠とStep 12のtypecheck/lint/source-onlyで全数coverする。

U-04 は service/report/CLI/integration の最終consumer sliceを実装する。Issue #2695 の FR 25件、NFR 7件、完了条件1〜10をすべてcoverし、Issue記載からscopeを縮小しない。Issue #2700について既存PRで解消済みの範囲を再実装せず、未解消の3 format oversized-pipe証明をU-04で完遂する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T04:02:41Z
- **Iteration:** 1
- **Scope decision:** none

主要設計、scale・pipe証拠、CI/PR状態の扱いは整合するが、U-04の要件トレーサビリティに実在しないIDと欠落があり全25 FRの閉包を確認できない。

### Findings

- BLOCKER | code-generation-plan.mdの要件トレーサビリティは存在しない`FR-CLI-3`および`FR-STAT-3〜4`を参照する一方、実在する`FR-COMP-1`を明示的に対応付けておらず、code-summary.mdも集計pass数と包括的な完了宣言だけでこの欠落を補えないため、Issue #2695のFR 25件・完了条件1〜10が実装証拠へ全数trace可能とは判定できない。scopeを縮小せず、正しい25 FRと完了条件1〜10をplan step・具体的検証証拠へ対応付け直す必要がある。

## Review Repair — Iteration 1

- 存在しない`FR-CLI-3`、`FR-STAT-3〜4`を削除し、requirements.mdに実在する25 FRを1行ずつ列挙した。
- 欠落していた`FR-COMP-1`をlegacy SHA、既存t486/t487、`process.exitCode`、3形式natural drainの証拠へ明示対応した。
- Issue #2695完了条件1〜10を別表でplan stepと具体的test/scale evidenceへ全数対応し、U-04のscopeを縮小していない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T04:05:08Z
- **Iteration:** 2
- **Scope decision:** none

前回BLOCKERは解消され、実在する25 FR、FR-COMP-1、NFR 7件、完了条件1〜10が正しいStepと具体的証拠へ全数traceされ、scope保持、検証結果、CIおよびPR未収束状態の扱いにも矛盾はない。

### Findings

- None
