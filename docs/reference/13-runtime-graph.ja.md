# Runtime Graph

> 対象読者: Tier 2/3(チーム採用者、フレームワーク貢献者)。

本章は、v0.5.0 milestone 8 で導入された workflow ごとの `runtime-graph.json` 成果物を文書化します — `stage-graph.json` のデータプレーンミラーであり、あらゆる承認ゲートで監査ログから実体化されます。[Plane Architecture](02-plane-architecture.md)(この成果物を動機づける control/data プレーンの分離)および [State Machine](12-state-machine.md)(その遷移が compile をトリガーするライフサイクル)へ相互リンクします。

---

## 1. What it is

`stage-graph.json` は構造的真実です — すべてのステージ定義、すべての `requires_stage` / `produces` / `consumes` エッジ。workflow の実行をまたいで安定です。

`runtime-graph.json` は実行の真実です — *現在の* workflow について、どのステージが開始されたか、どれが承認されたか、各ステージの memory.md がどう見えるか、どのセンサーが発火したか。workflow ごとに1ファイルで、`<record>/runtime-graph.json` に存在します — `<record>/` = intent の record ディレクトリ、`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`。`stage-graph.json` と同じノード形状で、構造の代わりにテレメトリで populate されます。

これはコンシューマ(milestone 11 の Bolt fork/merge、milestone 12 のゲート ritual、milestone 14 の doctor、v0.10.0 の cross-workflow observer)が、クエリごとに監査ログを再ウォークするのではなく1つの実体化ビューを読むために存在します。

---

## 2. Schema

以下の TS インターフェースはロックされた契約です。変更するには同じ PR ですべてのコンシューマをバンプする必要があります。

```ts
interface RuntimeGraph {
  workflow_id: string;            // ISO timestamp from LATEST WORKFLOW_STARTED audit row (so a re-birthed intent identifies the live workflow, not a dead one)
  scope: string;                  // from state.md "Scope" field
  started_at: string;             // ISO 8601, same row as workflow_id
  stages: RuntimeStage[];         // chronological order by started_at
  bolt_dag?: BoltDag;             // present only when units-generation's unit-of-work-dependency.md carries a valid (well-formed, acyclic) fenced edge block; absent/malformed/cyclic blocks omit the node
}

interface BoltDag {
  units: { name: string; depends_on: string[] }[]; // verbatim from the authored edge block
  batches: string[][];            // topological levels; each level = units whose deps are all satisfied by prior levels; level entries sorted lexicographically (deterministic)
}

interface RuntimeStage {
  stage_slug: string;
  started_at: string | null;      // ISO from STAGE_STARTED; null when `instances` is present
  completed_at: string | null;    // ISO from STAGE_COMPLETED; null when pending OR when `instances` is present
  agent: string | null;           // lead_agent; null when `instances` is present
  memory_path: string;            // <record>/<phase>/<stage>/memory.md (parent stage path even on instance-bearing rows)
  memory_entries: number | null;  // null = no memory.md file OR `instances` is present; else parseMemoryHeadings.total
  memory_breakdown: {             // null when memory_entries is null
    interpretations: number;
    deviations: number;
    tradeoffs: number;
    open_questions: number;
  } | null;
  sensor_firings: SensorFiring[]; // empty array in milestone 8 (sensors fire in milestone 9 + milestone 10)
  outcome: "approved" | "failed" | "pending";
  learnings_captured: {           // null on pending rows; populated on transition to approved
    from_orchestrator: number;    // zero in milestone 8 (gate ritual is milestone 12)
    from_user_addition: number;
  } | null;
  instances?: BoltInstance[];     // present only when stage runs per-Bolt; milestone 11 populates
}

interface BoltInstance {
  bolt: string;
  worktree: string;
  started_at: string;
  completed_at: string | null;
  memory_path: string;
  memory_entries: number | null;
  memory_breakdown: { interpretations: number; deviations: number; tradeoffs: number; open_questions: number; } | null;
  sensor_firings: SensorFiring[];
  outcome: "approved" | "failed" | "pending";
}

interface SensorFiring {
  id: string;
  fire_id: string;                // 8-hex correlator emitted by the milestone 9 dispatcher on every row
  result: "passed" | "failed" | "budget-override" | "incomplete"; // 4-state (milestone 12 Q10)
  ts: string;                     // FIRED row's timestamp
  detail_path?: string;
}
```

