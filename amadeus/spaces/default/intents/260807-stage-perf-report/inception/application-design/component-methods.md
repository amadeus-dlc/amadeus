# Component Methods — 260807-stage-perf-report

上流入力(consumes 全数): requirements(AC を各シグネチャの検証面として消費)、architecture(codekb — レコード形の実測をシグネチャ型の根拠として消費)、component-inventory(codekb — 既習シグネチャ様式の参照に消費)

型は functional-domain-modeling-ts スタイル(判別 union・parse-don't-validate)。主要シグネチャ:

**エラー処理方針(per-component)**: FS 層(C1/C4)は読取失敗で例外を投げず、可算の失敗(読取不能シャード・parse 不能行・parse 不能見出し)を戻り値のカウンタ/バケットへ集約する(ADR-6)。純関数層(C2〜C8)は例外を投げず、不正・不整合な入力レコードを ExclusionCounts の該当バケットへ振り分ける(空入力の統計は NaN 伝播 — ADR-5)。C9 CliShell のみが失敗を exit code に変換する: `parseArgs` は `Result` 型で使用誤りを表現(→ exit 2)、実行時失敗(corpus 全滅等)は exit 1、正常は exit 0(FR-7b)。

## C1 CorpusScanner

- `scanCorpus(spaceRoot: string): ScannedCorpus` — `{ records: AttributedRecord[]; unreadableShardCount: number; brokenLineCount: number; shardCount: number; lineCount: number }`
- `AttributedRecord = { intent: string; record: JournalRecord }`(intent は spaceRoot 相対パス `intents/<intent>/audit/*.jsonl` の第 2 セグメント由来 — FR-1a、components.md C1 と同一基準)

## C2 WindowBuilder

- `buildWindows(records: readonly AttributedRecord[]): { windows: StageWindow[]; buckets: ExclusionCounts }`
- `StageWindow = { intent; stage; startedAt; completedAt; rawSeconds }`

## C3 IdleSubtractor

- `subtractIdle(windows, records): { measured: MeasuredWindow[]; buckets: ExclusionCounts }`
- `MeasuredWindow = StageWindow & { netSeconds: number; idleSeconds: number }`(netSeconds >= 0 を型不変条件としてコンストラクタで enforce)

## C4 ReviewBlockCollector

- `collectReviewBlocks(intentsRoot: string): { blocks: ReviewBlock[]; unparseableHeadingCount: number }`
- `ReviewBlock = { intent; stagePath; unit: string | null; iteration: number }`

## C5 SensorTallier

- `tallySensors(records): SensorTally[]` — `{ stageSlug; fired; passed; failed; failedRate }`

## C6 ModelAttributor

- `attributeModels(records): { byModel: Map<string, number>; byModelSource: Map<string, number>; unresolvedCount: number; attributableCount: number; totalCount: number }`

## C7 StatsComposer

- `composeStageStats(measured: readonly MeasuredWindow[]): StageStat[]` — `{ stage; n; rawMedian; netMean; netMedian; netP95 }`
- `nearestRankP95(values: readonly number[]): number`(鏡映実装 — 空入力は NaN)

## C8 Renderer

- `renderMarkdown(report: StageStatsReport): string` / `renderCsv(...)` / `serializeJson(...)` — いずれも純関数、入力同一なら出力 byte 同一(FR-6 AC i)
- `StageStatsReport` は measurement ref(shardCount / lineCount / ExclusionCounts 全バケット)と仮説明記文言(FR-6c 固定文字列)を必須フィールドで持つ — 欠落を型で表現不能にする

## C9 CliShell

- `parseArgs(argv): Result<CliOptions, UsageError>` — `CliOptions = { projectDir?; space?; format: "markdown" | "csv" | "json" }`
- `main(argv: readonly string[]): number` — 0/1/2(FR-7b AC ii の 3 入力実測対象)
