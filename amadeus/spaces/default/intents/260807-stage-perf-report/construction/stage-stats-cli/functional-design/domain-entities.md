# Domain Entities — stage-stats-cli(functional-design)

上流入力(consumes 全数): unit-of-work(U1 の境界・kind=service を型スコープの正本として消費)、unit-of-work-story-map(FR→C 写像を型の責務帰属に消費)、requirements(FR の AC を型不変条件の導出元として消費)、components(C1〜C9 の責務分割を型の所有者決定に消費)、component-methods(主要シグネチャを型定義の正本として消費)、services(単一 CLI サービス構成を型の集約単位として消費)

型スタイル: functional-domain-modeling-ts(judgment union・ブランド型は正しさに効く箇所のみ・parse-don't-validate)。全型は `amadeus-stage-stats.ts` 内に閉じる(単一ファイル、ADR-1)。

## 入力層(C1 所有)

- `AttributedRecord = { intent: string; record: JournalRecord }` — `JournalRecord` は `amadeus-journal.ts` の export をそのまま消費(第 3 の正規化型を作らない — ADR-2)。`intent` は spaceRoot 相対パス `intents/<intent>/audit/*.jsonl` の第 2 セグメント由来(FR-1a)
- `ScannedCorpus = { records: AttributedRecord[]; unreadableShardCount: number; brokenLineCount: number; shardCount: number; lineCount: number }` — カウンタは measurement ref(FR-6b)と fail-loud 判定(FR-1c)の両方が消費

## 窓・計測層(C2/C3 所有)

- `StageWindow = { intent: string; stage: string; startedAt: string; completedAt: string; rawSeconds: number }` — `STAGE_STARTED`→`STAGE_COMPLETED` の対応付け結果(FR-2a)。秒粒度(FR-2d)
- `IdleInterval = { kind: "awaiting" | "parked" | "session-gap"; start: string; end: string }` — idle 3 種(FR-2b)。窓へのクリップ・重複マージ後にのみ減算に使う
- `MeasuredWindow = StageWindow & { netSeconds: number; idleSeconds: number }` — **型不変条件: `netSeconds >= 0`**(コンストラクタ関数で enforce — FR-2 AC iv の負値ガード)。0 秒窓(rawSeconds === 0)は分解能外として件数報告対象(FR-2d)
- `ExclusionCounts` — 閉集合の判別バケット(ADR-6)。8 バケットは**3 つの互いに素な母集団**へ層別してネストする(平坦フィールドは恒等式の混同を生むため不採用 — §12a iteration 1 是正。第 8 バケットは下記の明示改訂 R-1):

  ```
  ExclusionCounts = {
    corpus: { brokenLine: number; unreadableShard: number };        // A1 走査段 — 窓になる前の行/シャード
    windowing: {
      unmatchedStart: number;    // 窓として成立しなかった START イベント(窓数に含まれない)
      orphanComplete: number;    // 起点なし COMPLETED イベント(同上)
      unclosedIdle: number;      // 構成済み窓のうち net 統計から除外した窓
      zeroSecond: number;        // 構成済み窓のうち分解能外として除外した窓
      invalidTimestamp: number;  // parse 不能タイムスタンプのイベント(窓化前に除外 — 明示改訂 R-1)
    };
    review: { unparseableReviewHeading: number };                    // A4 record 走査段 — 窓・監査と独立
  }
  ```

  全 **8** バケットの件数報告義務(FR-2c)は不変。**恒等式に参加するのは windowing.unclosedIdle / windowing.zeroSecond のみ**(下記「母集団恒等」)。グループ追加・バケット追加時はレンダラの網羅がコンパイル境界で落ちる構造(報告忘れの型防止)

  **明示改訂 R-1(invalidTimestamp の追加 — code-generation 段の PR レビュー指摘への対応)**: 当初設計は 7 バケットの閉集合だったが、`Date.parse` が NaN を返すタイムスタンプが `rawSeconds` を経て net 統計(mean/median/p95)を NaN 汚染し、しかもどの既存バケットにも記録されない欠陥が PR #2448 のレビューで指摘された。ADR-6 の「黙示既定での救済禁止・除外は必ず件数報告」という原則の直接適用として第 8 バケットを新設する。追加はバケット閉集合の**拡張**であり、既存 7 バケットの意味論・恒等式の参加集合・報告義務のいずれも変更しない。`buildWindows` は窓化前に、`indexIdle` は区間構成前に計数して除外する(NaN が下流の算術へ流れない)

- **母集団恒等(層別 — BR-14 の正本)**:
  - 恒等 W(窓): `構成済み窓数(StageWindow[] の総数) = net 統計母集団数 + unclosedIdle + zeroSecond` — unmatchedStart / orphanComplete / invalidTimestamp は窓として構成されなかった**イベント**の計数であり左辺にも右辺にも参加しない
  - 恒等 M(モデル帰属): `attributableCount + unresolvedCount = totalCount`
  - corpus / review グループは恒等式を持たない独立カウンタ(報告のみ)

## 集計層(C4/C5/C6/C7 所有)

- `ReviewBlock = { intent: string; stagePath: string; unit: string | null; iteration: number }` — `{unit-name}` リテラルはそのまま保持(FR-3b、捏造補正しない)
- `SensorTally = { stageSlug: string; fired: number; passed: number; failed: number; failedRate: number }` — 集計キーは **`Stage slug`** 属性のみ(FR-4a、`Stage` キーとの型分離)
- `ModelAttribution = { byModel: Map<string, number>; byModelSource: Map<string, number>; unresolvedCount: number; attributableCount: number; totalCount: number }` — UNKNOWN は fail-closed に可視(FR-5a)。恒等: `attributableCount + unresolvedCount === totalCount`
- `StageStat = { stage: string; n: number; rawMedian: number; netMean: number; netMedian: number; netP95: number }` — p95 は nearest-rank・空入力 NaN 伝播(FR-6a)

## 出力層(C8/C9 所有)

- `StageStatsReport` — measurement ref(shardCount / lineCount / ExclusionCounts 全バケット)と仮説明記文言(FR-6c 固定文字列)を**必須フィールド**で持つ(欠落を型で表現不能に — 検証劇場 Forbidden の型面予防)
- `CliOptions = { projectDir?: string; space?: string; format: "markdown" | "csv" | "json" }` — parse-don't-validate(未知フラグは `UsageError`)
- `UsageError = { message: string }` — C9 のみが exit 2 へ変換
- `Result<T, E>` — parseArgs の戻り(判別 union、既習形)

## ライフサイクル

`scanCorpus`(FS)→ `AttributedRecord[]` → `buildWindows` → `StageWindow[]` + バケット → `subtractIdle` → `MeasuredWindow[]` + バケット → `composeStageStats` / `tallySensors` / `attributeModels` / `collectReviewBlocks` → `StageStatsReport`(単一の集約点)→ `render*`(純関数)→ C9 が exit code 決定。全段で共有可変状態なし・一方向。