`instances` が存在する場合、ステージ行の単一インスタンスフィールド(`started_at`、`completed_at`、`memory_entries`、`memory_breakdown`)は NULL です — それらの値は代わりに各インスタンスに存在します。ステージ行フィールドとインスタンス配列フィールドが共存することはありません。

### The Bolt/unit dependency DAG (`bolt_dag`)

オプションの `bolt_dag` ノードは、エンジンが並列ビルドバッチを計算するために読む機械可読なユニット依存グラフです — swarm ファンアウトにおいて「DAG が許可である」。そのソースは、units-generation(2.7)が `unit-of-work-dependency.md` 上に人間可読な散文と並べて author する **fenced `yaml` `units:` エッジブロック** です:

```yaml
units:
  - name: auth
    depends_on: []
  - name: api
    depends_on: [auth]
```

`compile` は *その構造化ブロック* をパースし — 純粋なデータパース、モデル呼び出しなし — `units`(そのままのエッジ)と `batches`(トポロジカルレベル)にします。各バッチは、依存関係がすべて先行バッチによって満たされるユニットの集合です。したがってバッチのユニットは相互依存を持たず並列に実行できます。レベルエントリは発行前に辞書順にソートされるため、author された順序に関わらずノードは決定論的です。

ノードは、成果物が不在のとき、またはそのエッジブロックが不在、不正(重複名、ダングリングまたは自己依存、パース不能)、または循環しているとき、**完全に省略** されます — `compile` は理由を名指しした stderr 診断を書き、間違っているが妥当な DAG を発行する代わりに `bolt_dag` をエンベロープから外します。それらの失敗は、同じブロックを検証し `edge_block: ok | absent | malformed | cyclic` を報告する `required-sections` センサーによって、上流の 2.7 ゲートで表面化されます。エッジを構造化データとして author すること(2.7 承認ゲートの背後で、一度だけの知識作業)が、フック発火の `compile` を再実行時にバイト同一に保つものです: compile パスにモデルは座っていません。

---

## 3. Compile lifecycle

compile は、遷移クラスの監査 emit ごとに PostToolUse Bash フック(`.claude/hooks/amadeus-runtime-compile.ts`)によって呼び出されます。フックはコンダクターからのすべての `Bash` ツール呼び出しで発火し、安価にフィルタします:

1. **コマンドフィルタ** — `bun .claude/tools/amadeus-(state|jump|bolt|utility).ts` の呼び出しだけが early exit を通過します。`amadeus-runtime.ts` は除外(再帰ガード)。`amadeus-log.ts` はおしゃべりなステージ内イベントのみを発行。`amadeus-worktree.ts` は WORKTREE_* イベントのみを発行。
2. **監査存在ガード** — intent の `audit/` シャードがまだ存在しなければ終了。
3. **ハートビート** — doctor のサイレントフック検出のため `<record>/.amadeus-hooks-health/runtime-compile.last` を書く。
4. **末尾3ブロックの tail-read** — `audit.md` を `\n---\n` で分割し、最後の3エントリを取る。
5. **イベントクラスフィルタ** — 3ブロックのいずれかに対して `**Event**: (GATE_APPROVED|STAGE_STARTED|STAGE_AWAITING_APPROVAL|AUDIT_MERGED|WORKFLOW_COMPLETED)` をマッチ。マッチなしで終了。
6. **ディスパッチ** — `spawnSync("bun", [".claude/tools/amadeus-runtime.ts", "compile", ...])`。

`WORKFLOW_COMPLETED` が遷移セットに含まれるのは、最終ステージの approve が compile を発火させるためです。`amadeus-state.ts:575-593` の `handleCompleteWorkflow` は4つの監査行 — STAGE_COMPLETED + PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED — を発行し、そのうち最後の3つは `PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED` です。(approve パスでは approve がすでに STAGE_COMPLETED を発行しているためそれは抑制され、`GATE_APPROVED` が実行に先行します — したがって最終ステージの approve はいずれにせよ1回の Bash 呼び出しで5行を追記します。)正規表現に `WORKFLOW_COMPLETED` がなければ、runtime-graph は最終ステージを approved として決して記録しません。

