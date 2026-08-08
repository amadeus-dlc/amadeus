# Business Logic Model — stage-stats-cli(functional-design)

上流入力(consumes 全数): unit-of-work(U1 の DoD をアルゴリズム完了条件として消費)、unit-of-work-story-map(FR→C 写像を処理列の責務帰属に消費)、requirements(FR-1〜FR-7 の AC を各アルゴリズムの仕様として消費)、components(C1〜C9 の責務分割を処理段の構造として消費)、component-methods(シグネチャ・エラー処理方針を各段の入出力契約として消費)、services(単一 CLI の実行形態を処理列の枠として消費)

## 処理列(パイプライン全体)

```
argv → parseArgs ─(UsageError)→ exit 2
        │ CliOptions
        ▼
scanCorpus(spaceRoot)  … シャード発見 → readJournalRecords(2世代正規化) → intent 帰属
        │ ScannedCorpus(records + カウンタ)
        ├─→ buildWindows → subtractIdle → composeStageStats   … FR-2/統計
        ├─→ tallySensors                                        … FR-4
        ├─→ attributeModels                                     … FR-5
        │
collectReviewBlocks(intentsRoot)  … record *.md 走査(監査とは別ソース)  … FR-3
        │
        ▼
StageStatsReport(集約)→ renderMarkdown | renderCsv | serializeJson
        │
        ▼
exit: unreadableShardCount > 0 ? 1 : 0   … FR-1c / FR-7b
```

## A1: コーパス走査と正規化(C1、FR-1)

1. `spaceRoot/intents/*/audit/*.jsonl` を列挙(shardCount 加算)
2. 各シャードを `readJournalRecords`(amadeus-journal.ts:534)で読む — schemaVersion 1(`event`/`fields`)と 2(`eventName`/`attributes`)の両世代を正規化(FR-1b)。イベント判別は両世代とも `Event` 値
3. 読取不能シャード → `unreadableShardCount` 加算(例外は投げない)。parse 不能行 → `brokenLineCount` 加算
4. intent 帰属: spaceRoot 相対パスの第 2 セグメント(FR-1a — `intentId` 属性は使わない: v1 で "intents" に退化)

## A2: 窓構成(C2、FR-2a)

intent×stage ごとに時系列で走査し、`STAGE_STARTED` を待ち行列に置き、次の同 intent×stage の `STAGE_COMPLETED` と対応付ける:
- **タイムスタンプが parse 不能(`Date.parse` が NaN)のイベント → `invalidTimestamp` バケット(待ち行列へ入れる前に除外 — 明示改訂 R-1、BR-4b)**
- 対応の付かない START → `unmatchedStart` バケット
- 起点なし COMPLETED → `orphanComplete` バケット
- `rawSeconds = completedAt − startedAt`(秒粒度)。0 秒 → 窓は保持しつつ `zeroSecond` バケットへ計数(FR-2d — 母集団からの除外は統計段で適用)

## A3: idle 減算(C3、FR-2b/2c)

1. idle 区間構成(intent 単位): `STAGE_AWAITING_APPROVAL→(GATE_APPROVED|GATE_REJECTED)` / `WORKFLOW_PARKED→WORKFLOW_UNPARKED` / `SESSION_ENDED→(SESSION_STARTED|SESSION_RESUMED)`。**parse 不能タイムスタンプの idle イベントは区間へ入れず `invalidTimestamp` へ計数**(明示改訂 R-1、BR-4b — NaN が区間演算へ入らない)
2. 各窓へクリップ(窓外部分は切除)
3. クリップ後の区間集合を**開始時刻順にソートし重複マージ**(interval union — 二重減算防止、FR-2 AC ii)
4. `idleSeconds = マージ後区間長の総和`、`netSeconds = max は取らない — クリップにより構造的に raw ≧ idle が成立`(AC iv: `GATE_APPROVED`/`STAGE_COMPLETED` 同 try-block 発行で idle が窓末尾に接しても、クリップが窓境界で切るため負値は発生しない。コンストラクタの `netSeconds >= 0` 不変条件は防御ではなく仕様の表明)
5. 未クローズ idle 開始(対応する閉イベントが intent 内に無い)を持つ窓 → `unclosedIdle` バケットへ除外(黙示既定で救済しない — FR-2c)

## A4: §12a レビュー集計(C4、FR-3)

1. `intentsRoot` 配下の record *.md を走査
2. 2 段マッチ: 寛容走査 `/^## Review(?:[ \t].*)?$/` → 厳密マーカー等値 `^## Review — Iteration N`(amadeus-reviewer-runtime.ts:660 鏡映 — 実装時に実在再検証)
3. 寛容一致・厳密不一致(接尾辞付き)→ `unparseableReviewHeading` バケット
4. 帰属はパス由来: `construction/<unit>/<stage>/` 形は unit 付き、`{unit-name}` リテラルはそのまま表示(FR-3b)

