# re-scan record — 260807-stage-perf-report

本ファイルは intent `260807-stage-perf-report`（scope `self-feature`、Brownfield、Depth Standard、Test Strategy Comprehensive）の Reverse Engineering における**全数列挙の正本**である。共有成果物の現在断面は本ファイルを要約したものであり、件数・file:line の疑義は本ファイルを参照して解決する。

## 実行メタデータ

- Date: `2026-08-07`
- Base commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（前回 RE の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い HEAD 祖先かつ距離最小のものを選定。`git merge-base --is-ancestor b8e3e664f HEAD` exit 0 を実測。距離 **12 commits**）
- Observed commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（= 本 worktree HEAD、`git rev-parse HEAD` で実測。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- 区間規模: **12 commits / 108 files changed（+5711 / −200）**。`amadeus/` record を除く実質変更は **29 files**
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: [Issue #2405](https://github.com/amadeus-dlc/amadeus/issues/2405) v2 — 監査シャード（全 intent 横断）と record から**ステージ別性能実測レポート**を決定的に生成する read-only CLI の追加。集計軸は (a) ステージ所要時間（`STAGE_STARTED`→`STAGE_COMPLETED`、**idle/承認待ち減算後の実作業時間**）、(b) §12a レビューイテレーション数（record の `## Review — Iteration N` ブロック）、(c) センサー FAILED 率（`SENSOR_FIRED`/`PASSED`/`FAILED` × stage slug）、(d) モデル帰属（#2279 の `Model` / `Model Source` 属性、forward-looking）
- Scan mode: **DIFFERENTIAL refresh + xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode` / 単発 Issue への拡張 `c1-xrev-single-issue`）。#2405 のクロスレビュー2名（reviewer-1 / reviewer-2、いずれも CONFIRMED_WITH_REFINEMENTS）の verdict を Developer scan の一次入力とし、Architect が患部座標を observed 断面の verbatim 実読で二重化した
- Verification: 本 RE では新規テストを実行していない（RE ステージのため）。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。検証は observed 断面での `git rev-parse` / `git merge-base --is-ancestor` / `git diff --name-only` / `grep` / `find` / `sed` の実測と、患部の verbatim 直読による

### 行番号引用の currency

クロスレビューの対象 SHA は `75a1c198d`（#2388 plugin opt-in）である。`cid:reverse-engineering:upstream-cite-reresolve-on-shift` および `E-OBB5-RES13` が定める免除条件（「当該引用が observed と一致する SHA で検証済みであること」）は文字どおりには満たさない — 対象 SHA と observed が異なるためである。

そこで**区間実測により currency を確定した**。患部ファイル全数について `git diff --name-only` を `{b8e3e664f..HEAD}` と `{75a1c198d..HEAD}` の**両区間**で取り、いずれも**空出力**であることを確認した:

| 患部ファイル | `b8e3e664f..HEAD` | `75a1c198d..HEAD` |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-runtime.ts` | 無変更 | 無変更 |
| `packages/framework/core/tools/amadeus-subagent-stats.ts` | 無変更 | 無変更 |
| `packages/framework/core/tools/amadeus-reviewer-runtime.ts` | 無変更 | 無変更 |
| `packages/framework/core/otel/event-registry.ts` | 無変更 | 無変更 |
| `packages/framework/core/tools/amadeus-observability.ts` | 無変更 | 無変更 |
| `.claude/skills/amadeus-session-cost/SKILL.md` | 無変更 | 無変更 |

**したがって両 verdict の全 file:line 引用は observed 断面で同一に解決する。** これは免除の適用ではなく、区間実測による currency の確定である。Architect は推論に依らず、下記 § 2〜§ 6 の主要座標を observed で verbatim 再実読して二重化した。

`packages/framework/core/knowledge/amadeus-shared/audit-format.md` は区間内で**変更されている**が、変更範囲は advisory-choice ledger 節（schema-2 provenance union、`recover-schema-1` verb）に限られ、stage / sensor / session イベントの記述は移動していない。

### ⚠️ 動いたのはコードではなくデータ

区間が #2405 へ与えた実質的影響は**2つの数値**だけであり、いずれも監査シャードのデータ増加に由来する。コード面の変更ではない。詳細は § 7 の D2 / § 1 を参照。

## 1. 区間の全数（b8e3e664f..HEAD、12 commits）

| クラス | コミット |
| --- | --- |
| フレームワーク修正 | `d98dd9039`（#2393 degrade per-unit gate）、`9d238fd91`（#2392 advisory schema-1 recovery）、`edfee5818`（#2389）/ `28bc42353`（#2387）no-silent-drop |
| メトリクススナップショット（自動 PR） | `0b63810b8`、`091f221f0`、`1b08bd943`、`f425f705c`、`65658e0cf`、`5c869bcb2` |
| plugin opt-in | `75a1c198d`（#2388）— **クロスレビューの対象 SHA** |
| record sync | `4a3da7d62`（#2404）= observed |

### 陳腐化した数値2件（要件段へ伝播させる前に訂正すること）

**(a) `Model` 属性を持つ監査行: 2 → 10。** 両レビュアーは `75a1c198d` 断面で 2 行を実測した。observed では **10 行**である（全 222 シャードの全数走査で実測）。増分 8 行は record-sync コミット `4a3da7d62` が `260807-failclosed-recovery-path/audit/` を取り込んだことによる:

```
SUBAGENT_STARTED    260805-subagent-type-guard        Model="sonnet" Source="pin"
SUBAGENT_COMPLETED  260805-subagent-type-guard        Model="sonnet" Source="pin"
SUBAGENT_COMPLETED  260807-failclosed-recovery-path   Model="opus"   Source="pin"
SUBAGENT_COMPLETED  260807-failclosed-recovery-path   Model="sonnet" Source="pin"   （×6）
```

**モデルの多様性が生じた**（`opus` + `sonnet`）— `75a1c198d` 断面では単一値だった。これは「遡及的にはほぼ空」という結論を覆さない（`SUBAGENT_COMPLETED` 全体に対し 10 行）が、#2279 の蓄積が実際に走り始めていることを確定させる。すなわち **Issue 本文の「監査実記録は 2 行のみ」は observed では陳腐化している。**

`SUBAGENT_COMPLETED` の総数は **移動値**である。Developer scan 時点 **7,273**、Architect 再計測時点 **7,274**（本 RE セッション自身が監査へ追記するため）。Issue 本文の「7,151 件」はさらに古い。**要件段は転記せず再計測すること**（`cid:requirements-analysis:numbers-from-command-output-only`）。

**(b) 使用済み最大テスト番号: t465 → t480。** 前回 RE の記録（`re-scans/260807-failclosed-recovery-path.md:111,300`）は「使用済み最大 = t465 … 新規は t466 以降」とするが**陳腐化している**。区間で `t466` / `t470` / `t480`（t480 は unit と integration の2ファイル）が着地した。`find tests -name 't[0-9]*'` で最大は **t480** を実測。**本 intent の新規テストは t481 以降を予約する**（`cid:code-generation:swarm-test-number-reservation`）。

## 2. 監査イベント面

### 2世代のスキーマ、1つのエンベロープ

`packages/framework/core/tools/amadeus-journal.ts:30,34-35`:

```ts
export const JOURNAL_SCHEMA_VERSION = 1;
export const JOURNAL_SCHEMA_VERSION_V2 = 2;
export const JOURNAL_SCHEMA_VERSION_MAX = JOURNAL_SCHEMA_VERSION_V2;
```

`:28-29` のコメントは読み手にとって load-bearing である（verbatim）:

> `// v1 is the switchover wire format still produced by the live writers`
> `// (amadeus-audit.ts / amadeus-state.ts); keep this constant at 1 for them.`

**v1 は単なるレガシーではない** — 一部の書き手は現在も v1 で新規行を書く。読み手は「v1 = 過去 / v2 = 現在」と時系列で分けてはならない。

実 v1 行（`260706-amadeus-grilling/audit/j5ik2o-mac-studio-lan-d4a945003a7f.jsonl`）:

```json
{"schemaVersion":1,"seq":4,"cloneId":"d4a945003a7f","intentId":"intents","timestamp":"2026-07-06T17:10:08Z","heading":"Stage Start","event":"STAGE_STARTED","fields":{"Stage":"workspace-scaffold","Agent":"orchestrator"}}
```

実 v2 行（`260807-failclosed-recovery-path/audit/j5ik2o-mac-studio-lan-cd7076ca8be1.jsonl`）:

```json
{"schemaVersion":2,"eventId":"055888ff-…","seq":5,"timestamp":"2026-08-07T03:15:01Z","eventName":"amadeus.stage.started","attributes":{"Agent":"orchestrator","Event":"STAGE_STARTED","Stage":"workspace-scaffold"},"intentId":"260807-failclosed-recovery-path","space":"default","cloneId":"cd7076ca8be1","traceId":null,"spanId":null,"traceFlags":0,"idempotencyKey":"59902f8a-…","canonical":true}
```

v2 行は **v1 の監査イベント名を `attributes.Event` へ刻印**し、`eventName` は OTel 名を運ぶ。したがって両スキーマとも `Stage` を同一キーで露出し、`Event` が両スキーマで信頼できる判別子になる。この正規化規約は `amadeus-journal.ts:113-129` に文書化されている。

### イベントレジストリ（全件 `durability: "canonical"`）

| イベント | file:line | requiredAttributes | 主な optional |
| --- | --- | --- | --- |
| `amadeus.stage.started` | `event-registry.ts:317` | `["Stage", "Agent"]` | `Workflow`（`--single` の合成 id） |
| `amadeus.stage.completed` | `:345` | `["Stage", "Details"]` | `Artifacts`、`Transaction Id`、`Workflow`、`Completion Instance` |
| `amadeus.stage.awaiting.approval` | `:327` | `["Stage"]` | `Artifacts`、`Details`、`Recovered`、`Transaction Id` |
| `amadeus.stage.revising` | `:336` | `["Stage", "Revision count"]` | — |
| `amadeus.gate.approved` | `:511` | `["Stage"]` | `User Input`、`Grant Id`、`Swarm batch` |
| `amadeus.gate.rejected` | `:520` | `["Stage"]` | `Feedback`、`Recovered` |
| `amadeus.workflow.parked` | `:119` | `["Stage"]` | `Timestamp` |
| `amadeus.workflow.unparked` | `:128` | **`[]`** | `Timestamp` |
| `amadeus.session.started` | `:382` | `["Source"]` | — |
| `amadeus.session.ended` | `:409` | `["Reason"]` | — |
| `amadeus.session.resumed` | `:391` | `["Source"]` | — |
| `amadeus.human.turn` | `:418` | **`[]`** | `Presence Reservation Id` |
| `amadeus.sensor.fired` | `:849` | `["Fire id","Sensor ID","Stage slug","Output path"]` | — |
| `amadeus.sensor.passed` | `:858` | 上記 + `["Duration ms"]` | `Note` |
| `amadeus.sensor.failed` | `:867` | 上記 + `["Detail path","Findings count"]` | — |

全 17 行の座標は Architect が observed 断面で `sed -n` により逐語再確認した。

設計に効く3つの事実:

1. **`Harness` を宣言するイベントは存在しない。** `Model` / `Model Source` は subagent イベント（`:616` / `:629`）にのみ現れる（レジストリ全域 grep で確定）。ハーネス軸の集計は監査からは組めない。
2. **`WORKFLOW_UNPARKED` と `HUMAN_TURN` は `Stage` を運ばない**（requiredAttributes が `[]`）。idle 減算アルゴリズムはこれらを stage キーではなく **intent 内の時刻順序**で帰属させる必要がある。
3. **`SENSOR_*` は `Stage slug` を使い、stage ライフサイクル系は `Stage` を使う。** 別キーである。正規化層はこの2つを混同してはならない。

### emit サイト

- `STAGE_STARTED` — `amadeus-state.ts:2335`（`{Stage: nextSlug, Agent: nextStage.lead_agent}`）、`amadeus-jump.ts:619`（jump 経路）、`amadeus-orchestrate.ts:4633`（`--single`、合成 workflow id）
- `STAGE_COMPLETED` — `amadeus-state.ts:3431` と `:2165`、`amadeus-orchestrate.ts:4646`（`--single`）
- `STAGE_AWAITING_APPROVAL` — `amadeus-state.ts:2877, 4064, 4138`
- `GATE_APPROVED` — `amadeus-state.ts:3420`、`amadeus-bolt.ts:1142`

**アルゴリズムが織り込むべき構造事実:** `GATE_APPROVED`（`:3420`）と `STAGE_COMPLETED`（`:3431`）は**同一 try ブロック内**で emit される（Architect が `sed -n '3416,3433p'` で逐語確認）。承認と完了はほぼ同時刻であり、したがって idle 区間 `STAGE_AWAITING_APPROVAL → GATE_APPROVED` はゲート付きステージの窓の**末尾**に位置する。窓の中間ではない。

### タイムスタンプ粒度

`amadeus-lib.ts:7740-7742`（verbatim）:

```ts
export function isoTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
```

**ミリ秒は書き込み時点で捨てられている。** 秒未満のステージは構造的に解像不能であり、#2405 の「解像限界を注記する」完了条件はこの事実に接地している。

### `intentId` の degradation（observed で再計測）

```
intentId==="intents" の v1 行: 86,744 / 96,269（90.1%）
それらの行を保持する distinct な intent ディレクトリ: 95
```

reviewer-2 の数値と完全一致する。**パス基準の帰属は必須**であり、かつ機能する — degraded な行は 95 の実 intent ディレクトリへ散っており、パスから intent を復元できる。

## 3. 既存の読み手（再利用面）

### 3a. `amadeus-journal.ts` — 誰も使っていない正規化層

設計上もっとも重要な発見である。**スキーマ非依存の正規化リーダーが既に core に存在し、`amadeus-subagent-stats.ts` はそれを使っていない。**

```ts
// amadeus-journal.ts:130
export function journalRecordField(record: JournalRecord, fieldName: string): string | null
```

doc コメント（`:113-129`）は逐語で次のように述べる: *"the NormalizedJournalRecord view (domain-entities.md) the tool readers consume **so they never branch on the schema version**"*。

export 済みの面（Architect が `sed -n` で全件座標を再確認）:

| 関数 | 行 |
| --- | --- |
| `isJournalEntryV2` | `:103` |
| `journalRecordKey` | `:109` |
| `journalRecordField` | `:130` |
| `parseJournalLine` | `:481` |
| `splitJournalLines` | `:501` |
| `readJournalRecords` | `:534` |
| `mergeShards` | `:612` |

`.claude/tools/amadeus-journal.ts` が self-install ツリーに実在するため、ハーネスへも出荷される。

**設計選択肢として要件段へ渡す（Architect の読みであり実測ではない）:** 新 CLI は第3の正規化を再実装するのではなく `journalRecordField` を消費しうる。これは #2405 の完了条件「`amadeus-subagent-stats.ts` との関係（拡張 or 新設・共通化する正規化層）を設計成果物で明示する」への直接の回答候補である — **共通化する正規化層は既に core にある**かもしれず、その場合「層を共有する」が「拡張」「新設」いずれよりも安い。ただし反対圧力がある（§ 3b の依存方向の明示的裁定）。**これは設計判断であり、import 可能性だけで機械的に決まる事柄ではない。**

### 3b. `amadeus-subagent-stats.ts`（468 行）— 形は再利用可、コードは再利用不可

2 スキーマ正規化はクロスレビューの主張どおり `:281-285` に実在する（verbatim 確認済み）:

```ts
const v2 = raw.schemaVersion === 2;
const fields = objectOrNull(v2 ? raw.attributes : raw.fields) ?? undefined;
const event = v2 ? fields?.Event : raw.event;
if (event !== "SUBAGENT_COMPLETED" && event !== "SUBAGENT_STARTED") return null;
```

**再利用可能性の判定 — 大半が file-private:**

| 面 | 行 | export | 汎用性 |
| --- | --- | --- | --- |
| `recordFromLine` | `:278` | **なし** | 正規化そのものが import 不能 |
| `scanAuditCorpus` | `:345` | あり | subagent レコードに hard-wire（`ScannedAudit.records: readonly SubagentAuditRecord[]`）。イベント型に対して汎用ではない |
| `composeStatsReport` | `:105` | あり | subagent 固有の純関数 |
| `renderStatsText` | `:191` | あり | 同上 |
| `serializeStatsReport` | `:237` | あり | 同上 |

**依存の明示的禁止**（`:21-23`、verbatim）:

> `// This module deliberately does NOT import amadeus-lib.ts (the FD fixes the`
> `// dependency direction stats -> observability only); the two small path`
> `// idioms it needs are mirrored locally.`

`resolveProjectDirLocal`（`:377`）/ `activeSpaceLocal`（`:390`）はローカルに再実装されている。**この裁定済みの依存方向は § 3a の共有案への反対圧力である。**

**逐語で継承する価値のある契約:**

- **UNKNOWN / ADR-5**（`:141-148`）— 非空の `Model` のみを計数し、それ以外は `unresolvedModelCount` を増やす。コメント: *"absence is the record of absence"*
- **no-silent-drop**（`:323-340`）— 行ごとに `parseSkipped` を計数し、決して隠さない。`continue` が *"the explicit terminal the no-silent-drop rule requires"*
- **穴があれば loud に落ちる**（`:463-465`）— `return scanned.unreadableShardCount > 0 ? 1 : 0`
- **測定 ref を先頭に**（`:192-197`）— 出力は measured at / scan scope / shards / events で始まる
- **レンダー時点のサニタイズ**（`:178-187`）— 監査値は信頼境界の外。`sanitizeAdvisoryValue` はレンダー時のみ適用し、compose と `--json` は値を verbatim に保つ

### 3c. `amadeus-runtime.ts summary` — 構造的に遡及不能

`summarize()`（`:1067-1070`、verbatim）:

```ts
const path = runtimeGraphPath(projectDir);
if (!existsSync(path)) return null;
const graph: RuntimeGraph = JSON.parse(readFileSync(path, "utf-8"));
```

ヘッダ `:982-984`（verbatim）: *"Reads the materialised snapshot only — **never re-walks audit**"*。

`RuntimeSummary` の形（`:1019-1044`）: `workflow_id` / `scope` / `started_at` / `duration_minutes` / `stages{total,approved,failed,pending}` / `by_phase` / `memory{…}` / `sensors{total,passed,failed,budget_override,incomplete}` / `learnings{…}`。**per-stage の所要時間なし、モデルなし、レビューイテレーションなし。**

遡及は構造的に不可能である: `.gitignore:71` = `amadeus/spaces/*/intents/*/runtime-graph.json`（Architect が `sed -n '71p'` で逐語確認）、`git ls-files | grep -c runtime-graph.json` → **0**。スナップショットはバージョン管理されておらず、過去の intent のグラフは存在しない。

### 3d. `amadeus-session-cost` SKILL の契約

`.claude/skills/amadeus-session-cost/SKILL.md` frontmatter: `classification: read-only`、本文は *"sourced entirely from `amadeus-runtime.ts summary`. Never mutates workflow state, never emits audit events, never writes files."* および *"This skill does **no counting of its own**. … If a number isn't in the tool's output, this skill does not invent it."*

すなわち § 3c の薄いラッパであり、単一ワークフロー限定。**#2405 の横断集計をこの経路で満たすことはできない。**

### 3e. `amadeus-observability.ts` — 書き手 seam、名前衝突を確認

384 行。**`import.meta.main` なし、argv 処理なし、サブコマンドなし**（`process.argv|subcommand|import.meta.main` の grep で 0 hit）。export は全てライブラリ関数（`appendTelemetryEvent:244`、`observe:309`、`observeSubprocess:362` ほか）。

ヘッダ `:1-19` の契約: `observability.enabled` による opt-in、machine-local な `<record>/.amadeus-otel/buffer-<clone>.jsonl` への追記、そして **fail-open** — *"a buffer write failure never throws into the caller"*。

提案されている読み手は **fail-closed** である。**契約が正反対であり、reviewer-1 の「この名前空間は避けよ」は observed でも成立する。**

## 4. レビューイテレーションブロック

書き手は `amadeus-reviewer-runtime.ts:96-97`（verbatim 確認済み）:

```ts
const REVIEW_MARKER = (iteration: number): string =>
  `## Review — Iteration ${iteration}`;
```

（em-dash U+2014、両側に半角スペース。）`:629`（書き込み）と `:659`（冪等性検査）で使用される。

ブロック本体（`reviewBlock`、`:618-644`）の emit 形式:

```
## Review — Iteration N

- **Verdict:** READY|NOT-READY
- **Reviewer:** <reviewer>
- **Date:** <date>
- **Iteration:** N
- **Scope decision:** <projection>

<summary>

### Findings

- <finding>            （または "- None"）
```

`ReviewResult`（`:80-89`）は `verdict: "READY" | "NOT-READY"` / `iteration: number` / `reviewer: string` を型で固定する。フィールドパーサ `reviewField`（`:672-677`）は `^- \*\*<Label>:\*\* (.+)$` の**ちょうど1件**の一致を要求する（`if (matches.length !== 1)` を逐語確認）。**これが読み手が写すべき parse 契約である。**

### 実コーパス（observed で Architect が再計測）

```
1,010 ブロック / 691 ファイル
```

分布:

| 見出し | 件数 |
| --- | --- |
| `## Review — Iteration 1` | 584 |
| `## Review — Iteration 2` | 403 |
| `## Review — Iteration 3` | 6 |
| `## Review — Iteration 4` | 4 |
| **`## Review — Iteration 2（rebase後・裁定A反映）`** | **3** |
| `## Review — Iteration 5` | 2 |
| `## Review — Iteration 6` / `7` / `8` / `9` / `12` / `13` | 各 1 |

**サフィックス付き見出し 3 件が様式ドリフトの全数である。** 書き手自身のマッチャは既にこの形を許容する — `existingReviewBlock`（`:660`）は `/^## Review(?:[ \t].*)?$/gm` で走査してから trim 完全一致でフィルタするため、サフィックス付き見出しは**見出しとしては発見されるが iteration N としては一致しない**。読み手は同じ二段構え（寛容な見出し走査 → 厳格なマーカー完全一致）を採り、残差を**捨てるのではなく parse 不能として計数**すべきである。

クロスレビューは 1,003 ブロック / 129 対 687 ファイルと報告した。observed では **1,010 / 691** であり、ファイル数の食い違いは reviewer-2 側が正しい（`grep -rl` は 691 を返す）。reviewer-1 の「129 ファイル」は走査範囲が狭かったものと解される。

### 所在（`intents/<intent>/` 配下のディレクトリサフィックス）

```
68  inception/requirements-analysis
29  inception/units-generation
29  inception/application-design
 3  construction/docs-sync/nfr-design
 3  construction/docs-sync/functional-design
 2  construction/{unit-name}/code-generation     ← 未解決テンプレートのリテラル
 2  construction/docs-sync/code-generation
 1  各: inception/user-stories、inception/refined-mockups、
        ideation/rough-mockups、construction/workspace-inspection/{nfr-requirements,nfr-design}
```

⚠️ **`construction/{unit-name}/` はディスク上に実在するリテラルディレクトリである** — #1711 / #2358 の degrade 欠陥が残した未解決テンプレートの痕跡。Architect が実測で所在2件を確定した:

```
amadeus/spaces/default/intents/260725-mirror-review-fixes/construction/{unit-name}
amadeus/spaces/default/intents/260802-registry-drift-guard/construction/{unit-name}
```

パス基準の stage / unit 帰属は、明示的に扱わない限り `{unit-name}` というバケットを生成する。

## 5. 配置と投影

**着地先:** `packages/framework/core/tools/amadeus-<name>.ts`。性能/レポート系ツールの名前衝突はない — `packages/framework/core/tools/` 内で `stat|report|metric|perf` に一致するのは `amadeus-norm-metrics.ts` / `amadeus-sensor-pr-convergence-report-format.ts` / `amadeus-subagent-stats.ts`（ほか mirror-state / state 系）のみ。

**投影:** `packages/framework/harness/claude/manifest.ts:55-56` の `coreDirs: [{ src: "tools", dst: "tools" }, …]` を `scripts/package.ts:438`（`for (const { src, dst } of m.coreDirs)`）が消費する。**`core/tools/` に置いたファイルは全ハーネス dist へ自動で到達する。** packager が検出する harness manifest ディレクトリは observed で **`claude` / `codex` / `cursor` / `kimi` / `kiro` / `kiro-ide` / `opencode` / `pi` の 8 件**（`ls packages/framework/harness/` で実測）。`cid:build-and-test:bt-dist-regen-seven-harnesses` に従い、正は packager の検出集合であって固定数ではない。

⚠️ **境界ガード（t258）:** `tests/lib/boundary-guard.ts` の `scanDistributionTreeForScriptsRefs`（predicate 1、FR-5a）により、出荷される `core/tools` は `scripts/<file>` トークンを参照してはならない。**コメントと文字列も対象である**（`cid:code-generation:c1-1569-shipped-comment-vocab` が直撃する面）。

**テストの層。** ティアは `tests/run-tests.ts:116-125` の `--smoke` / `--unit` / `--integration` / `--e2e`。`--ci` = smoke+unit+integration、`--release` が e2e+perf を追加。エントリは `tests/run-tests.sh` → `run-tests.ts`。

**サイズ ratchet:** `tests/lib/test-size.ts:37-39`（Architect が verbatim 確認）は spawn / filesystem / timer の正規表現に一致するファイルを `medium` へ強制する — `node:fs` / `readFileSync` / `readdirSync` / `existsSync` / `spawnSync` / `Bun.spawn` / `setTimeout` はいずれも該当。`cid:code-generation:fs-tests-integration-first` により、**実シャードに触れるものは `tests/integration/` へ置く**。`tests/unit/` に置けるのは純粋な集計・レンダー関数のみ。

**双子テストの雛形が既に存在する** — subagent-stats の対:

- `tests/unit/t460-subagent-stats-compose.test.ts`（純粋な compose）
- `tests/integration/t461-subagent-stats.integration.test.ts`（fs + CLI spawn）

t461 のヘッダ（`:5-23`）が写すべきパターンを文書化する: 混成スキーマの fixture コーパス、parse 破損行、`--json` の形、未知フラグの fail-closed、読めないシャードでの loud な非0 exit、空コーパスは正常なゼロ、**そして独立オラクル** — *"the test's own shard walker … never the CLI under test (BR-U3-6: self-referential comparison is 検証劇場)"*。`MECHANISM: cli`。

**tNNN 予約: 使用済み最大は t480 → 新規は t481 以降。**（前回 RE の t466 主張は陳腐化。§ 1(b) 参照。）

**適用されるカバレッジゲート:**

- `tests/coverage-patch-gate.ts` — head LCOV に `DA` レコードとして現れる追加行は非ゼロヒットを要する。母集団は *lcov 常駐行のみ*（`:16-21`）。allowlist `tests/.coverage-patch-allowlist.json` は理由必須・AST セレクタ基準で、**stale エントリで hard-fail する**（`:23-36`）。順序規則は `:32-35` に明示 — **seam リファクタが先、allowlist が後**
- `tests/coverage-project-gate.ts` — 絶対下限 **AND** 相対 baseline 許容幅の両方が必須（`:278-301`）
- `tests/.coverage-registry.json` — 617 ユニット / 7 `unitClasses`。`minMechanism.subcommand = "cli"` のため、新規 CLI サブコマンドは CLI メカニズムのカバレッジを要する。再生成は `tests/gen-coverage-registry.ts`
- 併走: `tests/complexity-gate.ts` / `tests/no-silent-drop-gate.ts` / `tests/unchecked-cast-guard.ts` / `tests/callsite-guard.ts` / `tests/deletion-gate.ts`

## 6. read-only 決定的レポータの CLI 規約

**パターン A — `amadeus-subagent-stats.ts`（最近縁の core tool）:**

- Usage 行を第一級の doc として置く（`:3`、verbatim）: `//   Usage: bun amadeus-subagent-stats.ts [--project-dir <path>] [--space <name>] [--json]`
- `parseArgs`（`:412-431`）は parse-don't-validate — 未知フラグ / 値のないオプションは `{error}` を返し **exit 2**
- **測定 ref が出力の第一節**（`:192-197`）
- `--json` は `Record<string, unknown>` を返し、Map は `sortedEntries`（件数降順・キー昇順）で平坦化して順序を安定化（`:174-176, 237-254`）
- exit コード階梯: `0` 正常 / `1` コーパスの穴 / `2` 使用法エラー
- `export function main(argv: readonly string[]): number` + `if (import.meta.main) process.exit(main(process.argv.slice(2)));`（`:433` / `:468`、Architect が逐語確認）— これが lcov 計測可能にする in-process seam（`cid:requirements-analysis:bun-coverage-spawn-blindspot`）

**パターン B — `scripts/metrics-timeseries.ts`（repo 側の read-only ビューア）:** ヘッダ `:1-8` — *"Read-only … Never writes: **this module must not import any fs write API (AC-1c; grep-checkable)**"*、加えて書き手と共有する env seam override（`AMADEUS_METRICS_ROOT`）。**grep で検査可能な no-write 契約**は安価かつ強い不変量であり、写す価値がある。

**パーセンタイルヘルパは既存:** `tests/lib/percentile.ts:12` の `export function nearestRankP95(values: readonly number[]): number` — nearest-rank、`sorted[ceil(0.95*n)-1]`、空入力では `NaN` を返す（*"so a broken measurement propagates as a visibly non-finite number instead of a silent hole"*）。⚠️ **`tests/` 配下にあるため core ツールは import できない**（境界ガード＋出荷面）。**意味論を写し、ファイルは写さない。**

**`no-canonical-direct-execution` の実運用形。** `cid:code-generation:no-canonical-direct-execution` は `packages/framework/core/tools/*` を canonical パスで直実行することを禁じる。t461 は次のように回避している:

```ts
// tests/integration/t461-subagent-stats.integration.test.ts:51
} from "../../dist/claude/.claude/tools/amadeus-subagent-stats.ts";
// :55
const STATS_CLI = join(AMADEUS_SRC, "tools", "amadeus-subagent-stats.ts");
```

`tests/harness/fixtures.ts:57` は `export const AMADEUS_SRC = join(REPO_ROOT, "dist", "claude", ".claude");`（Architect が逐語確認）。**in-process import も spawn される CLI も、いずれもビルド済み dist ツリーから来る。** dist は untracked で `bun run build` が生成する。`.gitignore:24` = `/.claude/**` により self-install ツリーも untracked。`amadeus-subagent-stats.ts:377-386`（`resolveProjectDirLocal`）が持つ dot-dir リーフ判定（`/^\.[a-z0-9][a-z0-9._-]*$/i`）が、ハーネスツリーから実行したときに project root を正しく解決させる — 新ツールは同じ idiom を持つか共有面を import する必要がある。

## 7. 危険インベントリ

### D1 — ⭐ 「clean window の中央値 0 秒」という反論は減算では成立しない

両クロスレビュアーは idle 混入を**フィルタ**で測った（idle マーカーを含む窓を捨てる）結果、clean な窓は median 0 秒 / p95 0 秒 — すなわち「trivial なステージしか clean でない」と結論した。

Developer scan は observed で**減算**により再計測した（#2405 が実際に規定するアルゴリズム: `[AWAITING→GATE_APPROVED/REJECTED] ∪ [PARKED→UNPARKED] ∪ [SESSION_ENDED→SESSION_STARTED/RESUMED]` を区間マージし、窓へクリップして差し引く）:

```
windows=1532
raw  wall-clock: median=674s   p95=12188s  mean=3109.7s
net  (idle-sub):  median=458s   p95= 7486s  mean=2076.8s
減算により 0 になった窓: 30
元から raw 0 の窓（秒粒度の潰れ）: 394
合計 raw=1323.4h  net=883.8h  減算率=33.2%
intent 横断の未クローズ STAGE_AWAITING_APPROVAL: 7
```

ステージ別の net 中央値（n≥10）:

| ステージ | n | net median | net p95 |
| --- | --- | --- | --- |
| `code-generation` | 123 | 5,183s | 60,699s |
| `functional-design` | 64 | 1,885s | 13,626s |
| `nfr-design` | 56 | 1,408s | 15,764s |
| `reverse-engineering` | 127 | 1,192s | 3,337s |
| `application-design` | 59 | 1,150s | 6,126s |
| `requirements-analysis` | 130 | 981s | 6,327s |
| `nfr-requirements` | 41 | 772s | 7,405s |
| `build-and-test` | 115 | 737s | 4,028s |
| `units-generation` | 62 | 718s | 2,813s |
| `intent-capture` | 61 | 647s | 2,603s |
| `feasibility` | 42 | 339s | 4,059s |
| `delivery-planning` | 58 | 297s | 2,290s |

**解釈（実測事実 + Developer scan の読み）:** 減算は 1,532 窓を**すべて保持**したうえで、判別力のあるステージ別順位を生む — `code-generation` は `delivery-planning` の一桁上である。ゼロへ潰れるのは 30 窓のみ。レビュアーの「clean median 0 秒」は**フィルタの副産物**であり、フィルタは窓の 74% を捨てたうえに `workspace-scaffold` / `workspace-detection` / `state-init` が支配する残差を残す。**#2405 の完了条件は単に充足可能であるだけでなく、指標を機能させている当のものである。**

⚠️ **主張していないこと（要件段が明示的に受容するか検証すべき仮説）:** これらの net 値が*正しい実作業時間*であることは検証されていない。検証されたのは、当該アルゴリズムが永続化コーパスに対して**実装可能であり、非退化な出力を生む**ことだけである。秒粒度の切り捨てにより 394 の raw ゼロ窓はどちらの方式でも解像不能なまま残る。`cid:requirements-analysis:c7-upstream-universal-claim-unverified` に従い、下流はこの区別を保存すること。

### D2 — Issue 本文の `Model` 行数は observed で陳腐化

本文は *"監査実記録は 2026-08-07 時点で 2 行のみ"* および *"既存 7,151 件中 7,150 件がモデル不明"* とする。observed では **`Model` 行 10 件**、`SUBAGENT_COMPLETED` 総数は **7,273（Developer scan 時点）/ 7,274（Architect 再計測時点）の移動値**である。**要件は転記せず再計測すること。** *結論*（遡及的にはほぼ空、前向きに価値がある）は影響を受けない。

### D3 — 未クローズの `STAGE_AWAITING_APPROVAL` 7 件

コーパス全域で `STAGE_AWAITING_APPROVAL`（1,195）が `GATE_APPROVED`+`GATE_REJECTED`（合計 1,214、ただし intent ごとに偏る）と対応せず、**7 件のオープナーが自 intent 内でクローズしない**。idle 減算の実装は、未クローズのオープナーを「窓の終端まで idle 扱い」とするか「parse 不能として報告」とするかを**明示的に決める**必要がある。#2405 の無音スキップ禁止条件により、**計数して報告する**ことが要求される — 黙って既定値を当てることはできない。

### D4 — 窓ペアリングの残差

```
STAGE_STARTED=1567  STAGE_COMPLETED=1537
ペア成立=1532  未対応 start=35  孤児 complete=5
```

両レビュアーの測定（`75a1c198d` 断面で 1,520 / 1,524）と整合する — 区間が窓を追加した。**未対応の 40 イベントは報告対象の除外バケットである。**

### D5 — `{unit-name}` リテラルディレクトリがパス帰属を汚染

レビューブロックを持つファイル 2 件が `construction/{unit-name}/code-generation` 配下に実在する（所在は § 4 で確定）。パス由来の unit 帰属は `{unit-name}` バケットを吐く。

関連: 区間の `d98dd9039`（#2393）と、区間内で `project.md` へ persist された新ノルム `cid:code-generation:c1-2358-declare-units-done` が degrade の per-unit ゲートを宣言検証つき fail-closed へ変えた。ただしこれは**エンジンの挙動**であり、ディスク上のディレクトリ名を遡って直すものではない。

### D6 — #2405 自身の分類ガードが発火していない

`.github/workflows/issue-labels.yml:16`:

```yaml
if: contains(github.event.issue.body, '### 優先度（いつ対応するか）') || contains(github.event.issue.body, '### 優先度（いつ直すか）')
```

**全角の `（）`** を要求する（`.github/ISSUE_TEMPLATE/enhancement.yml:69` も同様）。#2405 の本文は**半角の `(いつ対応するか)`** を使う。observed で確認済み — reviewer-2 の §様式・ラベル の指摘は成立する。reviewer-2 は系統版（6 Issue が該当）を別 Issue として正しく切り出している。

### D7 — `metrics/` スナップショット機構: 隣接するが重複しない

`metrics/` は 288 スナップショットを保持する。形（`metrics/2026-08-07T08-48-48-378Z-d98dd9039db3.json`）:

```json
{"schema_version":1,"captured_at":"…","commit":"…","collectors":{"ccn":{…},"coverage":{…},"loc":{…},"tests":{…}}}
```

コレクタは**リポジトリ健全性**（lizard CCN / bun coverage / git LOC / テスト数）であり、ワークフロー・ステージ・モデルの軸を持たない。スクリプト: `metrics-snapshot.ts`（書き手）/ `metrics-timeseries.ts`（read-only ビューア）/ `metrics-visualize.ts` / `metrics-retention.ts` / `metrics-publication*.ts`、ワークフロー `metrics-maintenance.yml` / `metrics-backfill.yml`。

**#2405 との機能的重複はない。** ただし借りる価値のあるものが2つある: `{schema_version, captured_at, commit, collectors{tool, tool_version, values}}` というエンベロープは**このリポジトリで確立したバージョン付き決定的レポートの形**であり、`metrics-timeseries.ts` は**蓄積コーパス上の read-only ビューアの repo 内先例**である。

### D8 — 区間と #2405 v2 の間に矛盾なし

区間の4件のフレームワーク修正（#2387 / #2389 no-silent-drop、#2392 advisory recovery、#2393 degrade gate）は #2405 が消費する面のいずれにも触れない。`audit-format.md` の変更は advisory-choice 節に限られる。**#2405 v2 のどの完了条件も区間によって無効化されていない。**

## 8. 除外バケットのインベントリ（#2405 の無音スキップ禁止条件により全件が報告対象）

| バケット | 件数 | 出所 |
| --- | --- | --- |
| 未対応 `STAGE_STARTED` | 35 | D4 |
| 孤児 `STAGE_COMPLETED` | 5 | D4 |
| 未クローズ `STAGE_AWAITING_APPROVAL` | 7 | D3 |
| 秒粒度で 0 に潰れた窓 | 394 | D1 |
| サフィックス付きレビュー見出し | 3 | § 4 |
| `{unit-name}` リテラルパスバケット | 2 ファイル / 2 intent | D5 / § 4 |

## 9. 後続ステージへの申し送り

1. **observed は `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`。** 患部6ファイルは `b8e3e664f..HEAD` と `75a1c198d..HEAD` の両区間で byte 不変であり、**クロスレビューの引用は再解決なしで移送できる**。動いたのはデータだけである。
2. **要件へ伝播する前に2つの数値を訂正する:** `Model` を持つ行は **10**（2 ではない）、`SUBAGENT_COMPLETED` は **7,273/7,274 の移動値**（7,151 ではない）。使用済み最大テスト番号は **t480**（t465 ではない — 前回 RE の `re-scans/260807-failclosed-recovery-path.md:111,300` が陳腐化）、**新規は t481 以降**。
3. **D1 を先頭に置く。** 減算の結果（net median 458s、減算率 33.2%、判別力のあるステージ別順位）は、#2405 の中心的な完了条件が実装可能かつ必要であることの最強の証拠である。クロスレビュー最大の留保（*"未対応のまま実装すると指標そのものが目的を果たさない"*）を Issue に有利な方向で解消する — **フィルタは退化し、減算は退化しない。**
4. **`amadeus-journal.ts` を第一級の設計選択肢として上げる。** `journalRecordField:130` + `readJournalRecords:534` は export 済みのスキーマ非依存な正規化層であり、`amadeus-subagent-stats.ts` はこれを迂回している。#2405 の「共通化する正規化層」条件は core に既に答えを持つかもしれない。反対圧力を明記すること — subagent-stats の `:21-23` は依存方向の裁定を記録しており、共有層の採用は**設計判断であって機械的な勝ちではない**。
5. **subagent-stats からはコードではなく契約を再利用する。** `recordFromLine` は file-private、`scanAuditCorpus` は subagent 型固定であり、「拡張 vs 新設」は import 可能性だけでは決着しない。移送可能な資産は UNKNOWN/ADR-5 規則（`:141-148`）、no-silent-drop 計数（`:323-340`）、読めないシャードでの loud exit（`:463-465`）、測定 ref 先頭出力（`:192-197`）、レンダー時点サニタイズ（`:178-187`）、exit 階梯 0/1/2。
6. **命名: `amadeus-observability` は使用不可で確定。** 384 行、サブコマンド 0、opt-in、fail-open の書き手。提案されている読み手は fail-closed。reviewer-1 の反論は observed で成立する。
7. **設計が固定すべき parse 契約が2つ。** レビュー見出しは書き手自身の二段マッチ（`amadeus-reviewer-runtime.ts:660` の寛容な `/^## Review(?:[ \t].*)?$/gm` 走査 → 厳格なマーカー完全一致）を要し、サフィックス付き 3 件を*捨てずに parse 不能として計数*する。`SENSOR_*` は `Stage slug`、stage ライフサイクル系は `Stage` — **キーを混同しない**。
8. **設計対象の除外バケットは § 8 の表を正本とする**（全件が無音スキップ禁止条件の対象）。
9. **配置は確定、検証は未確定。** `packages/framework/core/tools/` → `coreDirs`（`claude/manifest.ts:55-56`、`package.ts:438`）経由で 8 ハーネス全部へ。t460/t461 の双子分割（純粋 unit + fs integration）に従い、**dist** コピーを `fixtures.ts:57` 経由で消費し、出荷コメントで t258 の no-`scripts/`-token 規則を守り、`tests/lib/percentile.ts` は import せず `nearestRankP95` の意味論を写す。
10. **観測事実と読みを分離すること。** § 1〜§ 6 と D2〜D8 はすべて observed 断面での実測または実読である。D1 では測定値は観測事実だが、**これらの net 値が実作業時間を近似するという主張は仮説**であり、要件段が明示的に受容するかテストすべき事項である。

## 10. 共有成果物の更新範囲

本 intent が現在断面を追加した成果物と、その根拠:

| 成果物 | 追加内容 | 根拠 |
| --- | --- | --- |
| `architecture.md` | 監査イベント面と読み手の生態 | § 2 / § 3 / D1 |
| `api-documentation.md` | 決定的レポート CLI の契約生態 | § 3 / § 4 / § 6 |
| `code-structure.md` | 新規 core tool の配置と検証面 | § 5 |
| `code-quality-assessment.md` | 監査コーパスのデータ品質債務 | § 8 / D3 / D4 / D5 |
| `component-inventory.md` | 読み手生態の棚卸し | § 3 |
| `business-overview.md` | 増分なし（1行の観測記録のみ） | 区間に該当変更なし |
| `technology-stack.md` | 増分なし（1行の観測記録のみ） | 外部依存の変更 0 件 |
| `dependencies.md` | 増分なし（1行の観測記録のみ） | 同上 |

`cid:reverse-engineering:c3-relabel` に従い、直前の現在断面 `260807-failclosed-recovery-path` は全成果物で**本文保持のまま履歴へ降格**した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