compile 自体は完全な監査ログをウォークし(したがって結果は遷移増分ではなくイベントソース)、同じ slug について `STAGE_STARTED` を次の `STAGE_COMPLETED` とペアにし、各ステージの memory.md を `amadeus-lib.ts` の `parseMemoryHeadings()` 経由で読み、`withAuditLock` 内で `writeFileAtomic` により成果物をアトミックに書きます。

---

## 4. Outcome enum and chronological pairing

3つの outcome 値: `"approved" | "failed" | "pending"`。

- **approved** — `STAGE_STARTED@T1` が後の `STAGE_COMPLETED@T2` とペア。行の `completed_at` は `T2`。
- **pending** — その slug について後の `STAGE_COMPLETED` を持たない `STAGE_STARTED@T1`。行の `completed_at` は `null`。
- **failed** — `instances[]` の親ステージ rollup によってのみ発行される(単一インスタンスステージは `"approved" | "pending"` のまま)。Construction ステージの `instances[]` が非空のとき、親の `outcome` はそのインスタンスの rollup です: すべて approved → `approved`、いずれかが failed → `failed`、それ以外(いずれかが pending で失敗なし)→ `pending`。単一インスタンスステージが `failed` を発行しないのは、根底にある `BOLT_FAILED` イベントが instances を持つパス以外に Construction ステージのスコープを持たないためです。

Re-jump 処理: `/amadeus --stage <slug>` はすでに完了した slug に対して `STAGE_STARTED` を再発行します。監査ログは `STAGE_STARTED@T1, STAGE_COMPLETED@T2, STAGE_STARTED@T3` を持ちます。ペアリング規則は `STARTED@T1` を `COMPLETED@T2` とマッチ → approved を生むはずですが、その slug の最新の `STAGE_STARTED` が以前の行を上書きします — slug ごとに1行、最新の STARTED が勝ちます。したがって結果は `started_at: T3, completed_at: null` の pending 行です。

Single-stage 除外: `--single` のステージランナー実行は、その `STAGE_STARTED`/`STAGE_COMPLETED` ペアを合成 `**Workflow**: single-stage:<slug>` id の下にコミットします(監査のみ。`amadeus-orchestrate.ts` の `handleSingleReport` を参照)。ペアリングは `Workflow` フィールドが `single-stage:` で始まる任意の `STAGE_*` 行をスキップします — それらの行はどのメイン workflow にも属さないため、メインの `runtime-graph.json` に行を作成または完了させることは決してありません(したがって `summary` カウントを膨らませることも決してありません)。メイン workflow の `STAGE_*` 行は `Workflow` フィールドを持ちません。不在は行が保持されることを意味します。同じ除外は `amadeus-state.ts` の `hasStageAuditEvent` の重複排除チェックにも適用されるため、single 実行の `STAGE_COMPLETED` が同じ slug についてメイン workflow 自身の完了発行を抑制することはできません。

---

## 5. MEMORY_EMPTY semantics

`MEMORY_EMPTY` 監査行は、ステージ行が以下のすべてを満たすとき compile によって発行されます(唯一のエミッタ — `audit-format.md:171` が `tools/amadeus-runtime.ts compile` を登録):

- `outcome === "approved"`(pending 行は発行しない — 下記 §6 を参照)
- `memory_entries === 0`(ファイルは存在し、§13 の4つの正典見出しの下にエントリが0)

エントリが0の pending 行は発行 **しません**。まだ実行中のステージは、コンダクターがまだ memory.md に書いていないため正当にエントリ0であり得ます — 実行途中で MEMORY_EMPTY を発行すると、実際のダイアリースキップを表さないノイズを生成します。milestone 14 の doctor が欲しいシグナルは「エントリ0で承認されたステージ」です — それにはステージが承認されている必要があります。

### Idempotency — exactly once per (slug, gate-completion)

`runtime-graph.json` 自体は、同じ監査ログに対する再 compile をまたいでバイト等価です。MEMORY_EMPTY の emit はより強力です: **`(stage_slug, completed_at)` タプルごとに高々1つの MEMORY_EMPTY 行**。

ロックされたセクション内で compile は `audit.md` を再読み取りし、エントリ0で承認された各 slug について既存の MEMORY_EMPTY 行をスキャンし、いずれかの以前の行の Timestamp がこの slug の `completed_at` 以上であれば emit を抑制します。これは以下を意味します:

