# State Machine

> 言語: [English](12-state-machine.md) | **日本語**

本章は AI-DLC のステートマシン、監査イベントの分類体系、そしてそれらを結びつける規則 — **すべての状態遷移はちょうど1つのツールが所有するエミッタを持つ** — についての正典リファレンスです。本章の各テーブルをコードと同期させることは、`tests/integration/t48-audit-event-emitters.test.ts` のドリフトテストによって強制されます。ドキュメントとコードが食い違えば、t48 は失敗します。

3つの入れ子になったステートマシンが AI-DLC を駆動します: **workflow**、**phase**、**stage** です。4つ目の独立したストリームは、Claude Code のフックが発行する **session** イベントを記録します。これら4つのストリームは intent の監査証跡(record ディレクトリ配下の `audit/` シャードディレクトリ、`<record>/` = `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)を共有しますが、それぞれ異なるコードパスが所有します。したがって別々の関心事として読み、それらのタイムラインが交錯することを覚えておくのが最も分かりやすいです。

> **北極星となる不変条件:** TypeScript が決定論的な記録管理を所有し、LLM が判断を所有します。すべての監査発行はツールまたはフックに起源を持ち、LLM の散文を emit パスから排除します。MD ファイルを読んでいて `amadeus-audit.ts append <EVENT>` が散文の指示として書かれているのを見つけたら、それはバグです。
>
> **Audit-first アトミック性:** ツールは状態を変更する *前に* 監査エントリを発行します。監査発行が失敗した場合、ツールは状態に触れる前に例外を投げます — したがって監査シャードと状態ファイルが食い違うことはありません。本章末尾近くの[「Audit-first アトミック性」セクション](#audit-first-atomicity)が障害モードを詳述します。

---

## Why three state machines

workflow はフェーズを通過することで完了します。フェーズはスコープ内のステージを通過することで完了します。ステージはその承認ゲートが閉じたときに完了します。各レイヤーは異なる決定を所有します:

- **Workflow** — ジョブ全体は実行中か、完了か?
- **Phase** — このライフサイクルフェーズは進行中か、検証済みか、それともスコープが除外したためスキップされたか?
- **Stage** — ステージは作業中か、ユーザー待ちか、却下後に修正中か、それとも完了か?

これらを1つの状態フィールドに平坦化すると、それらの決定が混同されます。分離することで、`/amadeus --status` は「この workflow をブロックしているものは何か?」を1回の読み取りで答えられます: workflow `Running`、phase `Active`、stage `[?]` → 「\<stage\> の承認待ち」。

---

## Workflow machine

```mermaid
stateDiagram-v2
    [*] --> Running : WORKFLOW_STARTED
    Running --> Completed : WORKFLOW_COMPLETED
    Completed --> [*]
```

<!-- Text fallback: initial state transitions to Running on WORKFLOW_STARTED; Running transitions to Completed on WORKFLOW_COMPLETED; Completed is terminal. -->

**Status 値:** `Running`、`Completed`。

workflow は最初の intent が誕生したとき(`amadeus-utility intent-birth`、最初の `/amadeus` または `/amadeus-init` 経由で自動呼び出し)に開始し、最後のスコープ内ステージの承認ゲートが閉じたときに終了します。`Paused` ステータスも `Waiting for Approval` ステータスも存在しません — 承認はステージレベルの関心事であり、pause には UX がありません。

workflow の `Running` 状態は Claude Code のセッションをまたいで持続します。月曜に workflow を開始し、セッションを止め、火曜に再開する — workflow はまだ `Running` です。終了したのは *セッション* であり、新しいセッションが始まったのです。

| Transition | Trigger | Emitter |
|---|---|---|
| `[*] → Running` | `amadeus-utility init` | `tools/amadeus-utility.ts` |
| `Running → Completed` | `amadeus-state complete-workflow` | `tools/amadeus-state.ts` |

---

## Phase machine

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Active : PHASE_STARTED
    Pending --> Skipped : PHASE_SKIPPED
    Active --> Verified : PHASE_COMPLETED + PHASE_VERIFIED
    Verified --> [*]
    Skipped --> [*]
    note right of Verified
        At a phase boundary, advance
        emits PHASE_COMPLETED +
        PHASE_VERIFIED + PHASE_STARTED
        (next phase) in one transaction.
    end note
```

<!-- Text fallback: initial state transitions to Pending; Pending transitions to Active on PHASE_STARTED; Pending transitions to Skipped on PHASE_SKIPPED; Active transitions to Verified on PHASE_COMPLETED + PHASE_VERIFIED. At a phase boundary, advance emits PHASE_COMPLETED + PHASE_VERIFIED + PHASE_STARTED (next phase) atomically, chaining Verified back to the next phase's Pending-to-Active transition. -->

**Status 値:** `Pending`、`Active`、`Verified`、`Skipped`。

フェーズの状態は `amadeus-state.md` の `## Phase Progress` セクションで追跡されます。intent 誕生時にすべてのフェーズへ `Pending` を刻印し、スコープが除外する各フェーズに対して(いずれのステージが開始する前に)`PHASE_SKIPPED` を発行し、その後現在のフェーズを `Active` に昇格させます。フェーズ完了時にはフェーズ境界で `PHASE_COMPLETED` と `PHASE_VERIFIED` の両方を発火し、続いて次のフェーズに対して `PHASE_STARTED` を発火します。

| Transition | Trigger | Emitter |
|---|---|---|
| `Pending → Active` (最初のフェーズ) | `amadeus-utility intent-birth` | `tools/amadeus-utility.ts` |
| `Pending → Skipped` | `amadeus-utility intent-birth` (スコープ除外ごと) | `tools/amadeus-utility.ts` |
| `Active → Verified` | フェーズ境界での `amadeus-state advance` または `complete-workflow` | `tools/amadeus-state.ts` |
| `Pending → Active` (境界) | フェーズ境界での `amadeus-state advance`、または `amadeus-jump execute` | `tools/amadeus-state.ts`、`tools/amadeus-jump.ts` |

init→post-init の引き継ぎでは、`amadeus-utility intent-birth` 自身が最後の init ステージの後に `PHASE_COMPLETED + PHASE_VERIFIED + PHASE_STARTED + STAGE_STARTED` を発行します。これにより、誕生と最初の `advance` の間で監査証跡が沈黙する代わりに、その遷移を捕捉します。

---

## Stage machine

```mermaid
stateDiagram-v2
    state "[ ] Pending" as Pending
    state "[-] Active" as Active
    state "[?] AwaitingApproval" as Awaiting
    state "[R] Revising" as Revising
    state "[x] Completed" as Completed
    state "[S] Skipped" as Skipped

    [*] --> Pending
    Pending --> Active : STAGE_STARTED
    Active --> Awaiting : STAGE_AWAITING_APPROVAL
    Awaiting --> Completed : GATE_APPROVED + STAGE_COMPLETED
    Awaiting --> Revising : GATE_REJECTED + STAGE_REVISING
    Revising --> Awaiting : STAGE_AWAITING_APPROVAL
    Pending --> Skipped : STAGE_SKIPPED
    Active --> Skipped : STAGE_SKIPPED
    Revising --> Skipped : STAGE_SKIPPED
    Completed --> [*]
    Skipped --> [*]
```

<!-- Text fallback: [ ] Pending transitions to [-] Active on STAGE_STARTED. [-] Active transitions to [?] AwaitingApproval on STAGE_AWAITING_APPROVAL. [?] AwaitingApproval transitions to [x] Completed on GATE_APPROVED + STAGE_COMPLETED, or to [R] Revising on GATE_REJECTED + STAGE_REVISING. [R] Revising transitions back to [?] AwaitingApproval on STAGE_AWAITING_APPROVAL (re-entry). Any of Pending / Active / Revising can transition to [S] Skipped via STAGE_SKIPPED. -->

**チェックボックス凡例(`amadeus-state.md` 内):**

| Checkbox | State | Meaning |
|---|---|---|
| `[ ]` | `Pending` | 未着手 |
| `[-]` | `Active` | 進行中 |
| `[?]` | `AwaitingApproval` | ステージ作業完了、ゲートオープン — ユーザーがブロッカー |
| `[R]` | `Revising` | ユーザーがゲートを却下 — 再入前にステージを修正中 |
| `[x]` | `Completed` | 承認済みで完了 |
| `[S]` | `Skipped` | スコープで除外、jump でスキップ、または実行途中でカット |

`[?]` と `[R]` は、そうでなければ両方とも `[-]` に見える2つの状況を区別します。再開時、`[R]` はコンダクターに対し、ステージをゼロから再実行するのではなく、ゲートに再入する前に以前の成果物とフィードバックを提示するよう伝えます。

| Transition | Trigger | Emitter |
|---|---|---|
| `Pending → Active` | `amadeus-state advance <slug>` | `tools/amadeus-state.ts` |
| `Active → AwaitingApproval` | `amadeus-state gate-start <slug>` | `tools/amadeus-state.ts` |
| `AwaitingApproval → Completed` | `amadeus-state approve <slug>` | `tools/amadeus-state.ts` |
| `AwaitingApproval → Revising` | `amadeus-state reject <slug> --feedback <text>` | `tools/amadeus-state.ts` |
| `Active → Revising` | gate-start がスキップされたときの `amadeus-state reject <slug>` — reject が却下ペアの前に欠落した `STAGE_AWAITING_APPROVAL`(`Recovered=true` タグ付き)をバックフィルする | `tools/amadeus-state.ts` |
| `Revising → AwaitingApproval` | `amadeus-state revise <slug>` (ゲート再入) | `tools/amadeus-state.ts` |
| `{Pending,Active,Revising} → Skipped` | `amadeus-state skip <slug> --reason <text>`、または `amadeus-jump execute` | `tools/amadeus-state.ts`、`tools/amadeus-jump.ts` |

`approve` コマンドはゲート後の遷移全体を所有します: `GATE_APPROVED + STAGE_COMPLETED` を発行し、その後スコープ内の次のステージへ自動的に進行し(`handleAdvance` に委譲)、`STAGE_STARTED` に加えてフェーズ境界では任意の `PHASE_*` イベントを発行します。スコープ内の最終ステージでは、approve は代わりに `complete-workflow` に委譲し、`PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED` を発行して Status=Completed を設定します。コンダクターは `approve` の後に `advance` を呼び出しません — approve はゲート応答から次のステージの `[-]` までのすべてを所有します。`advance` コマンドは非ゲート遷移(Initialization ステージ、construction bolt)のために残されており、すでに `[x]` の slug に対して冪等です(重複する `STAGE_COMPLETED` を抑制します)。

**Artifact guard (issue #366).** ステージを `[x]` としてマークするすべての遷移(`approve`、`advance`、`finalize`、`complete-workflow`)は、完了させる前に決定論的な成果物チェックを実行します。これにより、ディスク上に作業の証拠なしにステージを `[x]` としてマークすることはできません(完了サブコマンドがガードなしの裏口となることはありません)。`produces[]` を宣言するステージは、それらの成果物のうち少なくとも1つが存在していなければなりません(アクティブな intent の record ディレクトリ `amadeus/spaces/<space>/intents/<slug>-<id8>/<phase>/<slug>/` 配下、ユニットごとの Construction ステージについてはその record の `construction/<unit>/<slug>/`、あるいは codekb ステージについては `amadeus/spaces/<space>/codekb/<repo>/`)。`workspace_requires: true` のステージは、加えて `amadeus/` ワークスペースツリーおよびハーネスディレクトリの外側での実際のソース作業の証拠を示さなければなりません。git ワークスペースではそれはコミットされていない/追跡されていない非ドキュメント変更、または直近のコミット内の非ドキュメントパスを意味します(これにより本セッションのコードをブラウンフィールドのベースラインと区別しつつ、commit-then-approve を通します)。それ以外の場合はシェルを使わないファイルシステム存在チェックです。チェックが失敗すると、コマンドは非ゼロで終了し何も書き込みません: 遷移は拒否されます(`Refusing to complete "<slug>": ...`)。`produces[]` を宣言しないステージ(Initialization フェーズ)は空虚に通過します。`AMADEUS_SKIP_ARTIFACT_GUARD=1` でバイパスします。

**Park (issue #365/#367/#3016).** `amadeus-orchestrate park`はstageを進めずに`Parked` / `Parked At Stage` runtime markerを書きます(`amadeus-state.ts park`経由で`WORKFLOW_PARKED`を発行)。続く素の`next`は終端の`parked` directiveを再発行します。`Construction Autonomy Mode: autonomous`の下では、activeなrecordのpresence ledgerに**未消費の`HUMAN_TURN`**が残っている場合にのみparkを受理します — そのturnを打った人間がparkの主体だからです。受理されたparkはそのturnを消費するため(`WORKFLOW_PARKED`はpresence resolutionです)、1つのturnが認可するparkはちょうど1回です。未消費turnを持たない真に無人の実行は従来どおり拒否され、exitは非ゼロでmarkerも書かれません(engineはこの拒否を`kind:"error"`として中継します)。判定はfail-closedで、ledger不在はturn不在として扱い、`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`でもbypassできません。Intent autonomyは別途、`REPAIR_STALLED`や`NORM_CONFLICT`など明示的な安全停止理由へdurableなsuspended projectionを使います。Stop hookは発行済み`parked` directiveを全modeで許可し、activeな`full` grantはrevokeまたはcompleteまでworkflow実行状態とは独立してactiveを維持します。

**完了待ち状態 (issue #2251).** 最終 in-scope ステージの承認から completion transaction のコミットまでの間、ワークフローは正規の窓に入ります: 最後のステージが `[x]` である一方 `Status` はまだ `Running` です。この窓での単純な `next` — および goal reconciliation authority や persisted mirror boundary が settle を拒否した completion — は終端の `await-completion` directive を発行します。その `reason` は条件と、それを settle させるコマンド(`complete-workflow`、またはそれが指す goal lineage の回復)を名指しします。`complete-workflow` 自身も同じ拒否に対し同じ typed shape を stderr へ返し、非ゼロ終了かつ state 無変更の fail-closed を維持します。これらは失敗したステップではなく想定内の待ち状態であるため、いずれも `ERROR_LOGGED` を記録しません — 従前はこの窓へ `next` するたびに新しい `amadeus.operation.failed` 行が追記されていました。真のエンジンエラーは `error` directive とその記録契約(issue #839)を変更なく維持します。

### Revision loop

```
gate-start  →  [?] AwaitingApproval
          ↘ reject  →  [R] Revising  (Revision Count += 1)
                   ↓ revise
                   [?] AwaitingApproval
                   ↘ approve  →  [x] Completed
```

`Revision Count` は状態ファイルに存在し、各 `reject` でインクリメントされます。コンダクターはこれを使って revision-loop の脱出ハッチを検出します(デフォルトは skip を提案する前に3サイクル)。

### Skeleton stance

`amadeus-state set-skeleton-stance <on|off|scope-dependent>` は、コンダクターが分類した walking-skeleton スタンスを `Skeleton Stance` フィールドに記録します。`Revision Count` と同様、これは状態ファイルに存在するランタイムメタデータであり、イベントに乗らず**監査行(audit row)を発行しません**。したがって下記の監査イベントタクソノミー表には現れません。これは状態機械の遷移ではなく、次の `amadeus-orchestrate next` が読み取って遅延された Construction Bolt-1 ゲート(walking-skeleton ラダー)を解決するための値です。classify のラウンドトリップが、この intent のスコープがゲート付き walking-skeleton Bolt 1 を要するかどうかを永続化し、`scope-dependent` はスコープマッピングのデフォルト(greenfield → skeleton-on、incremental → skeleton-off)にフォールバックします。

### 計画整合ガード(issue #1892)

コンパイル済み Bolt DAG の `batches` は、何が並列に走るかについての計画の宣言です。従来、実行をその宣言に縛るものはありませんでした。計画が並列と宣言したバッチを 1 ユニットずつ発行しても、記録にはその逸脱が一切現れませんでした。2 つのガードがこれを塞ぎます — 1 つはバッチの発行前、もう 1 つはそれを構築したステージの承認前です。

すべてのガードメッセージは単一のテンプレートによって同じ部品から組み立てられ、出口が別々の方言へ分岐しないようにします:

| 部品 | マーカー | 内容 |
|---|---|---|
| 観測 | `Observed:` + space | エンジンが実測したもの — 宣言バッチ番号、その幅、ユニット名 |
| 重み | `Why this matters:` + space | その不一致がなぜ停止に値するか |
| 出口 | `Approved exit:` + space | 唯一の承認された出口 |

**発行時ガード。** Construction ステージをファンアウトしうる `next` はすべて単一の発行点を通るため、判断は 1 箇所に存在し、2 つのコピーの間で乖離しません。エンジンがファンアウトを見送ったとき、その見送り理由と**宣言**バッチ(未被覆の残りではなくユニット全数 — そうでなければ 1 ユニットを構築済みの幅 2 バッチが直列に見えてしまいます)が純粋な verdict へ渡されます:

| Verdict | 条件 | ディレクティブ |
|---|---|---|
| `ok` | 宣言バッチがない、バッチ幅が 1 ユニット、または計画上直列である見送り: swarm ステージでない、walking-skeleton ゲート、skeleton 出荷前の未設定グラント、コンパイル済み DAG なし、全ユニット被覆済み | 変更なしの run-stage 発行 |
| `redirect` | walking skeleton 出荷後に自律グラントが未設定 — ラダーの回答が未済 | `ask`(自律ラダーの出口を明示) |
| `violation` | 計画が並列と宣言したバッチに対するそれ以外の見送り | `error`(計画訂正の出口を明示) |

後から分岐なしで追加された見送り理由は、黙って直列化されるのではなく `violation` に落ちます。

**承認時突合。** ゲート付き code-generation の approve で、エンジンは宣言バッチを監査証跡と突き合わせて読み直します。照合キーは **Unit 名**です: 宣言バッチが充足されるのは、ある 1 つの `SWARM_STARTED` 行がそのバッチの Unit を**まとめて**名指しし(ファンアウト)、**かつ**それらの Unit が `SWARM_COMPLETED` を持つ**1 つのバッチの下でまとめて** converged している(referee がまとめて終えた)場合です。両側をグループ単位にしているのは意図的です — 放棄された幅広 prepare(完了しなかった開始行)と 1 Unit ずつの N 回の再ディスパッチの組み合わせは、そうでなければ「まとめて名指しされた」と「各 Unit が converged した」の両方を満たしてしまい、実行は直列だったのに通ってしまいます。読み取りは全シャードを横断します。ある worktree で prepare され別の worktree で finalize されたバッチは、その行を 2 つのファイルに残すためです。`SWARM_DEGRADED` に専用の腕は要りません — `prepare` はバッチ開始行の**代わりではなく追加で** degrade 行を出すため、degrade したバッチも自分の Unit 名を供給します。計画が並列と宣言したのにファンアウトの記録がないバッチは approve を拒否し、最初の 1 件ではなく未充足のバッチ全数を名指しします。1 Unit ずつの N 回のファンアウトは幅のあるバッチを充足しません — どの行もその Unit をまとめて名指ししていないからです。walking-skeleton ゲートステージは適用除外です。エンジン自身がそこでのファンアウトを拒否するため、SWARM 行がないことは逸脱ではなく遵守だからです。バッチ番号でなく Unit で照合することが、再ディスパッチ(conductor の `prepare --batch` カウンタが進み、以降の行が全てずれる)を直列実行と読み違えないための要点です — [#2354](https://github.com/amadeus-dlc/amadeus/issues/2354) が実測した偽拒否がそれです。既知の制約は 1 つ残ります: 証跡は append-only のため、replan 後は旧計画の SWARM 行が同じ Unit を充足しえます — 実績と compile 世代の相関付けは [#1953](https://github.com/amadeus-dlc/amadeus/issues/1953) で追跡しています。

**出口。** `redirect`には`amadeus-bolt set-autonomy --mode none|semi|full`でIntent自律レベルを選択して答え、`next`を再実行します。`full`ではさらに、表示されたIntent-scoped grantを実在するhuman turnで確認する必要があります。`violation` と拒否された approve には、実行ではなく計画を訂正して答えます。それらのユニットを直列にする依存関係を、その理由とともに `unit-of-work-dependency.md` に記録し、`amadeus-runtime.ts compile` を再実行してから `next` を再実行します。計画が正しく逸脱が意図的である場合は、先に裁定にかけてください。

**absence と defect。** ガードは判定の基準となる宣言幅を必要とするため、コンパイル済み DAG がない実行は決して violation になりません。コンパイルは DAG が欠ける 2 通りを区別します。正当な absence はちょうど 2 状態に限られます — スコープが units-generation をスキップする(`scope-skips-units`)、またはステージがまだ成果物を produce していない(`units-pending`)— そして理由を `bolt_dag_absence` に記録して exit 0 で終わります。それ以外はすべて defect で、コンパイルを失敗させ、グラフを書かず(stale なグラフは除去し)、非ゼロで終了します: units-generation completed 後の成果物欠落、不整形なエッジブロック、循環したエッジブロックです — [Runtime Graph](13-runtime-graph.ja.md) § "The Bolt/unit dependency DAG (`bolt_dag`)" を参照してください。

### 旧スタンディング委任グラント(#1125)

スタンディング委任グラントは認可機構として廃止されています。`grant-standing-delegation`と`revoke-standing-delegation`のコマンド、grant carrier、route receipt、active grantのdoctor表示は存在しません。既存の`GRANT_ISSUED`、`GRANT_REVOKED`、`GATE_AUTHORIZATION_SELECTED`観測はreplay・migration projectionコードだけが読み取ります。これらが認可を生成・復元することはなく、`full` grantへ自動変換されることもありません。

- `semi`はgrantを発行せず、従来のphase内gate省略用途を置き換えます。`full`は1つのIntent UUIDへ束縛された新しいIntent-scoped grantを使い、TTL・使用回数budgetを持ちません。発行、置換、行使、revoke、completeはcanonical audit transactionです。

---

## Session stream (hook-owned, independent)

session イベントは AI-DLC ツールではなく Claude Code のフックが発行します。session は単一の Claude Code 会話であり、workflow は長命のディレクトリ状態です。関係は多対多です — 1つの workflow は複数のセッションにまたがることができ、1つのセッションは複数の workflow に触れることができます — したがってストリームは設計上独立しています。

| Event | Emitter | Trigger |
|---|---|---|
| `SESSION_STARTED` | `hooks/amadeus-session-start.ts` | `source=startup` または `clear` の `SessionStart` |
| `SESSION_RESUMED` | `hooks/amadeus-session-start.ts` | `source=resume` の `SessionStart` |
| `SESSION_COMPACTED` | `hooks/amadeus-validate-state.ts` | `PreCompact` — 確実に捕捉されるよう compaction 時に発火 |
| `SESSION_ENDED` | `hooks/amadeus-session-end.ts` | `SessionEnd` |

session フックは発行前にアクティブな intent の `amadeus-state.md`(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` 配下)をチェックします。そのようなファイルが存在しない場合(cwd にアクティブな AI-DLC workflow がない場合)、フックはいずれの監査ログにも書き込まずに静かに終了します。session イベントはアクティブな workflow のタイムラインに注釈を付けるために存在します — workflow のないディレクトリのセッションには注釈すべきものがありません。

### Compaction awareness

`amadeus-state.ts resume` は監査末尾をスキャンして最新の `SESSION_COMPACTED` を探します。それに続くステージアクティビティ(`STAGE_STARTED`、`STAGE_COMPLETED`、`GATE_APPROVED`、`SESSION_RESUMED`、`RECOVERY_COMPLETED`)がない場合、resume は `compaction_pending: true` を返し、コンダクターは続行前に3択のプロンプト(continue / review / restart)を提示します。`RECOVERY_COMPLETED` はユーザーがオプションを選択すると `acknowledge-compaction` によって発行され、アクティビティゲートを満たすため、後続の compaction が新しい境界を検出できます。

---

## Audit event taxonomy

正典のイベントセット(`audit-format.md` レジストリで定義)を、以下では表現上のカテゴリにグループ化しています — 正典レジストリは独自のグループ化を使います。グループ化は表現上のものであり、イベントセットが不変条件です。すべてのイベントはちょうど1つのツールまたはフックのエミッタを持ちます。ただし、来たるリリース向けに事前登録され、Emitter セルが `Reserved (v0.4.0 PR N)`、`Reserved (v0.5.0 PR N)`、または `Reserved (v0.6.0 PR N)` と読めるイベントは例外です — これらはコンシューマ PR がエミッタを出荷するまで、ドリフトテストの forward チェックでスキップされます。ドリフトテスト `tests/integration/t48-audit-event-emitters.test.ts` は、本章のテーブルとコードの間の forward/reverse/tertiary/pairing/MD-MD の一貫性を強制します。

### Workflow lifecycle

| Event | Emitter | Notes |
|---|---|---|
| `WORKFLOW_STARTED` | `tools/amadeus-utility.ts` | すべての intent 誕生で必須の最初のイベント |
| `WORKFLOW_COMPLETED` | `tools/amadeus-state.ts` |  |
| `WORKFLOW_PARKED` | `tools/amadeus-state.ts` | `park` - 後のセッション向けに実行途中で park された workflow。ステージ進行なし |
| `WORKFLOW_UNPARKED` | `tools/amadeus-state.ts` | `unpark` - 明示的な `--resume` 再入時に park マーカーがクリアされた |
| `WORKFLOW_WAITING_ENTERED` | `tools/amadeus-intent-autonomy-production.ts` | `enterProductionWaiting` マーカー - 非対話 run が自ら下せない裁定で停止した(RFC-0001 FR-3/ADR-4)。正本は台帳トランザクションで、この行はその投影 |
| `WORKFLOW_WAITING_RESUMED` | `tools/amadeus-intent-autonomy-production.ts` | waiting 再開マーカー - waiting record が再提示され裁定された |
| `INTENT_ARCHIVED` | `tools/amadeus-state.ts` | 人間が承認した archive トランザクション。operation ID ごとに1回発行 |
| `INTENT_UNARCHIVED` | `tools/amadeus-state.ts` | 人間が承認した unarchive トランザクション。operation ID ごとに1回発行 |
| `EXECUTION_EVENT_SET_COMMITTED` | `tools/amadeus-execution-lifecycle.ts` | 正典の audit-first 実行ライフサイクルイベントセットを原子的に記録 |

### Phase lifecycle

| Event | Emitter | Notes |
|---|---|---|
| `PHASE_STARTED` | `tools/amadeus-utility.ts`、`tools/amadeus-state.ts`、`tools/amadeus-jump.ts` | init での最初の発火。以降の発火はステージツールのフェーズ境界で |
| `PHASE_COMPLETED` | `tools/amadeus-utility.ts`、`tools/amadeus-state.ts`、`tools/amadeus-jump.ts` | すべての境界で `PHASE_VERIFIED` とペア |
| `PHASE_VERIFIED` | `tools/amadeus-utility.ts`、`tools/amadeus-state.ts`、`tools/amadeus-jump.ts` | 常に `PHASE_COMPLETED` とペア |
| `PHASE_SKIPPED` | `tools/amadeus-utility.ts` | スコープ除外フェーズごとに1つ、intent 誕生時に発行 |

### Stage lifecycle

| Event | Emitter | Notes |
|---|---|---|
| `STAGE_STARTED` | `tools/amadeus-state.ts`、`tools/amadeus-utility.ts`、`tools/amadeus-jump.ts` | `[ ]` → `[-]` をマーク |
| `STAGE_AWAITING_APPROVAL` | `tools/amadeus-state.ts` | `gate-start`(初回入場)、`revise`(却下後の再入場)、`reject`(gate-start がスキップされたときのバックフィル)。バックフィルされた行 — `gate-start --recovered`(report の明示ステージ recovery)と reject の自己修復 — は `Recovered=true` を持つ。有機的な gate-start と revise 再入場は持たない |
| `STAGE_COMPLETED` | `tools/amadeus-state.ts`、`tools/amadeus-utility.ts` | `approve` によって `GATE_APPROVED` とアトミックに発行。approve が `[x]` を事前マークしなかった場合は `advance` によっても発行 |
| `STAGE_REVISING` | `tools/amadeus-state.ts` | `GATE_REJECTED` とペア |
| `STAGE_SKIPPED` | `tools/amadeus-state.ts`、`tools/amadeus-jump.ts` | `[S]` 遷移ごとに1つ |
| `STAGE_JUMPED` | `tools/amadeus-jump.ts` | `--stage`/`--phase` jump で宛先 slug を記録 |
| `GUARD_EXEMPTED` | `tools/amadeus-state.ts` | intent が registry の docs-only 宣言を持つとき、`verifyStageArtifacts` が `workspace_requires` ステージ完了の拒否を免除する。`Stage` と宣言の `Evidence` を持つ(#499/#848) |

### Gate decisions

| Event | Emitter | Notes |
|---|---|---|
| `GATE_APPROVED` | `tools/amadeus-state.ts` | `--user-input` が正確な選択を捕捉。`Approval Provenance` は承認を通した分岐を示す — `gate-open-turn`(ローカルの HUMAN_TURN)、`delegated`(検証済みの委譲)、`intent-grant`(Intent autonomy による裁定)、`guard-disabled`(`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`)(#3153) |
| `GATE_REJECTED` | `tools/amadeus-state.ts` | `--feedback` が却下理由を捕捉 |
| `DELEGATED_APPROVAL` | `tools/amadeus-state.ts` | `delegate-approval` が leader セッションの人間承認を、リモートの conductor intent の監査ディレクトリへ記録。conductor のゲートが検証する発行元 `(space, intent, shard, HUMAN_TURN タイムスタンプ)` を保持(#671) |
| `DELEGATED_REJECTION` | `tools/amadeus-state.ts` | `delegate-rejection` が leader セッションの人間却下を、リモートの conductor intent の監査ディレクトリへ記録。`DELEGATED_APPROVAL` の verb 対称ミラーで、reject ゲートのみを開く(#685) |
| `GRANT_ISSUED` | Reserved legacy observation | replayとmigration projectionコードだけが読む過去の常任グラント証跡 |
| `GRANT_REVOKED` | Reserved legacy observation | 過去のrevoke証跡。live emitterは存在しない |
| `GATE_AUTHORIZATION_SELECTED` | Reserved legacy observation | 過去のroute証跡。live emitterは存在しない |

### User interaction

| Event | Emitter | Notes |
|---|---|---|
| `DECISION_RECORDED` | `tools/amadeus-log.ts` | オプションを捕捉するため `AskUserQuestion` の前に発火 |
| `QUESTION_ANSWERED` | `tools/amadeus-log.ts` | ユーザー応答の後に発火 |

#### advisory choice の受理

チェックポイントで hold したプラグイン advisory は、ちょうど2つの選択肢 — `run-now`(今すぐ実行する)と `defer-with-risk`(リスクを承知して延期する)— を人間へ問います。その回答の受理は `tools/amadeus-advisory-choice.ts` が所有し、意図的に狭く作られています。advisory choice が受理されるのは、実在の human turn へ結び付けられる場合だけです。

受理経路は2つあります。**prompt 経路**(`recordProtectedAdvisoryChoice`)はユーザーのターン本文を選択肢語彙と厳密照合します — `1`・`run-now`・日本語ラベル、`defer-with-risk` 側も同様 — それ以外は受理しません。言い換えは choice ではありません。**`record` verb** は明示経路です。

```
bun .claude/tools/amadeus-advisory-choice.ts record \
  --advisory-instance <id> --choice run-now
```

両経路とも receipt を `HUMAN_TURN` へ束縛します。prompt 経路は、その turn が自クローン自身の audit シャードに在ることを要求し、記録済み `HUMAN_TURN` ブロックの hash から event identity を再導出し、既に別の receipt で使用済みの turn identity を拒否します — 1つの human turn が答えるのは1つの advisory です。さらに両経路とも、対応する advisory 提示の実在を要求します。何も表示されていないターンから choice を収穫することはできません。

受理は **choice について冪等** です。同一 advisory instance へ同じ choice を再記録すると既存 receipt が `idempotent: true` とともに返り、既に receipt を持つ instance へ *異なる* choice を記録しようとすると、上書きではなく拒否になります。`defer-with-risk` の receipt は問いを閉じます。`run-now` の receipt が新たな choice を受け付けるのは、それが認可した実行が実際にはクリーンな結果を出さなかった場合だけです。

`correct-misattributed` は唯一の取消経路であり、あらゆる側から囲われています。対象は `run-now` receipt に限り、それを根拠づける対応提示が存在しないときに限り、かつその試行のエビデンスが存在しないときに限ります。receipt は削除されず、理由 `misattributed-unpresented-choice` とともに revoked として印されます。これらの経路はすべて audit ロック下で走ります。

#### store の schema と移行経路

choice store(`<record>/.amadeus-advisory-choice.json`)は **schema 2** です。schema 1 の receipt は provenance が裸の `humanTurn` でしたが、schema 2 は **provenance union** — `{ kind: "human-turn", … }` または `{ kind: "auto-decision", … }` — を持ちます。これにより、人間経路と autonomy ladder の無人経路を1つの受理関数が覆います。pending advisory は移行しておらず、schema 2 の store の中でも `schema: 1` のままです。

ディスク上の schema 1 store は **読み替えません**。parse に失敗し、各リーダーはそれを fail-closed な hold に変えます — union のもとで `humanTurn` だけの receipt が何を意味するかを推測しないためです。この拒否は正しいのですが、それ単体では行き止まりでもあります。移行前の store を持つ intent では `report` が `advisory choice evidence is invalid: …` を返し続け、どの回答もそれを解消できません。

`recover-schema-1` はその状態からの移行経路です:

```sh
bun .claude/tools/amadeus-advisory-choice.ts recover-schema-1 \
  [--project-dir <path>]
```

対象は **単一** の store — アクティブ intent のもの、または `--project-dir` が指すもの — に限られます。pending advisory を schema 2 store と同じパーサで salvage し、schema 1 の receipt は翻訳せず **破棄** し、schema 2 の store を書きます。破棄は代償ではなく目的です。receipt を持たない advisory はチェックポイントが再び問うものであり、それは fail-closed hold が意図していた「人間にもう一度聞く」と同じ状態だからです。

書き込みの前に、store がアクティブ intent のものであることを検査し、そうでなければ何も変えずに loud に拒否します — 古い intent カーソル越しに辿り着いた store を事故で空にすることはありません。検査は salvage した pending から intent run を読み、pending が1件も無い場合は receipt から読みます。receipt しか無い store は、まさに pending の検査が空振りしつつ中身の全部が破棄されようとしている場合だからです。receipt から intent run を読むのは安全のための読み取りであって翻訳ではありません — その receipt が何を意味したかは一切解釈しません。intent run を読めない receipt もまた回復を拒否します。receipt しか無い経路では所有者を名指す pending が存在しないため、その receipt を読み飛ばすことは「誰のものか確認しないまま削除する」ことに等しく、沈黙は帰属の証拠にならないからです。結果は変化した内容を明示します: `receipts_dropped`、`re_presentation_required`(open な advisory を salvage しなかった場合は false — store は次に備えて正常化されるだけです)、そして `run_now_receipts_reset`(形式検査ルートの試行番号は、いま破棄された `run-now` receipt から導出されるため)。

### Scope and configuration

| Event | Emitter | Notes |
|---|---|---|
| `SCOPE_DETECTED` | `tools/amadeus-utility.ts` | `detect-scope` サブコマンド。`Source` フィールドが由来を記録(freeform / keyword / env / cli) |
| `SCOPE_CHANGED` | `tools/amadeus-utility.ts` | アクティブな workflow での `scope-change` サブコマンド |
| `DEPTH_CHANGED` | `tools/amadeus-utility.ts` | `config-change --depth` |
| `TEST_STRATEGY_CHANGED` | `tools/amadeus-utility.ts` | `config-change --test-strategy` |
| `RECOMPOSED` | `tools/amadeus-utility.ts` | `recompose` サブコマンド - 適応的コンポーザーの実行中プラン再形成(監査ロック下で pending ステージのサフィックスが反転) |

### Artifacts

| Event | Emitter | Notes |
|---|---|---|
| `ARTIFACT_CREATED` | `hooks/amadeus-audit-logger.ts` | 新規パスへの書き込み — `mtimeMs == birthtimeMs` の stat チェックで UPDATED と区別 |
| `ARTIFACT_UPDATED` | `hooks/amadeus-audit-logger.ts` | Edit ツール、または既存ファイルを上書きする Write |
| `ARTIFACT_REUSED` | `tools/amadeus-state.ts` | `reuse-artifact` サブコマンド — keep/modify/redo の決定 |

### Construction Bolts

| Event | Emitter | Notes |
|---|---|---|
| `UNIT_OUTCOME_SETTLED` | `tools/amadeus-orchestrate.ts` | エンジン自身の per-unit dispatch 経路が Unit の outcome を確定した — coverage 成立境界での `succeeded`、および failure ruling が cancel した Unit の `cancelled`。stage・Unit・batch・revision を鍵とするため観測が変わらなければ行は増えず、変わった場合は supersede する。Unit pool ストリームにその Unit の terminal が無い場合にのみ読まれる |
| `BOLT_STARTED` | `tools/amadeus-bolt.ts` | 並列バッチ用の CSV bolt 名を受け付ける |
| `BOLT_COMPLETED` | `tools/amadeus-bolt.ts` | 先行する `BOLT_STARTED` とペア |
| `BOLT_FAILED` | `tools/amadeus-bolt.ts`(`fail` + `abort`) | `--succeeded-siblings` が並列バッチの生存者を捕捉。`abort` はサブ分類のため `Reason: aborted` フィールドを追加 |
| `AUTONOMY_MODE_SET` | Reserved legacy observation | 過去の Construction モード証跡は replay と doctor 診断のため読み取り可能なまま維持するが、権限の発行・復元には使わない |

### Session

| Event | Emitter | Notes |
|---|---|---|
| `SESSION_STARTED` | `hooks/amadeus-session-start.ts` | `source=startup` または `clear` |
| `SESSION_RESUMED` | `hooks/amadeus-session-start.ts` | `source=resume` |
| `SESSION_COMPACTED` | `hooks/amadeus-validate-state.ts` | 重複を避けるため PreCompact 時(次の SessionStart 時ではなく)に発行 |
| `SESSION_ENDED` | `hooks/amadeus-session-end.ts` | Claude Code からの `Reason` フィールドを含む |
| `HUMAN_TURN` | `hooks/amadeus-mint-presence.ts`(+ ハーネスごとの prompt-submit アダプタ) | 実際の人間プロンプトまたは回答済み質問ウィジェットごとに1つ。承認/インタビューゲートは前回のゲート解決以降に1つを要求する |
| `SUBAGENT_COMPLETED` | `hooks/amadeus-log-subagent.ts` | SubagentStop フック経由でサブエージェント完了を記録 |

### Diagnostics and workspace

| Event | Emitter | Notes |
|---|---|---|
| `HEALTH_CHECKED` | `tools/amadeus-utility.ts` | `--doctor` 実行 |
| `WORKSPACE_SCAFFOLDED` | `tools/amadeus-utility.ts` | init によって作成された新規ディレクトリツリー |
| `WORKSPACE_SCANNED` | `tools/amadeus-utility.ts` | ブラウンフィールドワークスペース検出完了 |
| `WORKSPACE_INITIALISED` | `tools/amadeus-utility.ts` | 状態ファイルが実体化された |

### Error and recovery

| Event | Emitter | Trigger |
|---|---|---|
| `ERROR_LOGGED` | `tools/amadeus-lib.ts`(すべてのツールの `error()` からの `emitError` 経由) | 非ゼロ終了のため `error(msg)` を呼ぶ任意のツール CLI。ベストエフォート — cwd に workflow がなければ no-op、再帰に対してガード済み |
| `RECOVERY_COMPLETED` | `tools/amadeus-state.ts` | ユーザーが compaction-awareness の `AskUserQuestion` に回答した後、コンダクターが呼ぶ `acknowledge-compaction --choice <continue\|review\|restart>`。加えて `session-takeover --confirm` が、陳腐化した Kimi 呼び出し元 carrier の再バインド成立をゲートが確認した時点で発行する(`Reason` = 修復した拒否原因を伴う) |

### Worktree

3つの `WORKTREE_*` 行は `amadeus-worktree.ts`、`STATE_*` は `amadeus-state.ts`(状態 fork/merge)、`AUDIT_*` は `amadeus-audit.ts`(監査 fork/merge)から発行されます。t48 forward チェックは Emitter セルがまだ `Reserved` と読める行をスキップします。

| Event | Emitter | Trigger |
|---|---|---|
| `WORKTREE_CREATED` | `tools/amadeus-worktree.ts` | Bolt 開始時に main から作成される Bolt ごとの git worktree(サブコマンド: `create`) |
| `WORKTREE_MERGED` | `tools/amadeus-worktree.ts` | ゲート承認時に main へマージし戻される Bolt の worktree(サブコマンド: `merge`) |
| `WORKTREE_DISCARDED` | `tools/amadeus-worktree.ts` | 中止された Bolt の worktree を明示的に削除(サブコマンド: `discard`) |
| `STATE_FORKED` | `tools/amadeus-state.ts` | Bolt 開始時に worktree へ fork される状態ファイル(サブコマンド: `fork`) |
| `STATE_MERGED` | `tools/amadeus-state.ts` | ゲート承認時に main へマージし戻される worktree の状態。多層防御としてアルファベット順 slug のタイブレーク(サブコマンド: `merge`) |
| `AUDIT_FORKED` | `tools/amadeus-audit.ts`(`audit-fork`) | Bolt 開始時に worktree へ fork される監査ログ。audit-of-intent — emit がバイトコピーに先行 |
| `AUDIT_MERGED` | `tools/amadeus-audit.ts`(`audit-merge`) | ゲート承認時に main 監査へ追記される worktree の監査エントリ。Bolt ごとのエントリ順序は保持、Bolt 間の順序はマージ完了順を反映 |

### Practices

ステージ 2.2 practices-discovery と Construction オーケストレーターランタイムから発行されます。

| Event | Emitter | Trigger |
|---|---|---|
| `PRACTICES_DISCOVERED` | `tools/amadeus-state.ts` `practices-event --type discovered` | ブラウンフィールド発見 + ドラフト完了。ステージ 2.2 ゲートで承認待ちのチームプラクティスドラフト |
| `PRACTICES_AFFIRMED` | `tools/amadeus-state.ts` `practices-promote` | チームがプラクティスを承認。intent の `inception/practices-discovery/` から space メモリ層(`amadeus/spaces/<space>/memory/team.md` および `memory/project.md`)へコンテンツを昇格 |
| `PRACTICES_OVERRIDE` | `tools/amadeus-state.ts` `practices-promote`(write-failure パス)および `tools/amadeus-state.ts` `practices-event --type override`(bolt-plan-marker-conflict パス — 別イベントなしで `Reason` フィールドによる discriminator-field 曖昧性解消) | いずれか: ステージ 2.2 affirmation 中に cross-row 昇格が失敗した(Reason: `write-failure-*`)、または `amadeus/spaces/<space>/memory/team.md` の walking-skeleton スタンスが現在の Bolt に対して bolt-plan のマーカーを上書きした(Reason: `bolt-plan-marker-conflict`) |
| `PRACTICES_SECTION_EMPTY` | `tools/amadeus-state.ts` `practices-event --type empty` | コンダクターが空を返した practices セクションを読んだ。アドバイザリのみ、org デフォルトにフォールバック |

### Merge dispatch

`amadeus-bolt dispatch-event` サブコマンド経由で発行されます。コンダクターは各 amadeus-pipeline-deploy-agent ディスパッチをブラケットします — 呼び出し前 INVOKED、YAML パース成功時に呼び出し後 RETURNED、タイムアウト / 不正 YAML / 低信頼度時に FALLBACK。

| Event | Emitter | Trigger |
|---|---|---|
| `MERGE_DISPATCH_INVOKED` | `tools/amadeus-bolt.ts` `dispatch-event --event MERGE_DISPATCH_INVOKED` | コンダクターがチームプラクティスの散文からマージ戦略を判断するため Task 経由で amadeus-pipeline-deploy-agent をディスパッチ |
| `MERGE_DISPATCH_RETURNED` | `tools/amadeus-bolt.ts` `dispatch-event --event MERGE_DISPATCH_RETURNED` | エージェントが戦略、ターゲットブランチ、信頼度、注記を含むパース済み YAML を返した |
| `MERGE_DISPATCH_FALLBACK` | `tools/amadeus-bolt.ts` `dispatch-event --event MERGE_DISPATCH_FALLBACK` | エージェントがタイムアウトまたは不正 YAML を返した。コンダクターは org デフォルトにフォールバック — 重要な可観測性フック |

### Merge provenance

Emitted by `recordDelegatedMerge` (`tools/amadeus-audit.ts`; CLI wrapper `tools/amadeus-merge-provenance.ts record`). Records the provenance of a delegated (standing-approval) PR merge — the standing ruling reference and the measured CI/convergence evidence. Recording only; it never performs or decides a merge.

| Event | Emitter | Trigger |
|---|---|---|
| `DELEGATED_MERGE_RECORDED` | `tools/amadeus-audit.ts` `recordDelegatedMerge` | Caller confirms the delegation condition was met and the PR merge already happened |

### Sensors

4つの `SENSOR_*` イベントはセンサーディスパッチャーから、`GUARDRAIL_LOADED` は paired-coverage doctor 行から発行されます。カバレッジは環境的です — markdown を書くすべての Inception/Construction/Operation ステージは、レジストリデフォルトのセンサーから少なくとも1つの `SENSOR_FIRED` 行を発行します。アドバイザリのみです。将来の ralph ドライバが Construction フェーズのセンサーにブロッキングセマンティクスを導入します。

| Event | Emitter | Trigger |
|---|---|---|
| `SENSOR_FIRED` | `tools/amadeus-sensor.ts` `fire` | ディスパッチャーがステージ出力に対してセンサーを起動(センサーの `matches` フィルタに対する PostToolUse Write/Edit マッチごと) |
| `SENSOR_PASSED` | `tools/amadeus-sensor.ts` `fire` | センサーが完了し所見なしを報告(ツール利用不可およびスクリプトエラーのフォールスルーもカバー。`Note` フィールドで区別) |
| `SENSOR_FAILED` | `tools/amadeus-sensor.ts` `fire` | センサーが完了し所見を報告。詳細ファイルは `<record>/.amadeus-sensors/<stage-slug>/<sensor-id>-<fire-id>.md`(intent の record ディレクトリ内)に書き込まれる |
| `SENSOR_BUDGET_OVERRIDE` | `tools/amadeus-sensor.ts` `fire` | センサーが設定された上限(三層 cap モデルによる registry / binding / depth 由来)を超え、終了またはスキップされた |
| `GUARDRAIL_LOADED` | `tools/amadeus-utility.ts` | ガードレールローダーがアクティブな workflow のスコープ階層的ガードレールセット(org → project → phase → stage)を解決。doctor の paired-coverage チェックがこのイベントから読む |

### Learning loop

`MEMORY_EMPTY` は `amadeus-runtime.ts compile` から発行されます。§13 の Learnings Ritual は実行中にステージごとの memory.md を書きます。ステージ承認時、runtime-graph の compile が memory.md を読み、4つの標準見出しの下に非空エントリが0のステージについて `MEMORY_EMPTY` を発行します。learning-gate ツール(`amadeus-learnings.ts persist`)は、保持された学習が `amadeus/spaces/<space>/memory/{project,team}.md` に日付付きのプラクティスエントリとして到着したとき `RULE_LEARNED` を発行し、学習がセンサーバインディング(マニフェスト + 起源ステージの `sensors:` フロントマター)をインストールしたとき `SENSOR_PROPOSED` を発行します。doctor はダイアリー規律の可観測性のためにこれらの行を読みます。`LEARNING_ZERO_CONFIRMED` と `LEARNING_CANDIDATE_ADDED`(unit s13-zero, ADR-6)は、§13 の「0 件」確定を conductor の自己申告ではなく surface 実行の digest に機械的に束縛します — `amadeus-learnings.ts confirm-zero` は candidates が空かつ surface JSON 自身の `surfaceDigest` が候補 + parked_open_questions から再算出できる場合にのみ `LEARNING_ZERO_CONFIRMED` を発行し、`amadeus-learnings.ts add-candidate` は追加のみ・disk 証跡束縛の conductor 候補を受理したとき `LEARNING_CANDIDATE_ADDED` を発行します。

| Event | Emitter | Trigger |
|---|---|---|
| `MEMORY_EMPTY` | `tools/amadeus-runtime.ts` | ステージ承認の runtime-graph compile が memory.md の欠落、または §13 の4見出しの下に非空エントリが0であることを発見 |
| `RULE_LEARNED` | `tools/amadeus-learnings.ts` | learning gate が保持された学習を `amadeus/spaces/<space>/memory/{project,team}.md` へ日付付きプラクティスエントリとして永続化した |
| `SENSOR_PROPOSED` | `tools/amadeus-learnings.ts` | learning gate が project 層のセンサーマニフェストを scaffold し、起源ステージの `sensors:` フロントマターにバインドした |
| `LEARNING_ZERO_CONFIRMED` | `tools/amadeus-learnings.ts` | `confirmZeroCandidates` が ZeroReceipt を発行した — candidates が空かつ同一 surface 出力から surfaceDigest が再算出された |
| `LEARNING_CANDIDATE_ADDED` | `tools/amadeus-learnings.ts` | `addConductorCandidate` が、disk 証跡パスが実在し主張と対応する conductor 発の候補を受理した |

### Loop monitor and quality repair

Loop Monitor は、配送の観測、サイクルのトリガー、Judge の予約と結果、closed-route の適用、latch の遷移を、1つの正典イベントセットとしてコミットします。Quality Repair ランタイムは、品質スナップショット、進捗、replan、stall、resume の各トランザクションを、その汎用 Loop Monitor 効果とともにコミットします。クローンごとの Replay Index は、これら監査の真実のソースからの修復可能な投影です。

| Event | Emitter | Trigger |
|---|---|---|
| `LOOP_MONITOR_EVENT_SET_COMMITTED` | `tools/amadeus-loop-monitor-replay.ts` | 1つのアトミックな Loop Monitor の配送、Judge、または latch 遷移がコミットされた |
| `QUALITY_REPAIR_TRANSACTION_COMMITTED` | `tools/amadeus-quality-repair-replay.ts` | 1つの品質スナップショット、進捗、replan、stall、または resume のトランザクションと、その汎用 Monitor 効果がアトミックにコミットされた |
| `INTENT_AUTONOMY_TRANSACTION_COMMITTED` | `tools/amadeus-intent-autonomy-replay.ts` | 1つの Intent スコープのモード、グラント、決定、workflow-effect、park、resume、または invocation-failure のトランザクションがアトミックにコミットされた |
| `INTENT_AUTONOMY_HUMAN_REQUIRED` | `tools/amadeus-intent-autonomy-production.ts` | 現在のモードでは自動裁定できなかった occurrence のゲートが開いた。人間へ委ねた理由(`SCOPE_OUT` または `MODE_REQUIRES_HUMAN`)とともに、提示ごとに1行記録する |
| `AUTO_DECISION_REVIEWED` | `tools/amadeus-autonomy-review-production.ts` | 人間がレビューサーフェス上で1つの不変な auto decision を受理またはフラグした(append-only。決定済みの効果を決して再実行しない) |
| `INTENT_COMPLETION_TRANSACTION_COMMITTED` | `tools/amadeus-intent-completion.ts` | Core の Intent 完了トランザクションがアトミックにコミットされ、Intent record をそのエビデンスダイジェストで封印した |

### Swarm

6つの swarm イベントはすべて swarm referee `amadeus-swarm.ts` から発行されます — コンダクターが参照する決定論的な verdict サーフェスです。referee はステートレスです: `prepare` はユニットごとの worktree を fork し `SWARM_STARTED` を発行します(加えて、コンダクターが loud downgrade を報告したときは `SWARM_DEGRADED`)。`finalize` はコンダクターが収束を主張したセットを再検証し、Unit ごとのペア、失敗した Unit ごとの baton 行、バッチ集計を発行します。`check` サブコマンドはアドバイザリで何も発行しません。エンジンは読み取り専用でコンダクターは監査イベントを発行しないため、決定論的ツールが swarm 分類体系全体を所有します。これらの行は依存リンクされた Units のバッチのライフサイクルを追跡します: バッチ開始時のファンアウト、Unit ごとの収束または再検証失敗、コンダクターへの return-the-baton の受け渡し、バッチ完了。コンダクターは `invoke-swarm` をステージ `mode` enum と並ぶ直交的なディレクティブ種別として扱います — 予約された `agent-team` モードをアクティブにはしません(そのモードは予約されたままです)。t48 forward チェックは Emitter セルがまだ `Reserved` と読める行をスキップします。

| Event | Emitter | Trigger |
|---|---|---|
| `SWARM_STARTED` | `tools/amadeus-swarm.ts` | swarm referee `prepare` が依存リンクされた Units のバッチを fork した |
| `SWARM_UNIT_CONVERGED` | `tools/amadeus-swarm.ts` | swarm Unit が `finalize` ゲートで green(かつ改ざんなし)を再検証した |
| `SWARM_UNIT_FAILED` | `tools/amadeus-swarm.ts` | swarm Unit が `finalize` 再検証に失敗した(未主張、主張したが red、または改ざん) |
| `SWARM_BATON_RETURNED` | `tools/amadeus-swarm.ts` | swarm Unit がオーケストレーター仲介の調整のためコンダクターへ baton を返した |
| `SWARM_COMPLETED` | `tools/amadeus-swarm.ts` | バッチ内のすべての Units が完了した(収束または失敗)。バッチクローズ |
| `SWARM_DEGRADED` | `tools/amadeus-swarm.ts` | ultra 値(`claude-ultra` または `codex-ultra`)が自身の native ではないハーネスで要求されたため、コンダクターがサブエージェント floor へ loud-degrade した(旧来の `1` は degrade ではなく fail-closed) |

分類体系内のすべてのイベントは、実際のエミッタに裏付けられているか、事前登録された来たるコンシューマ向けに `Reserved (v0.4.0 PR N)` / `Reserved (v0.5.0 PR N)` / `Reserved (v0.6.0 PR N)` とマークされているかのいずれかです。ドリフトテストは両方の半分を強制します — `Reserved` の早期スキップはセルが文字通り "Reserved" を含む間だけ適用され、コンシューマ PR は emit 呼び出しを出荷するのと同じコミットでそれを実際のエミッタファイルパスに置き換えます。

---

## Audit-first atomicity

状態を変更するコマンドは、状態ファイルを変更する **前に** 監査エントリを発行します。2つの帰結があります:

1. 監査発行が失敗した場合(ロックタイムアウト、ディスクエラー、無効なイベント型)、ツールは状態に触れる前に例外を投げます。状態は以前の値のまま、監査シャードはクリーンなままです。
2. 監査発行の *後に* 状態書き込みが失敗した場合、監査には「意図」エントリがあるが状態は動いていない状態になります。ドリフトは可視で診断可能であり、`--doctor` がそれを表面化します。

`tests/unit/t17.test.ts` のケース `test("65: approve is audit-first ...")` は `approve` についてこれを証明します: 監査シャードを chmod で読み取り専用にすると監査失敗が強制され、状態ファイルが `[?]` のまま(`[x]` ではない)であることをアサートします。同じ不変条件は `gate-start`、`reject`、`revise`、`skip`、`advance`、`complete-workflow`、`reuse-artifact`、`amadeus-bolt.ts set-autonomy`、`amadeus-state.ts fork` / `amadeus-state.ts merge`(状態 fork/merge サブコマンド — 同等の chmod-the-lock-dir Part A および chmod-the-target-after-emit Part B の証明については `tests/unit/t76.test.ts` を参照)についても成立します。

状態の fork/merge は、意図的に下記の audit-of-intent 例外に **含まれていません**: 状態ファイルの再読み取りと再書き込みは冪等です(`git worktree add` とは異なり、これは emit と git の間の kill-9 の後に worktree を残します)。したがって厳格な不変条件がきれいに適用されます。監査発行成功後の状態書き込み失敗は、doctor が worktree の record ディレクトリの `amadeus-state.md` の存在に対して照合するファントム `STATE_FORKED` 行になります。

### Audit-of-intent semantics (`WORKTREE_*`, `AUDIT_*`, and merge-dispatch `MERGE_DISPATCH_INVOKED`)

audit-of-intent セマンティクスは、発行前に結果を確認できない副作用に適用されます — ディスク操作(worktree 作成 / 削除、監査バイトコピー)および LLM Task ディスパッチ(amadeus-pipeline-deploy-agent)を含みます。発行するツールはまず監査エントリを書き、その後副作用を実行します。emit の後に副作用が失敗した場合、ツールはメッセージに slug を埋め込んで(`[slug=<slug>]`)`emitError` を呼びます。audit-fork / audit-merge ハンドラはさらに `[fork-emitted:<timestamp>]` で失敗をタグ付けし、`--doctor` が「意図は記録されたが副作用は到着しなかった」を以前の障害モードと区別できるようにします。`MERGE_DISPATCH_INVOKED` については、doctor の照合が孤立した INVOKED 行を、欠落した `MERGE_DISPATCH_RETURNED` または `MERGE_DISPATCH_FALLBACK` のパートナーと slug + タイムスタンプウィンドウでマッチします(LLM Task 呼び出しはシーケンスする対象のディスク成果物を持たないため相関タグは不要)。`appendAuditEntry` はディスク副作用の失敗時にディスク上へ `ERROR_LOGGED` エントリを記録します。doctor は観測時に監査ドリフトを照合します。

| Event group | Emitter | emit に続く副作用 |
|---|---|---|
| `WORKTREE_CREATED`、`WORKTREE_MERGED`、`WORKTREE_DISCARDED` | `tools/amadeus-worktree.ts` | `git worktree add`、`git merge` + クリーンアップ、`git worktree remove` + ブランチ削除 |
| `AUDIT_FORKED`、`AUDIT_MERGED` | `tools/amadeus-audit.ts` | main 監査の `mkdir -p` + `copyFileSync`、worktree 監査デルタの main 監査への `appendFileSync` |
| `MERGE_DISPATCH_INVOKED` | `tools/amadeus-bolt.ts` `dispatch-event` | `Task(amadeus-pipeline-deploy-agent, ...)` LLM ディスパッチ — 副作用は LLM 呼び出しそのもの。成功はマッチする `MERGE_DISPATCH_RETURNED` または `MERGE_DISPATCH_FALLBACK` の呼び出し後 emit で観測される |

これはステージ遷移の厳格な audit-first 不変条件からの意図的な逸脱であり、ロールバック emit も `ERROR_LOGGED` も保証できない kill-9 / OS クラッシュのウィンドウが動機です。このパターンは上記のイベントに限定されています。`STATE_FORKED` / `STATE_MERGED` は意図的にこの例外を **取りません** — strict-first の根拠については前のセクションを参照してください(状態書き込みは冪等なので、書き込み失敗は回復不能な孤立状態ではなく回復可能なドリフトとして表面化します)。`MERGE_DISPATCH_RETURNED` / `MERGE_DISPATCH_FALLBACK` は呼び出し後 emit(意図ではなく結果の監査 — strict-first)であり、例外を取りません。他のすべての状態変更コマンドは上記セクションに従い strict-first のままです。

### Forbidden patterns

LLM の散文から監査イベントを発行してはいけません。以下のアンチパターンがこのリファクタリングが存在する理由です:

- SKILL.md のステップとしての `bun .claude/tools/amadeus-audit.ts append WORKFLOW_STARTED ...` — ツールが内部でそれを発行する形に置き換えられた
- ステージファイルが手書きで追記する `STAGE_COMPLETED` ジャーナルレコード — イベントはツールまたはフック内の `appendAuditEntry` からのみ来る
- フックが書くフリーフォームの `## Artifact Update` セクション — 正典の `ARTIFACT_CREATED` / `ARTIFACT_UPDATED` に置き換えられた

`tests/integration/t48-audit-event-emitters.test.ts` のドリフトテストは、本章のテーブルとコードの間のドリフトを捕捉します: テーブル内のすべてのイベントは、宣言されたエミッタファイル内にマッチする `appendAuditEntry(..., "EVENT", ...)` 呼び出しを持たなければならず、コードベース内のすべての発行呼び出し箇所はテーブルに現れなければなりません。テストはまた、削除されたイベントの復活に対して、およびペアリング不変条件に対して(例: `handleApprove` は `GATE_APPROVED` と `STAGE_COMPLETED` の両方を発行しなければならない)ガードします。

---

## Same-commit rule

ステートマシンの挙動を変更するときは、コードと本章の両方を **同じコミット** で更新してください。この規則はドリフトテストによって自身を捕捉しますが、事後にドリフトを修正するコスト(3つのファイルにまたがってどのイベントを誰が所有するかを追いかける)は、1つのテーブルを更新するよりもはるかに高くつきます。

具体的には:
- イベントの追加 → 正典 Event Registry に追加、エミッタを追加、上記の適切なテーブルに追加。
- イベントの削除 → 正典 Event Registry から削除、エミッタを削除、ここの行を削除、古い散文やテストがないかコードベースを grep。
- エミッタファイルのリネーム → それを指すすべてのテーブル行の Emitter 列を更新。

---

## Known limitations

- **マルチプロジェクトセッション。** Claude Code はセッション内の `cd` でフックを発火しません。したがって、ユーザーがプロジェクト A で `/amadeus` を実行してからプロジェクト B に `cd` した場合、session フックは B の監査シャードに対して再発火しません。session イベントはすべてのワークスペース切り替えを完全には反映しないことがあります。これは Claude Code の制限であり、AI-DLC の設計上の欠陥ではありません。

---

## Related reference

- [Orchestrator](03-orchestrator.ja.md) — `/amadeus --status`、session チェック、resume パスがステートマシンのシグナルをどう消費するか。
- [Stage Protocol](04-stage-protocol.ja.md) — `[?]` / `[R]` 遷移を駆動する承認ゲート UX を含む、ステージレベルの挙動契約。
- [Hooks and Tools](06-hooks-and-tools.ja.md) — フックのライフサイクル、CLI ツールリファレンス、監査イベントカタログ。
- [Testing](09-testing.ja.md) — ドリフトテストの仕組みと実行タイミング。
