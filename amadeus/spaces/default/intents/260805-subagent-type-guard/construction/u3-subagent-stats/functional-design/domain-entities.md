# U3 subagent-stats — Domain Entities

**上流入力(consumes 全数)**: `unit-of-work`(U3 の範囲 = C-7)/ `unit-of-work-story-map`(監査ジャーニー)/ `requirements`(FR-4・AC-3/AC-6 の語彙)/ `components`(C-7 責務)/ `component-methods`(CLI 契約正本)/ `services`(read-only 契約)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`。スタイル: functional-domain-modeling-ts。

## エンティティ(型)一覧

### SubagentAuditRecord(パース済み audit 行 — compose の入力エンティティ)

```ts
export interface SubagentAuditRecord {
  readonly event: "SUBAGENT_COMPLETED" | "SUBAGENT_STARTED"; // .attributes.Event の等値判定済み
  readonly agentType: string | undefined;     // .attributes["Agent Type"](欠落は undefined のまま運ぶ)
  readonly typeVerdict: string | undefined;   // .attributes["Type Verdict"](新行のみ)
  readonly model: string | undefined;         // .attributes["Model"]
  readonly modelSource: string | undefined;   // .attributes["Model Source"]
}
```

### ScannedAudit(走査結果 — シャード読取フェーズの出力・compose の入力)

```ts
export interface ScannedAudit {
  readonly shardCount: number;                        // 読めたシャード数
  readonly unreadableShardCount: number;              // 実在するが読取失敗したシャード数(fail-loud — path は stderr へ)
  readonly parseSkippedCount: number;                 // JSON parse 不能で skip した行数(BR-U3-2)
  readonly records: readonly SubagentAuditRecord[];   // SUBAGENT_* 行のみ
}
```

> 訂正注記(nfr-design §12a iteration 1 の cross-stage 是正、2026-08-06): `unreadableShardCount` を追加 — business-logic-model のエラーモデル表に追加した「シャード実在下の読取失敗(fail-loud)」クラスの計上先。

### SubagentStatsReport(集計結果 — first-class collection)

```ts
export interface SubagentStatsReport {
  readonly measuredAt: string;          // ISO 8601 — 測定時刻(FR-4b)
  readonly scanScope: string;           // 走査対象の可視化 — space 名 + 走査 glob(FR-4b の測定 ref 実質)
  readonly shardCount: number;          // 読めたシャード数(測定 ref)
  readonly unreadableShardCount: number;// 注記: 読取失敗シャード数(fail-loud — 正なら exit 非0)
  readonly parseSkippedCount: number;   // 注記: parse skip 件数(BR-U3-5 第5節 — 0 でも出す)
  readonly verdictMismatchCount: number;// 注記: 属性 verdict と再分類の食い違い件数(BR-U3-3)
  readonly allowedSetWarnings: readonly string[]; // 許可集合解決の warnings(件数を注記へ、本文は stderr — BR-U3-5)
  readonly completedTotal: number;      // SUBAGENT_COMPLETED 総数
  readonly startedTotal: number;        // SUBAGENT_STARTED 総数(存在すれば併記)
  readonly byVerdict: ReadonlyMap<TypeVerdict, number>;          // verdict 別
  readonly byType: readonly TypeTallyRow[];                       // 型別ランキング(降順)
  readonly byModel: ReadonlyMap<string, number>;                  // model 別
  readonly byModelSource: ReadonlyMap<string, number>;            // Model Source 別(pin 実効性の監査 — story-map trace)
  readonly unresolvedModelCount: number; // Model 属性なし = unresolved(ADR-5 の読み side)
}
export interface TypeTallyRow {
  readonly agentType: string;
  readonly verdict: TypeVerdict;
  readonly count: number;
}
```

### seam シグネチャ(BR-U3-8 の正本 — §12a iteration 1 の是正で確定)

```ts
export function composeStatsReport(
  scanned: ScannedAudit,
  resolution: AllowedSetResolution,  // U1 の resolveAllowedAgentTypes の戻り(warnings 含む)
  measuredAt: string,                // 呼び手が時刻を注入(compose は純関数のまま)
  scanScope: string,                 // 呼び手が走査対象(space + glob)を注入
): SubagentStatsReport;
export function renderStatsText(report: SubagentStatsReport): string;
```

シャード読取(main 側の I/O)と集計(compose の純関数)の境界を型で固定する — `measuredAt` / `shardCount` / `scanScope` は行集合から導出不能なため走査フェーズが供給する。

### 分類の再利用(U1 との契約)

集計時分類は U1 の `classifyAgentType` を import して行う — `Type Verdict` 属性を持つ新行はその値を採り、属性の無い**旧行は集計時に C-2 を適用**して分類する(移行作業ゼロ — NFR-4)。属性値と再分類が食い違う行は「記録時の許可集合と現在の許可集合の差」として `byVerdict` は**属性値を優先**し、差分件数を注記行に出す(監査記録の改変をしない — append-only の読み side 尊重)。

## 不変条件

1. 読み取り専用 — ファイル書込・state 変更・audit 追記を一切しない(read-only 分類)
2. イベント判定は `.attributes.Event` の**等値比較**(RE 手法メモ — grep 部分一致は WORKFLOW_STARTED の Request 本文で偽陽性)
3. `byVerdict` の総和 = `completedTotal`(全域分類 — 分類不能な行を作らない)。全域性の担保: `Agent Type` 欠落・空・空白のみの旧行は `normalizeAgentType` と同じ trim + `"unknown"` fallback を集計側でも適用してから分類する(live payload 前提の C-2 契約を永続行へ明示的に延長 — BR-U3-3)
4. `unresolvedModelCount + Σ byModel = completedTotal`(model の全数勘定 — Model 軸は常に全域)。`byModelSource` は書込側契約(U2 の書込規則 = AD component-methods:61 の「resolved なら `"Model"` / `"Model Source"` を追加」)の下では同値だが、**対欠落行(Model のみで Model Source 欠落)を観測した場合は Model 側のみ計上し、`Σ byModelSource < completedTotal − unresolvedModelCount` になりうる**(不変条件でなく縮退許容)。この差分 `completedTotal − unresolvedModelCount − Σ byModelSource` はレポートの既存フィールドから導出可能なため、正のとき `renderStatsText` が注記行「Model/Model Source 対欠落 n 件(上流契約違反の兆候)」を出す — 専用フィールドは追加せず(導出値)、`verdictMismatchCount`(verdict 軸の別事象)へも流用しない
5. 出力の全数値は実際に読んだ行からの計数のみ(検証劇場 Forbidden — ハードコード・推定値なし)

## 既存エンティティとの関係

- 入力: `amadeus/spaces/<space>/intents/*/audit/*.jsonl`(既存 audit シャード様式 — schemaVersion 2 の attributes ブロック)
- `composeSubagentLifetimes` は**使わない**(ADR-6 — STARTED 実質0件の現状で空になる)
- 既存 audit 読取 CLI(`amadeus-norm-metrics.ts` 等)の引数様式(`--project-dir` / `--json`)に倣う