- エントリ0で承認されたステージの後の最初の compile は1つの MEMORY_EMPTY 行を発行します。
- 同じ workflow 中のその後のすべての compile は、その slug について再発行 **しません**。
- `--stage <slug>` の re-jump + 再承認は新しい `STAGE_COMPLETED`(より新しい `completed_at`)を生みます — 再承認時にステージがまだ空であれば、以前の行の Timestamp が新しい completed_at より小さくなるため、新しい MEMORY_EMPTY 行が emit されます。

doctor の MEMORY_EMPTY-rate メトリックは重複排除なしにこれらの行を直接読みます。空ダイアリーでのゲート完了ごとに1行です。

ロックされたセクション内で MEMORY_EMPTY が emit された後に成果物の書き込みが失敗した場合、監査ログは runtime-graph.json が決して到着しなかったステージについて N 個の MEMORY_EMPTY 行を持ちます。次の compile はその抑制スキャンでそれらの行を見て再 emit をスキップします。成果物はその後到着します。重複 emit なし、ファントム成果物なし。

---

## 6. v0.4.0 backfill rule

milestone 13 の memory.md ライフサイクルが出荷される前に完了したステージには memory.md 履歴がありません。backfill 規則:

- `memory_entries: null` ↔ `memory_breakdown: null` ↔ MEMORY_EMPTY emit なし。
- 両フィールドは一緒に動きます。判別子は「`parseMemoryHeadings` は実行されたか?」です — memory.md が存在すれば(たとえゼロバイトでも)実行され、キーは数値です。memory.md が不在なら両方が `null` です。

この規則がなければ、v0.5.0 にアップグレードするすべての v0.4.x ユーザーは、アップグレード後の最初の workflow で MEMORY_EMPTY 行の嵐を目にすることになります。

---

## 7. Recovery model — snapshot + suffix replay

`runtime-graph.json` + `audit.md` はイベントソースのペアを形成します。`audit.md` は append-only のイベントログ、`runtime-graph.json` は最後のゲート遷移で取られた実体化スナップショットです。両方を持つ読み手は、スナップショットを読み、その後スナップショットの最後の `completed_at` 以降の監査行をリプレイすることで現在の状態を再構築します。

5つの recovery ソース、人間の読み順で:

1. **成果物ツリー**(`<record>/<phase>/<stage>/`) — 何が生成されたか。
2. **memory.md**(`<record>/<phase>/<stage>/memory.md`) — コンダクターが捕捉すると選んだもの。
3. **audit/ シャード** — 正典のイベントログ。実際に何が起こったか。
4. **state.md** — アクティブステージのカーソル。
5. **runtime-graph.json** — 実体化ビュー。監査を再ウォークするよりクエリが速いが、常にそこから再導出可能。

### Freshness caveat for pending rows

pending 行の `memory_entries` と `memory_breakdown` は最後の compile 時にスナップショットされました。ステージが実行途中で、最後の compile 発火以降にコンダクターがより多くのエントリを書いていた場合、スナップショットは遅れます。recovery のコンシューマは recovery 時に memory.md を再パースしなければなりません。pending 行についてスナップショットされたカウントを信頼しては **なりません**。

v0.5.0 には pending カウントをライブで読むコンシューマはありません。この carve-out を必要とする v0.6.0 の `--resume` のために文書化しています。

### Parallel-Bolt mid-flight recovery (closed in v0.5.0)

並列 Bolt がバッチ途中でクラッシュする workflow には、milestone 8 では Bolt ごとの recovery シームがありませんでした — スキーマは `instances?` を予約していましたが、compile は main 上に単一インスタンス行のみを書き、worktree は runtime-graph フラグメントを決して受け取りませんでした。v0.5.0 で `amadeus-runtime.ts fragment-fork`(Bolt 開始)と `fragment-merge`(Bolt 完了 --merge)、および Construction フェーズのステージのウィンドウ内に監査が2つ以上の異なる slug を示すとき `BoltInstance[]` を発行する compile populator 拡張によって解決されました。

Bolt ごとのフラグメントは v0.5.0 では dead-on-arrival です(worktree の record ディレクトリの `runtime-graph.json` を読む v0.5.0 の読み手はいません)。v0.6.0 の `--resume` はフラグメントをヒントとして扱い、main のマージ後 runtime-graph を正典とし、加えて `amadeus-bolt.ts` に従って孤立した worktree をチェックして、それらの recovery プロンプトを表面化すべきです。