## A5: センサー集計(C5、FR-4)

`SENSOR_FIRED/PASSED/FAILED` を `Stage slug` 属性で束ね、`failedRate = failed / fired`(fired 0 は NaN)。`Stage` 属性は読まない(型分離)。

## A6: モデル帰属(C6、FR-5)

subagent イベントの `Model` / `Model Source` 属性で Map 集計。属性不在 → `unresolvedCount`(UNKNOWN、fail-closed 可視)。恒等 `attributable + unresolved === total` を出力前に assert。

## A7: 統計(C7、FR-6a)

- mean / median / p95(nearest-rank: `values.sort` 後 `ceil(0.95 * n) − 1` 番目、空入力は NaN 伝播 — tests/lib/percentile.ts の意味論を鏡映実装)
- 統計母集団と恒等式は**層別**(domain-entities「母集団恒等」の正本に従う): 恒等 W `構成済み窓数 = net 統計母集団数 + unclosedIdle + zeroSecond` を出力上で検証可能にする(FR-2 AC vi の「全窓」= 構成済み StageWindow[] の総数、「除外件数」= windowing グループのうち窓由来 2 バケット)。unmatchedStart / orphanComplete / invalidTimestamp は窓未満のイベント計数、corpus / review グループは独立カウンタであり恒等式に参加しない(全 8 バケットの件数報告義務は不変 — FR-2c、明示改訂 R-1)

## A8: レンダリング(C8、FR-6)

- 先頭に measurement ref(シャード数・行数・除外バケット全 8 件数 — 明示改訂 R-1)→ 仮説明記文言(FR-6c 固定文字列)→ 本文
- 順序決定性: ステージ表は count-desc → key-asc、Map 系は key-asc(`--json` は Maps を固定順序の配列へ)。同一入力 2 回実行 byte 一致(FR-6 AC i)

## A9: exit ladder(C9、FR-7b)

```
parseArgs 失敗(未知フラグ・不正値)      → exit 2(使用法)
unreadableShardCount > 0                  → exit 1(コーパス穴 — fail-loud)
それ以外                                   → exit 0
```

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T22:00:42Z
- **Iteration:** 1
- **Scope decision:** none

逐語型整合・実装可能性・後方互換混入なしは確認できたが、BR-14 の母集団恒等式が ExclusionCounts の7バケットに3つの互いに素な母集団(窓・コーパス行/シャード・レビューブロック)を混在させているため文字どおりには実装不能/曖昧 — NFR-5 の落ちる実証対象でもあるテスト可能な契約違反として BLOCKER。

### Findings

- BLOCKER | business-rules.md:20; business-logic-model.md:65-66; domain-entities.md:17 — BR-14 の恒等式「統計母集団 + 除外件数合計 = 全窓数」は、ExclusionCounts が窓レベル(unmatchedStart/orphanComplete/unclosedIdle/zeroSecond)・コーパスレベル(brokenLine/unreadableShard)・レビューブロックレベル(unparseableReviewHeading)の互いに素な母集団を平坦な7フィールドへ混在させているため文字どおりには数学的に不成立 — brokenLine/unreadableShard は窓として構成されない行/シャードの計数、unmatchedStart/orphanComplete は窓未満のイベント計数、unparseableReviewHeading は独立ドメイン。恒等式が成立するのは実質 unclosedIdle と zeroSecond のみで、「全窓数」の定義と恒等式に参加する部分集合の明示が必要。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T22:12:11Z
- **Iteration:** 2
- **Scope decision:** none

BR-14 の母集団恒等式は ExclusionCounts の3グループ層別再構成と恒等 W の「構成済み窓数」明確化で数学的に成立するようになり、domain-entities を正本に3成果物の記述が一致、FR-2c/FR-2 AC vi との整合も確認 — iteration 1 の BLOCKER は解消。残るは zeroSecond/unclosedIdle の相互排他という縁辺ケースのみで実装・テスト段対処可能な FOLLOW-UP。

### Findings

- FOLLOW-UP | domain-entities.md:17-31; business-logic-model.md:38,44-46,66 — zeroSecond(A2)と unclosedIdle(A3)は別段で独立判定されるため、両条件が同一窓で同時成立する縁辺事例の相互排他性・優先順位が未規定 — 二重計数されると恒等 W の RHS が超過し破綻する。実装側でバケット判定の排他化(判定順序の固定・if-else 排他)を保証し、t481/t482 と NFR-5 の落ちる実証で両条件同時成立 fixture を明示カバーすることを推奨。
