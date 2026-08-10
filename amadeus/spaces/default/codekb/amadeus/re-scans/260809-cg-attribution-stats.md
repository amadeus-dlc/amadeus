# RE 差分リフレッシュ記録: 260809-cg-attribution-stats

上流入力（stage `consumes` 全数）: なし。入力は [Issue #2695](https://github.com/amadeus-dlc/amadeus/issues/2695)、intent の `scope-document.md` / `intent-backlog.md`、現 worktree、到達可能 `origin/main`、Developer Code Scan の実測結果。

- Date: `2026-08-09T13:37:08Z`
- Base commit: `a5621236c6c69f1c54f3d496bdf91792d4ef12fc`（直前の共有 CodeKB 現在断面 `260807-intent-2328-tests-e2e-au` の observed。`git merge-base --is-ancestor a5621236c HEAD` = exit 0、距離220 commits）
- Observed commit: `82e2f30c0c6d1bbebeb3d6201584a314306d00ac`（本 worktree HEAD）
- Reachable upstream: `origin/main=fefbbcf0158b47a76cf8873c518fdd6e295e2dbd`（HEADより10 ahead、branchは1 ahead）。`HEAD..origin/main` はCodeKBと `amadeus-stage-stats.ts` を変更しない
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth `Standard`、Test Strategy `Comprehensive`
- Focus: CG window 内の既存 audit から、決定的に閉じた観測可能区間と帰属不能残余を集計する `stage-stats` 拡張。Issue #2695 完了条件1〜10 / CAP-01〜10を全て含み、縮小なし

## Scan mode 申告

Developerの構造スキャンとreal-corpus probeを一次入力とし、ArchitectがIssue本文、現行source、既存CodeKB形式、`HEAD..origin/main`を照合した differential refresh。

- 現行 source の引用は observed worktree の行番号を使用した。
- upstream先行10 commitsに患部変更がないことを `git diff --name-only HEAD..origin/main` で確認した。差分は選挙recordとNFR sensor面で、CodeKB / stage-stats / journal / lifecycle contractは不変。
- 監査corpusの件数は本workflow自身でも増える移動値。下記はDeveloper probe時点のobserved factで、後続stageはコマンドから再測定する。
- Issue #2695の「観測できない時間を実装・検証・review・PR convergenceへ推定しない」を最上位の解釈境界にした。

## Intent とスコープ固定

`amadeus-state.md:4-23` はBrownfield / self-feature / Standard / Comprehensiveを記録する。`scope-document.md:25-34,122` と `intent-backlog.md:9-20,119` はCAP-01〜CAP-10を全てMustとし、ユーザー訂正「Issue記載からスコープ縮小は許されない」を固定している。

In:

1. 既存eventだけを使う観測可能intervalとresidual
2. 全candidate inventoryとEvent Set inner展開
3. explicit stage/start/terminal/identityによるeligibility
4. measured population保存とattribution population分離
5. half-open clip / idle subtraction / category union / global union / overlap
6. `--stage`（default code-generation）/ `--outliers`（default 10、0..100 integer）
7. category/coverage/outlier/missing instrumentation/methodology
8. Markdown/CSV/JSON parity
9. 既存report非退行
10. 3形式の実サイズpipe完全性

Outは新規audit event、残余の業務フェーズ推定配分、効率化施策、model/harness attribution（#2518）、現行window identity自体の意味的修理。FIFO collisionは除外・診断する。

## Package / build / test 構造

| 面 | 事実 |
| --- | --- |
| repository | Bun-only TypeScript monorepo、root workspaces `packages/*`（`package.json:2-25`） |
| framework | 正本 `packages/framework/core/`。tools/hooks/otelをTypeScript strict対象にする（`tsconfig.json:2-22`） |
| setup | `packages/setup/`、scan時点version 0.1.7 |
| build | `bun run build = dist + promote:self`、source/distribution checkあり（`package.json:10-25`） |
| CI | Bun 1.3.13、typecheck（`ci.yml:83-95`）、Biome lint（`:97-119`）、smoke+unit+integration（`:275-282`）、reproducible build（`:293-299`） |
| deps | TypeScript `^6.0.3`、Biome `2.5.5`、fast-check `^4.9.0`、OTel API/logs/context（`package.json:43-53`） |
| focused tests | `t486` pure unit + `t487` integration。Developer実測80 pass / 0 fail / 221 expect |

新規runtime dependencyは不要。interval accountingはinteger epoch secondsのpure functionsで実装可能。

## 現行 stage-stats の構造

| seam | file:line | 現状 | 欠落 |
| --- | --- | --- | --- |
| chronology | `amadeus-stage-stats.ts:123-129` | timestamp昇順、同秒は元index | 同秒から意味を推定しない制約 |
| window | `:132-176` | intent×stage FIFO、unmatched/orphan計数 | collision group/stable identity metadataなし |
| idle | `:180-321` | awaiting/parked/session-gap、clip+union | idle差引後net=0をattribution用に分離しない |
| report | `:515-577` | existing duration/sensor/model/review | attribution sectionなし |
| MD | `:632-667` | human report | attributionなし |
| CSV | `:676-699` | section CSV | attributionなし |
| JSON | `:701-723` | deterministic arrays | attributionなし |
| argv | `:728-798` | projectDir/space/format/json | `--stage` / `--outliers`なし |
| corpus | `:827-872` | per-line mixed journal reader | `mergeShards`未使用、canonical cross-shard dedup境界が分離 |
| main | `:935-968` | renderer dispatch、exit 0/1/2 | new flags / target stageなし |

`subtractIdle` は `rawSeconds===0` をzero-secondとして落とす（`:309-311`）が、idle差引後 `netSeconds=0` は `measured.push` する（`:313-315`）。Issue規則1がmeasured population一致を要求するため、ここを変更せずattribution eligibility側で`net<=0`を落とす。

## Journal / event registry

`amadeus-journal.ts` はv1/v2 mixed readerとcanonical merge/dedupの正本。

- schema versions: `:30-35`
- v2 identity/idempotency shape: `:65-99`
- parse/normalize boundary: `:109-110`, `:130-143`
- record key / merge: `:481-497`, `:534-549`, `:608-640`

stage-statsはreaderだけを再利用しmergeを使わない。設計順を canonical dedup → lifecycle duplicate判定 とし、wire duplicateと同一operationのduplicate start/terminalを分ける。

event registryの正式認識面は `packages/framework/core/otel/event-registry.ts:193,202,629-708,840-895,942-1000`。candidate familyを手元の実在eventだけへ縮めず、Issue指定の全familyを閉じたinventoryにする。

## Candidate inventory と契約差分

| candidate | 現行契約/evidence | corpus probe | 判定 |
| --- | --- | --- | --- |
| Sensor | `Fire id` + `Stage slug` + terminal（`amadeus-sensor.ts:521-536,819-865`） | sensor-only union 4,501秒 | explicit pairだけ `sensor-execution` 採用 |
| Execution Event Set | operation start/finish、operationId、origin.stage（`amadeus-execution-contract.ts:30-46,101-154`） | outer 259 / start 61 / terminal 0。CG内outer49/start14、origin CG8/other6、outer Stage0 | terminal-missing等を報告、推定しない |
| Unit Pool Event Set | acquired/settled + attemptId（`amadeus-unit-pool.ts:80-93,130-148`） | outer180 / acquired50 / settled50、outer Stage0 | stage-identity-missing、containment補完なし |
| Bolt | `amadeus-bolt.ts:266-274,501-510,594-603,827-883` | stage明示不足 | inventory、理由付き不採用 |
| Swarm | `amadeus-swarm.ts:381-455` | stage明示不足 | inventory、理由付き不採用 |
| Subagent | start `packages/framework/core/hooks/amadeus-log-subagent-start.ts:75-100`、stop `packages/framework/core/hooks/amadeus-log-subagent.ts:130-154` | stage明示不足 | inventory、理由付き不採用 |
| Loop monitor | `amadeus-loop-monitor-runtime.ts:74-117` | stage instanceはあるが完全lifecycle不足 | inventory、理由付き不採用 |
| Merge dispatch | event writer | stage明示不足 | inventory、理由付き不採用 |
| transaction envelope | registry/writer契約 | required keyの一部不足 | inventory、理由付き不採用 |
| Gate | approval wait lifecycle | 既存idle subtractionで消費 | category対象外 |

eventはintent一致に加え、event自身または同じEvent Set envelopeのcanonical `Stage` / `Stage slug` / `origin.stage` がtargetと完全一致するときだけeligible。window containmentや同timestampからstageを補わない。

## Decoder failure semantics

- execution decoderはinvalid innerをsilent skipする（`amadeus-execution-lifecycle.ts:336-359`）。
- unit pool decoderはmalformedでthrowし、Event Set ID dedupを行う（`amadeus-unit-pool-runtime.ts:113-159`）。

この不統一をreportでさらに無音化しない。少なくともmissing-stage/start/terminal/identity、duplicate-start/terminal、terminal-not-after-start、malformed/digest/duplicate-event-setをcandidate×reasonとして残す。正確なreason vocabularyは後続designで閉じるが、Issueの全 failure classを統合して消してはならない。

## Runtime graph を一次資料にしない理由

`RuntimeStage` はstage snapshotで、汎用lifecycle terminal/intervalを持たない（`amadeus-runtime.ts:71-110`）。compilerはstage最新map（`:214-271`）、Bolt containment（`:498-660`）、Sensor containment/latest-wins（`:663-760`）を行い、summaryはsnapshotだけを読む（`:980-1044`）。

これはruntime表示には妥当でも、Issue #2695の「containmentからstageを推定しない」と非互換。attributionはraw normalized journal + explicit event contractから再構成する。

## Interval / accounting 規則

1. integer seconds、半開 `[start,end)`。
2. measured windowへclip。
3. 既存idle spansとのintersectionを除去。
4. category内のnested/parallel/overlapをunion。
5. category間は独立表示し単純加算しない。
6. 全categoryを別途unionして`observableSeconds`。
7. `unattributableSeconds=net-observable`、負値禁止。
8. eligible全窓で秒・率の恒等式を保証。

category `n`はpositive union窓数。duration median/p95はpositive集合、share median/p95はzeroを含むeligible全窓。category share合計100%は要求せず、coverage+unattributableRateだけ1を要求する。

## Real-corpus probe

| 指標 | 値 |
| --- | ---: |
| shards / rows | 229 / 136,011 |
| constructed / measured | 1,603 / 1,154 |
| CG measured n | 109 |
| CG raw median | 5,902s |
| CG net mean / median / p95 | 10,814.93s / 4,721s / 49,247s |
| existing exclusions | unmatched36 / orphan5 / unclosed-idle34 / zero-second415 |
| attribution exclusions | zero-net4 / ambiguous3 |
| eligible attribution windows | 102 |
| sensor-only observable / eligible net | 4,501s / 1,009,424s |
| sensor-only coverage | 0.446% |
| unattributable rate > 0.5 | 102 / 102 |

これはobserved factであり、「sensor=検証」「残余=実装/review/PR」の意味変換を許可しない。追加境界案は`candidateBoundary`仮説として別fieldにする。

## Output / #2700

現行render bytes: Markdown 53,121、CSV 48,619、JSON 107,248。`tests/integration/t487-stage-stats.integration.test.ts:337-389` は1200 distinct stagesでJSON約104 KiBを作り、full captureとpipe `wc -c`一致を証明する。

[#2700](https://github.com/amadeus-dlc/amadeus/issues/2700) の修正は [PR #2702](https://github.com/amadeus-dlc/amadeus/pull/2702) / [PR #2706](https://github.com/amadeus-dlc/amadeus/pull/2706) で着地済み。しかしIssue #2695条件10は拡張後のMarkdown/CSV consumer完走とJSON `jq empty`を含む。各形式のfixture precondition `bytes > 65,536` を機械assertしなければ、MD/CSVは閾値未満のまま偽証明になる。

## 品質ギャップとproof plan

focused baselineは80 pass / 0 fail / 221 expect。未証明:

- FIFO collision group全体と未閉鎖group診断
- zero-net分離とmeasured非退行
- 全family inventory/reason
- Event Set malformed/digest/duplicate
- half-open clip/idle/category/global union
- 恒等式、finite値、overlap
- args全境界と正常空report
- 3 renderer semantic parity
- 3形式oversized consumer
- real corpus再実行

実装時は手計算できる短区間の独立oracle、壊すと赤くなる注入、real corpus統合の3層で証明する。real corpusの移動値をpure accountingのoracleに使わない。

## Architect synthesis decisions

1. `StageStatsReport`へappend-only attribution section。既存field/全stage statsを保存。
2. window stable internal ID + collision metadataを採取し、measuredとattribution eligibilityを分離。
3. canonical journal dedup後にlifecycle duplicateをfail-closed判定。
4. full candidate inventoryを先に作り、区間化不能でも理由を残す。
5. interval accountingをpure boundaryにし、rendererは再計算しない。
6. `--stage`はattribution target、`--outliers`は表示limitだけを制御。
7. raw normalized journalを正本とし、runtime containment inferenceを使わない。
8. categoryのlifecycle意味を保存し、残余を業務フェーズへ推定配分しない。
9. #2700はコード上のブロック解除済みだが、3形式の条件10は本intentで完結。

## Remaining risks

- exact event-set digest/duplicate contractをどの既存decoderから再利用するかは後続designで決定が必要。
- stage-stats単一ファイルのcomplexity（Developer lint: `buildWindows=17`, `indexIdle=16`）へfamily分岐を集中させると保守性が悪化する。
- source branchがorigin/mainより10 commits behind。患部は不変だがConstruction開始前に再接地し、引用・test採番・corpus値を再測定する。
- audit corpusは実行中に増える。固定expected countではなくinvariantとself-consistencyを主assertにする。