---

## 8. CLI surface

```bash
# Walk audit + memory.md, write runtime-graph.json (invoked by hook).
bun .claude/tools/amadeus-runtime.ts compile

# Print one stage row from runtime-graph.json (debug/test surface).
bun .claude/tools/amadeus-runtime.ts read <stage-slug>

# Print deterministic aggregates over runtime-graph.json: stage/phase
# outcome tallies, memory-entry counts by category, sensor 4-state
# tallies, learnings captured, and workflow duration. Read-only; the
# session skills (session-cost, replay, outcomes-pack) consume the
# --json shape so every number they render comes from here, not from
# LLM-side counting.
bun .claude/tools/amadeus-runtime.ts summary [--json]

# Byte-copy main runtime-graph.json into a Bolt's worktree fragment
# (one-shot; called by `amadeus-bolt start --worktree`). No audit emit —
# the fragment lifecycle rides on STATE_FORKED + AUDIT_FORKED.
bun .claude/tools/amadeus-runtime.ts fragment-fork --slug <kebab-slug>

# Remove the worktree fragment (idempotent; called by
# `amadeus-bolt complete --merge`). No audit emit — the fragment
# lifecycle rides on STATE_MERGED + AUDIT_MERGED. Main's runtime-graph
# is rebuilt event-source by the post-Bash compile hook on AUDIT_MERGED.
bun .claude/tools/amadeus-runtime.ts fragment-merge --slug <kebab-slug>
```

すべてのサブコマンドは、標準の cwd ベース解決を上書きする `--project-dir <path>` を受け付けます。

compile は通常運用ではフック駆動です。手動呼び出しはテストとデバッグのために存在します。

---

## 9. Why hook-driven, not LLM-tool-coupled

以前のプラン改訂では、`handleApprove` / `handleAdvance` / `handleComplete --merge` の内側に `spawnSibling(..., "amadeus-runtime.ts compile", ...)` 呼び出しを挿入することが提案されました。そのアプローチは [Plane Architecture](02-plane-architecture.md) に文書化された load-bearing な信条に違反します:

> 決定論が必要なところではツールを使う。知識が必要なところでは LLM/エージェントを使う。判断が必要なところでは人間を使う。

runtime-graph の compile は、特定のセッションの外側から観測可能でなければならないデータプレーンの基盤です。それを LLM が呼び出すツールに結合すると、LLM の抜けが決定論の保証を壊します — 人間が Approve をクリックした後にコンダクターが `amadeus-orchestrate.ts report --stage <slug> --result approved` を呼び忘れると、監査行は決して追記されず AND compile は決して発火しません。runtime-graph は静かに遅れ、recovery 基盤は破損します。

PostToolUse Bash フックは、LLM が次に何をしようと、コンダクターの実際のサブプロセス呼び出しで発火します。監査 emit 側のシーム(`bun amadeus-(state|jump|bolt|utility).ts`)が決定論的なアンカーです。

---

## 10. Known gaps closed by future PRs

- **MEMORY_EMPTY-rate メトリック** — milestone 14 の doctor が §5 で凍結された `(Stage, ISO-second)` の重複排除タプルを使ってレートを表面化します。
- **`learnings_captured` の由来カウント** — milestone 12 のゲート ritual が `from_orchestrator` と `from_user_addition` を populate します。
- **`sensor_firings` 配列** — milestone 9 + milestone 10 がセンサーをディスパッチし、このスロットを populate します。
- **runtime-graph.json の Bolt fork/merge** — v0.5.0 で `fragment-fork`(新しい監査イベントなし。STATE_FORKED + AUDIT_FORKED に乗る)と `fragment-merge`(新しい監査イベントなし。STATE_MERGED + AUDIT_MERGED に乗る)によって解決。compile は Construction ステージのウィンドウ内に2つ以上の異なる slug が座るとき、監査の BOLT_*-タグ付きイベントから `instances[]` を populate します。
- **ヘッドレス workflow のための CLI モードディスパッチ** — v0.6.0+ が非 Claude Code 実行パスを出荷する可能性があります。フックは Claude Code セッション内でのみ発火します。

---

## 11. Fragment lifecycle

Bolt ごとの runtime-graph フラグメントファイルは `<worktree>/<record>/runtime-graph.json` に存在し、gitignore され、main の場所をミラーします。そのライフサイクルは:

1. **Bolt 開始時の Fork。** `amadeus-bolt start --worktree --slug <slug>` は、state-fork + audit-fork の後に `amadeus-runtime fragment-fork --slug <slug>` へ委譲します。単一読み取りプロトコル: `readFileSync` で一度バッファに読み、バッファから `writeFileSync` でフラグメントパスへ書き、同じバッファをハッシュして stdout エンベロープにします。fork 途中で main を書き換える並行 compile に対するバイトコピー / ハッシュのレースを閉じます。main にまだ runtime-graph.json がなければ、フラグメントは worktree の状態カーソルにアンカーされた空グラフです。
2. **Bolt の生存中の Evolve。** PostToolUse compile フックは、worktree 内の遷移を含む遷移クラスの監査 emit ごとに発火します。各発火は worktree の runtime-graph.json(フラグメント)を worktree の監査ビューから再 compile します。フラグメントは、この Bolt の audit-fork 時点でアクティブだった兄弟について `instances[]` が populate された状態で終わることがあります。後から開始する兄弟はフラグメントに現れません。worktree の監査は fork 時点のスナップショットだからです。
3. **Bolt 完了時の Merge。** `amadeus-bolt complete --merge --slug <slug>` は、state-merge + audit-merge の後に `amadeus-runtime fragment-merge --slug <slug>` へ委譲します。fragment-merge は stdout 可観測性のためにフラグメントをハッシュし、`unlinkSync` で削除し、JSON エンベロープを発行します。親の Bash 呼び出しが返った後、compile フックが main 上で再発火し、たった今マージされた slug について `instances[]` が populate された状態で main の runtime-graph を再構築します。
4. **多層防御の削除。** `amadeus-worktree merge` と `amadeus-worktree discard` はどちらも `git worktree remove` を呼び、それが推移的にフラグメントを削除します。fragment-merge の明示的削除は、暗黙的クリーンアップと多層防御パターンとしてペアになり、state-merge と `git worktree remove` がすでに状態側でペアになっているのをミラーします。
5. **障害モード。** `fragment-fork` の失敗(worktree 欠落、フラグメント既存、バイトコピー IO エラー、spawn タイムアウト)は、`amadeus-bolt` に doctor 帰属のための `Reason: fragment-fork-*` フィールド付きの `BOLT_FAILED` を発行させます(IO / ガードエラーには `fragment-fork-failed`、spawn SIGTERM には `fragment-fork-timeout`)。state-fork + audit-fork はロールバックされ **ません**(それぞれがすでに自身の監査行を発行済み)。audit-merge がすでに到着した後の `fragment-merge` の失敗は、異常な部分成功の監査シグネチャ `BOLT_COMPLETED → STATE_MERGED → AUDIT_MERGED → BOLT_FAILED (Reason: fragment-merge-*)` を生みます(IO / ガードエラーには `fragment-merge-failed`、spawn SIGTERM には `fragment-merge-timeout`)。フラグメントファイルは暗黙的な `git worktree remove` クリーンアップまで存続します。main に対する後続の compile は一貫した runtime-graph を生みます(この位置の BOLT_FAILED はインスタンスを `"approved"` とスコアします。rollup における STATE_MERGED 優先が、Bolt のコンテンツがすでに main に伝播したことを反映するためです。ここの BOLT_FAILED は recovery テレメトリで、シームを記録するものであり、コンテンツ自体は無傷のままでした)。

---

## Next Steps

- **データプレーンがこの構造になっている理由** — `runtime-graph.json` を第2の真実のソースではなく `stage-graph.json` のミラーにする control/data プレーンの分離。[Plane Architecture](02-plane-architecture.md) を参照。
- **compile をトリガーするライフサイクル** — その監査 emit が compile フックを駆動する workflow / phase / stage の遷移。[State Machine](12-state-machine.md) を参照。
- **このグラフが導出される元の監査ログ** - 68 イベントの分類体系とエミッタレジストリ。[State Machine](12-state-machine.md) と User Guide の [State and Audit Trail](../guide/10-state-and-audit.md) を参照。
