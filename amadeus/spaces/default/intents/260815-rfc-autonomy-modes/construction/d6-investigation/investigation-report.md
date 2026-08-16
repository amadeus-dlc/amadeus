# D6 調査報告 — semi milestone の「空振り承認」の機序

> unit: d6-investigation(FR-13 / ADR-11)。調査専用 unit であり、本 unit は production code を一切変更しない(R-1)。発見した欠陥は本 intent で修正せず、末尾の Issue 起票ドラフトへ分離する。
>
> **測定 ref**
> - コード断面: worktree `bolt-d6-investigation`、HEAD `2eb94f1e39e940c1c39a80a2181a8e03aaf31eb9`(`git rev-parse HEAD`)。file:line はすべてこの断面。
> - record コーパス断面: conductor clone `/Users/j5ik2o/orca/workspaces/amadeus/bugfix-0815-0`、HEAD `31bf534dee8434eb0c71cab3f1ef66571dd816f5` + 未コミット 16 ファイル(進行中 intent 260815-rfc-autonomy-modes の record。`git status --porcelain -- amadeus/spaces/default/intents | wc -l` → `16`)。record 総数 185(`ls -d amadeus/spaces/default/intents/*/ | wc -l` → `185`)。
> - 実行日: 2026-08-16(JST)。すべて read-only 観測 + repo 外 scratch での再現であり、実 record への書込は行っていない。

## 1. 機序

RFC 付録 B が 1 つの現象としてまとめている「空振り」は、**独立した 2 つの機序**の重ね合わせである。両者は発火点も原因も異なるため、以下では A / B に分けて記す。

### 機序 A: `INTENT_AUTONOMY_HUMAN_REQUIRED` の重複発火 — 「問い合わせの回数」ではなく「projection 読取の回数」を数えている

`INTENT_AUTONOMY_HUMAN_REQUIRED` を書くのは `emitAuthorizationRefusal` ただ 1 箇所で、その呼出元は `productionStageAutonomy` ただ 1 箇所である。

- `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:237` `export function productionStageAutonomy(input: ProductionStageAutonomyInput): ProductionAutonomyContext {`
- 同 `:248` `const authorization = authorizeProductionOccurrence(projection, occurrence({ ...input, projection }), "intent");`
- 同 `:250-251` `if (!authorization.authorized) {` / `emitAuthorizationRefusal(input.projectDir, {`
- 同 `:295` `const result = otel.emitAuditEvent("INTENT_AUTONOMY_HUMAN_REQUIRED", {`

`productionStageAutonomy` は**副作用のない照会関数として設計され、実際には監査行を書く**。そして呼出元は 2 つある。

1. `packages/framework/core/tools/amadeus-orchestrate.ts:2802` `function routeMainWorkflowDirective(` → 同 `:2815` `const autonomy = productionStageAutonomy({`
   run-stage directive を組み立てるたび、すなわち **`amadeus-orchestrate next` が本線ワークフローの directive を発行するたび**に呼ばれる。目的は directive へ `intent_autonomy_mode` / `autonomy_auto_approve`(同 `:2824-2826`)を載せることであり、**ゲートは開いていないし、人間には何も提示されていない**。
2. `packages/framework/core/tools/amadeus-state.ts:3714` `const context = productionStageAutonomy(stageAutonomyInput);`
   `assertHumanPresentForGateResolution` の冒頭。`approve` を試みるたびに呼ばれ、**承認が拒否されて exit 1 になる場合でも 1 行書く**。

`emitAuthorizationRefusal` には冪等鍵も occurrence 単位の重複抑止も存在しない(`:291-307` の全文にそのような分岐はない)。対照的に、**認可された側の経路には重複抑止がある** — `amadeus-intent-autonomy-production.ts:805-806`:

```
  if (projection.autoDecisions.some((decision) => decision.occurrenceId === target.occurrenceId)) {
    return { kind: "already-decided", grantId: projection.currentGrant?.grantId ?? null };
```

したがって「同一ゲートへ N 回発火」の N は、人間に N 回問い合わせた回数ではなく、**そのステージについて projection を読んだ回数**(= `next` の回数 + `approve` 試行の回数)である。RFC の「最大 5 回」はこの計数の産物であり、現行コーパスでは最大 20 回まで観測される(§2.1)。

### 機序 B: 「人間が答えないまま承認が通る」 — 宣言(human-required)と執行(presence)の述語が別物で、両者が結線されていない

`assertHumanPresentForGateResolution`(`amadeus-state.ts:3691-3742`)の制御フローは次のとおり:

```
:3714   const context = productionStageAutonomy(stageAutonomyInput);   // ← ここで refusal 行を書く
:3715   if (context.autoApprove) {                                     // ← semi の milestone では false
          ... commitProductionStageGateDecision → grantId を返す
:3723     error(`Intent autonomy refused automatic approval for "${slug}": ${decision.reason}`);
        }
:3727   if (humanPresenceGuardDisabled()) { return null; }             // env off-switch
:3731   if (humanActedSinceGate(pd, verb, intent, space)) { return null; }  // ← ここで承認が通る
:3739   error(`Refusing to ${verb} ...`);
```

`autoApprove` が false のとき、**autonomy 層の「これは人間が決めるべきだ」という宣言は、監査行 1 行になるだけで制御には一切影響しない**。承認可否を実際に決めるのは `humanActedSinceGate` だけである。

`humanActedSinceGate` が問うているのは「人間がこのゲートに答えたか」ではなく、「**直前のゲート解決(GATE_APPROVED / GATE_REJECTED / QUESTION_ANSWERED / WORKFLOW_PARKED)以降に、未消費の HUMAN_TURN が 1 つでもあるか**」である(`amadeus-lib.ts:3828-3838` の `humanActOutstanding`、境界の分類は `:3791-3807`)。境界を「このゲートの開設」ではなく「直前の解決」に置くのは意図的な設計で、その根拠は同ファイルの設計コメントに逐語で書かれている(`amadeus-lib.ts:3662-3665`):

```
// Why the boundary is a prior RESOLUTION, not this gate's STAGE_AWAITING_APPROVAL
// (the live Kiro IDE spike, 2026-06-30, caught this): in the real flow ONE human
// prompt drives the agent to BOTH open the gate AND approve it, so the human turn
// PRECEDES this gate-open.
```

つまり presence guard は **偽造・カスケード防止のための「今このターンで人間が動いた」証明**であって、「人間がこの問いを見て答えた」証明ではない。設計としては一貫している。問題は、autonomy 層が `SCOPE_OUT` を宣言した milestone にもこの弱い述語がそのまま適用され、**両者の間に結線が無い**ことである。結果として:

- 人間がモード宣言や「続けて」のために打った 1 ターンが、そのまま milestone ゲートの承認権限として消費される。
- `GATE_APPROVED` 行には `Grant Id` も `User Input` も載らない(`amadeus-state.ts:4192-4193` はどちらも値があるときだけ書く)。したがって**着地後の監査からは「人間が承認した」と「engine が未消費ターンで承認した」を区別できない**。

補足(D6 の修正スコープ外、FR-12/#1647 側の事実): 承認経路はもう 1 本ある。`authorizeApproval`(`amadeus-state.ts:4143-4147`)は `override` が渡されると `assertHumanPresentForGateResolution` を**呼ばない**。`amadeus-bolt.ts` の `approve-batch` は presence 検査を一切持たず、`GATE_APPROVED` に合成文字列を `User Input` として書く(`amadeus-bolt.ts:1254-1257`、逐語 `"User Input": \`approve-batch --batch ${batch}\``)。これは `User Input` フィールドが人間の証拠にならないことの直接の実例である。

## 2. 一次証拠

### 2.1 コーパス実測(read-only)

集計述語(再実行可能。cwd = conductor clone の `amadeus/spaces/default/intents`):

```
cat */audit/*.jsonl | jq -c 'select(.attributes.Event=="INTENT_AUTONOMY_HUMAN_REQUIRED")' | wc -l
→ 370
```

```
cat */audit/*.jsonl | jq -r 'select(.attributes.Event=="INTENT_AUTONOMY_HUMAN_REQUIRED")
  | [.attributes.Mode,.attributes.Reason,.attributes["Interaction Kind"]]|@tsv' | sort | uniq -c | sort -rn
→ 106 semi SCOPE_OUT phase-gate
  106 none MODE_REQUIRES_HUMAN stage-gate
   66 semi SCOPE_OUT walking-skeleton
   52 none MODE_REQUIRES_HUMAN phase-gate
   40 none MODE_REQUIRES_HUMAN walking-skeleton
```

semi SCOPE_OUT = 106 + 66 = 172 で、RFC 付録 B の実測値 172(phase-gate 106 / walking-skeleton 66)と一致する。総数が 322 → 370 に増えたのは none 側の増分のみ。

重複度((intentId, Stage slug, Interaction Kind, Mode) をキーに `sort | uniq -c`):

```
cat */audit/*.jsonl | jq -r 'select(.attributes.Event=="INTENT_AUTONOMY_HUMAN_REQUIRED")
  | [.intentId,.attributes["Stage slug"],.attributes["Interaction Kind"],.attributes.Mode]|@tsv' \
  | sort | uniq -c | sort -rn | head -5
→ 20 260815-per-unit-outcome     build-and-test        stage-gate       none
  17 260810-tla-applicability-wiring code-generation   walking-skeleton none
  13 260814-unit-failure-autoelectio code-generation   walking-skeleton semi
  12 260814-unit-failure-autoelectio requirements-analysis phase-gate   semi
  12 260814-failopen-error-paths     requirements-analysis phase-gate   semi
```

現行コーパスの最大重複は 20 回。RFC の「最大 5 回」は古い断面での値であり、機序 A のとおり上限は構造的に存在しない。

### 2.2 空振り承認の相関(scratch スクリプト `analyze.ts` — repo 外)

スクリプト: `/private/tmp/claude-501/.../scratchpad/d6/analyze.ts`(全 record の audit を timestamp→shard→seq 順に整列し、各 `GATE_APPROVED` について「同一秒内の直前に `INTENT_AUTONOMY_HUMAN_REQUIRED` があるか」「`Grant Id` / `User Input` の有無」「直前 `HUMAN_TURN` からの経過秒」を数える)。出力逐語:

```
GATE_APPROVED total: 595
  with Grant Id: 259  with User Input: 204  neither: 160
GATE_APPROVED preceded (same second) by INTENT_AUTONOMY_HUMAN_REQUIRED: 52
  of those, neither Grant Id nor User Input: 32
  delta(last HUMAN_TURN -> GATE_APPROVED) seconds: min=3 median=12 max=902 n=52, no-human-turn-at-all=0
  [whiff subset] last HUMAN_TURN vs gate-open: strictly-before=30 same-second=0 strictly-after=2 no-open-event=0
  [whiff subset] delta seconds: min=4 median=14 max=371 n=32
```

空振り 32 件のうち **30 件は、根拠となった HUMAN_TURN がそのゲートの `STAGE_AWAITING_APPROVAL` より厳密に前**にある(残り 2 件はゲート開設後にターンがあり、人間が実際に応答した可能性を排除できない — 本報告はこの 2 件を空振りと断定しない)。経過秒は最短 4 秒・中央値 14 秒・最長 371 秒。

32 件の内訳(上記出力の whiff 行を `Interaction Kind/Mode/Reason` で集計):

```
11 phase-gate/semi/SCOPE_OUT
 9 stage-gate/none/MODE_REQUIRES_HUMAN
 4 walking-skeleton/semi/SCOPE_OUT
 3 walking-skeleton/none/MODE_REQUIRES_HUMAN
 3 phase-gate/none/MODE_REQUIRES_HUMAN
```

semi milestone(phase-gate + walking-skeleton)の空振りは **15 件**。残り 17 件は none モードの同型事象であり、機序 B が mode 非依存であることを示す。

代表例(RFC が名指す 260814-park-provenance)。集計述語:

```
cd amadeus/spaces/default/intents/260814-park-provenance
cat audit/*.jsonl | jq -r 'select(.timestamp>="2026-08-14T11:03:20Z" and .timestamp<="2026-08-14T11:04:00Z")
  | [.seq,.timestamp,.attributes.Event]|@tsv'
→ 76  2026-08-14T11:03:28Z  HUMAN_TURN
  77  2026-08-14T11:03:37Z  STAGE_AWAITING_APPROVAL
  78  2026-08-14T11:03:37Z  INTENT_AUTONOMY_HUMAN_REQUIRED
  79  2026-08-14T11:03:37Z  GATE_APPROVED
  80  2026-08-14T11:03:37Z  STAGE_COMPLETED
  81  2026-08-14T11:03:37Z  PHASE_COMPLETED
```

seq 79 の生ブロック(逐語):

```json
{"schemaVersion":2,"eventId":"39902315-007d-48ee-b48f-238496f3cb65","seq":79,"timestamp":"2026-08-14T11:03:37Z","eventName":"amadeus.gate.approved","attributes":{"Event":"GATE_APPROVED","Stage":"requirements-analysis"},"intentId":"260814-park-provenance","space":"default","cloneId":"7fda11248059","traceId":null,"spanId":null,"traceFlags":0,"idempotencyKey":"736657dd-35c9-4434-8e78-1e9a03b33f23","canonical":true}
```

`attributes` に `Grant Id` も `User Input` も無い。ゲートの開設(seq 77)・「人間が必要」の宣言(seq 78)・承認(seq 79)が**同一秒**に並び、根拠となった HUMAN_TURN は 9 秒前(seq 76)にある。

同 record の walking-skeleton 5 連発(RFC の「最大 5 回」の実体):

```
cat audit/*.jsonl | jq -r 'select(.attributes.Event=="INTENT_AUTONOMY_HUMAN_REQUIRED")
  | [.timestamp,.attributes.Mode,.attributes.Reason,.attributes["Interaction Kind"],.attributes["Stage slug"]]|@tsv'
→ ... 11:03:53 / 11:03:59 / 12:30:16 / 12:43:00 / 12:53:45  semi SCOPE_OUT walking-skeleton code-generation
```

うち 11:03:53 と 11:03:59 の 2 件は、直前(11:03:37)に `STAGE_STARTED code-generation` が出た**直後**であり、`STAGE_AWAITING_APPROVAL` はまだ存在しない — ゲートが開いていない時点での発火である(機序 A の経路 1)。

### 2.3 `User Input` が人間の証拠にならないこと

```
cat */audit/*.jsonl | jq -r 'select(.attributes.Event=="GATE_APPROVED") | .attributes["User Input"] // "«none»"' \
  | sed 's/^approve-batch.*/«synthetic approve-batch»/' | sort | uniq -c | sort -rn | head -6
→ 391 «none»
   93 Approve
   41 1
   24 «synthetic approve-batch»
   11 Approve (Recommended)
    2 auto-approve (autonomy full, grant intent-grant-78b9d634b218b43a94860228b8d23bd7)
```

`User Input` は conductor が自由記述で書くフィールドであり、`approve-batch` が機械生成した合成文字列(24 件)や、autonomy の自動承認を人間入力欄に転記したもの(`auto-approve (autonomy full, ...)` 等)を含む。**機械的に導出された「人間が答えた」証拠は `GATE_APPROVED` のどのフィールドにも存在しない。**

## 3. 再現手順

repo 外の scratch(`/private/tmp/claude-501/.../scratchpad/d6/repro.ts`)から、リポジトリの integration fixture(`tests/harness/fixtures.ts` の `createTestProject` / `seedStateFile`)で使い捨ての temp project を作り、`dist/claude/.claude/tools/` の実 CLI を spawn する。**実 record には一切触れない。** `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` は明示的に `delete` しており、presence guard は生きている。

手順:

0. (対照)HUMAN_TURN が 1 件も無い状態で `amadeus-state.ts approve approval-handoff` → guard が拒否することを確認。
1. `mintHumanPresence`(production の UserPromptSubmit hook `amadeus-mint-presence.ts` が呼ぶ関数そのもの)で HUMAN_TURN を 1 件だけ鋳造し、`amadeus-bolt.ts set-autonomy --mode semi` を実行。
2. `amadeus-orchestrate.ts next` を 5 回実行(ゲートは開かない/人間には何も提示しない)。
3. `amadeus-state.ts approve approval-handoff` を **`--user-input` なし・新しい HUMAN_TURN なし**で実行。

fixture は `tests/fixtures/state-ideation-boundary.md`(ideation 最終ステージ `approval-handoff` が `[?]` = phase-gate)。

実行結果(逐語、`repro-out.txt`):

```
project: /private/var/folders/3s/p2xl_vd524b4lk78cb6fz5nh0000gn/T/amadeus-test-u2kduN
### step 0 (control): approve with NO human turn at all -> the guard must refuse
  approve exit: 1 | {"error":"Refusing to approve \"approval-handoff\": a real human has not acted at this gate since it opened. The approval gate requires a typed human turn befor
### step 1: one typed human turn, then declare semi
  mint-presence hook exit: 0  HUMAN_TURN rows: 1
  set-autonomy: {"error":"Intent autonomy update failed: state projection write failed after the autonomy transaction committed (re-run the same declaration to converge): Field not found in state file: \"Construction Autonomy Mode\". Cannot update — refusing to silently no-op."}
  IAHR after declaring semi: 1
### step 2: five `next` calls — no gate is opened, no human is asked
  next#1 exit=0 IAHR=2 STAGE_AWAITING_APPROVAL=0 GATE_APPROVED=0
  next#2 exit=0 IAHR=3 STAGE_AWAITING_APPROVAL=0 GATE_APPROVED=0
  next#3 exit=0 IAHR=4 STAGE_AWAITING_APPROVAL=0 GATE_APPROVED=0
  next#4 exit=0 IAHR=5 STAGE_AWAITING_APPROVAL=0 GATE_APPROVED=0
  next#5 exit=0 IAHR=6 STAGE_AWAITING_APPROVAL=0 GATE_APPROVED=0
   2026-08-15T18:59:03Z INTENT_AUTONOMY_HUMAN_REQUIRED stage=approval-handoff kind=phase-gate mode=none reason=MODE_REQUIRES_HUMAN grant=- userInput=-
   2026-08-15T18:59:03Z INTENT_AUTONOMY_HUMAN_REQUIRED stage=approval-handoff kind=phase-gate mode=semi reason=SCOPE_OUT grant=- userInput=-
   2026-08-15T18:59:04Z INTENT_AUTONOMY_HUMAN_REQUIRED stage=approval-handoff kind=phase-gate mode=semi reason=SCOPE_OUT grant=- userInput=-
   2026-08-15T18:59:04Z INTENT_AUTONOMY_HUMAN_REQUIRED stage=approval-handoff kind=phase-gate mode=semi reason=SCOPE_OUT grant=- userInput=-
   2026-08-15T18:59:04Z INTENT_AUTONOMY_HUMAN_REQUIRED stage=approval-handoff kind=phase-gate mode=semi reason=SCOPE_OUT grant=- userInput=-
   2026-08-15T18:59:04Z INTENT_AUTONOMY_HUMAN_REQUIRED stage=approval-handoff kind=phase-gate mode=semi reason=SCOPE_OUT grant=- userInput=-
### step 3: approve the ideation phase gate with NO --user-input, no new human turn
  HUMAN_TURN rows: 1 (still only the step-1 turn, which was about setting the mode)
  approve exit: 0
  approve stdout(first line): {"completed":"approval-handoff","started":"reverse-engineering","phase":"INCEPTION","phase_boundary":true,"completed_count":10,"next_after":"practices-discovery","already_completed":true,...,"timestamp":"2026-08-15T18:59:04Z"}
  audit tail:
   2026-08-15T18:59:04Z INTENT_AUTONOMY_HUMAN_REQUIRED stage=approval-handoff kind=phase-gate mode=semi reason=SCOPE_OUT grant=- userInput=-
   2026-08-15T18:59:04Z INTENT_AUTONOMY_HUMAN_REQUIRED stage=approval-handoff kind=phase-gate mode=semi reason=SCOPE_OUT grant=- userInput=-
   2026-08-15T18:59:04Z GATE_APPROVED stage=approval-handoff kind=- mode=- reason=- grant=- userInput=-
   2026-08-15T18:59:04Z STAGE_COMPLETED stage=approval-handoff kind=- mode=- reason=- grant=- userInput=-
   2026-08-15T18:59:04Z PHASE_COMPLETED stage=- kind=- mode=- reason=- grant=- userInput=-
   2026-08-15T18:59:04Z PHASE_VERIFIED stage=- kind=- mode=- reason=- grant=- userInput=-
   2026-08-15T18:59:04Z PHASE_STARTED stage=- kind=- mode=- reason=- grant=- userInput=-
   2026-08-15T18:59:04Z STAGE_STARTED stage=reverse-engineering kind=- mode=- reason=- grant=- userInput=-
```

読み取り:

- **機序 A 再現**: 1 つのゲートに対し 7 行の `INTENT_AUTONOMY_HUMAN_REQUIRED`(step 0 の失敗した approve で 1・`next` 5 回で 5・step 3 の approve で 1)。`STAGE_AWAITING_APPROVAL` は 0 件のまま、すなわち **人間には一度も何も提示されていない**。失敗した approve すら 1 行を残す。
- **機序 B 再現**: 唯一の HUMAN_TURN は step 1 の「モードを semi にする」ためのターン。それだけで ideation phase-gate が承認され、フェーズ境界(ideation → inception)を越えた。`GATE_APPROVED` に `Grant Id` も `User Input` も無い。
- **対照(ablation)**: step 0 のとおり、HUMAN_TURN が無ければ guard は正しく拒否する(exit 1)。**guard が壊れているのではなく、guard の述語が autonomy の宣言より弱いことが原因である。**
- 観測上の注記(結論に影響しない): step 1 の `set-autonomy` は非ゼロ扱いのエラー文字列を出しているが、これは fixture の state ファイルに `Construction Autonomy Mode` フィールドが無いための state 投影の書込失敗であり、autonomy トランザクション自体は commit 済み(以後の refusal 行が `mode=semi` を記録していることが実測)。fixture 由来の副作用であり、機序とは無関係。

## 4. 判定

### 判定 A(重複発火): **欠陥**

根拠:

1. イベントの宣言された意味は「人間へ委ねられた occurrence の記録」である。`packages/framework/core/knowledge/amadeus-shared/audit-format.md:285` 逐語: `An occurrence the active mode could not decide on its own, recorded with the reason it fell to a human`。ところが経路 1(`routeMainWorkflowDirective`)の発火時点では occurrence は人間へ委ねられていない — ゲートは開いておらず、提示も起きていない。**イベントの意味論と発火点が一致していない。**
2. `emitAuthorizationRefusal` は observation query の副作用として無条件に append する。同ファイル内の認可側(`:805-806`)には occurrence 単位の重複抑止があるのに、拒否側には無い — **非対称であり、設計上の意図とは考えにくい。**
3. 実害: append-only 台帳の膨張と、「何回人間を止めたか」を数える下流分析(RFC 付録 B の 322/370 件そのもの)の系統的な過大計上。RFC が semi の停止コストを 172 件として見積もった数値も、この計数由来である。

反対仮説の検討: 「意図的に projection 読取ごとの trace を残している」という解釈は成り立たない。もしそうなら `Interaction Kind` / `Reason` ではなく読取文脈(caller)を記録するはずであり、また同じ occurrence を何度読んでも同一内容の行が積まれるだけで新しい情報を持たない。**仮説として提示するに留め、確定はしていない**が、少なくとも上記 1 の意味論不一致は observed fact である。

### 判定 B(空振り承認): **欠陥**(ただし「presence guard のバグ」ではなく「宣言と執行の未結線」)

観測事実(fact):

- autonomy 層が `SCOPE_OUT` を宣言しても、承認の可否には一切影響しない(`amadeus-state.ts:3714-3737` の制御フロー)。
- 実際に承認を許すのは `humanActedSinceGate` のみで、その述語は「未消費の HUMAN_TURN が直前の解決以降に存在するか」である(`amadeus-lib.ts:3828-3838`)。
- コーパスで 32 件、うち semi milestone 15 件が、「human-required の宣言と同一秒に、`Grant Id` も `User Input` も無い `GATE_APPROVED`」として着地している(§2.2)。この 32 件では根拠 HUMAN_TURN が最短 4 秒前・中央値 14 秒前・最長 371 秒前にあり、**30 件はゲート開設(`STAGE_AWAITING_APPROVAL`)より厳密に前**。
- scratch で決定的に再現する(§3)。

判定の理由: RFC 付録 B 行 2/3 が宣言する semi の契約は「フェーズ境界ゲート / walking-skeleton ゲート = **人間が承認**」である。実装が執行しているのは「人間がこのターンで何か打った」であり、**契約が要求する「人間がこの問いに答えた」を執行していない**。さらに着地後の監査からも両者を区別できない(§2.3)。よってユーザー可視の契約に対する違反であり、team.md の Issue 種別判定(3)「成果物が既存の合意済み契約に違反」= `bug` に該当する。

反証への配慮: presence guard 単体は設計どおり動作しており(§3 step 0 の対照)、その境界設計には明示された正当な理由がある(`amadeus-lib.ts:3662-3665` 逐語)。したがって**「guard を厳しくする」は本欠陥の唯一解ではなく、修正方式は設計裁定に委ねる**(本 unit は方式を提案しない — R-1)。

### 判定外(本 unit のスコープ外だが記録)

- `authorizeApproval` の `override` 経路(`amadeus-state.ts:4143-4147`)と `approve-batch`(`amadeus-bolt.ts:1226-1274`)は presence 検査を通らない。これは FR-12 / Issue #1647(OPEN)の対象であり、D6 の修正スコープ外。
- RFC 付録 B の「ゲート承認 271 件: grant 自動 176 / 人間入力 37 / どちらも記録なし 58」という分類は、`User Input` を人間の証拠として扱っている。§2.3 のとおりこの前提は成り立たない(現断面では 595 件中 `User Input` あり 204 件、うち 24 件は `approve-batch` の合成文字列)。**RFC の当該行は「人間入力」ではなく「User Input フィールドが埋まっている」と読むべきである。**

## 5. 帰属

- **判定 A の帰属: 実装**。`INTENT_AUTONOMY_HUMAN_REQUIRED` を導入した #2378(refusal visibility)の配線が、発火点をゲート提示ではなく `productionStageAutonomy` の全呼出に置いたことに由来する。要件・設計側に「projection 読取ごとに記録する」という規定は見当たらない(`audit-format.md:285` は逆の意味を記す)。
- **判定 B の帰属: 設計**。presence guard(#675/#685/#736/#779 系列)と Intent autonomy(#2067/#2253/#2378 系列)はそれぞれ独立に正しく設計されたが、**両者の接合部 —「autonomy が human-required と宣言した occurrence を、どの述語で執行するか」— がどちらの設計にも属していない**。個々の実装のバグではなく、2 つの機構の境界に落ちた未規定領域である。これは RFC-0001 が D6 を「実装前に原因調査」と位置づけた理由と整合する。
- **既存 Issue との関係(起票前重複検索の結果)**: `gh issue list --state all --search <q>` を `INTENT_AUTONOMY_HUMAN_REQUIRED` / `空振り` / `humanActedSinceGate` / `重複発火` / `milestone ゲート` / `phase-gate semi` の 6 述語で実行。近接するのは #2739(OPEN, semi でゲートが来た**理由の提示**という UX 改善 — 本件は提示ではなく執行と記録の問題)、#1647(OPEN, approve-batch の presence guard — 上記スコープ外項目)、#2378(CLOSED, 本イベントの導入元)、#1494(OPEN, ゲート拒否時の HUMAN_TURN 診断表示)。**A・B いずれについても既存 Issue は存在しない。**
- **U5(presence-closure 等)との重複回避**: 本 unit は「空振りが新実装で消えるか」を判定しない(R-3)。それは当該 unit の受け入れで扱う。

## 6. Issue 起票ドラフト(本 intent では修正しない — R-1)

> 起票は未実施。以下は下書きであり、起票にはユーザーの着手決定とクロスレビュー 2 名の成立が前提(team.md `issue-cross-review` / `issue-selection-user-decides`)。

### Issue 1

**title**: `bug(engine): INTENT_AUTONOMY_HUMAN_REQUIRED が projection 読取のたびに発火し、ゲート未提示でも台帳へ積まれる(同一ゲート最大 20 行)`

**種別**: bug / **優先度**: P2 / **重大度**: S3

**body**:

- **背景・対象範囲**: `INTENT_AUTONOMY_HUMAN_REQUIRED` は「人間へ委ねられた occurrence」を記録する監査イベント(`packages/framework/core/knowledge/amadeus-shared/audit-format.md:285`)。実際には `productionStageAutonomy`(`packages/framework/core/tools/amadeus-intent-autonomy-production.ts:237`)が呼ばれるたびに `emitAuthorizationRefusal`(同 `:291-307`)が無条件で 1 行 append する。呼出元は `routeMainWorkflowDirective`(`packages/framework/core/tools/amadeus-orchestrate.ts:2815` — `next` の directive 発行ごと、ゲート未開設)と `assertHumanPresentForGateResolution`(`packages/framework/core/tools/amadeus-state.ts:3714` — approve 試行ごと、失敗時も含む)の 2 箇所。認可側には occurrence 単位の重複抑止があるのに(同 production `:805-806`)、拒否側には無い。
- **根拠・実測証拠**: record コーパス 185 件(conductor clone HEAD `31bf534de` + 未コミット 16 ファイル)で総数 370 行、(intent, stage, kind, mode) キーの最大重複 20 行(集計述語は調査報告 §2.1)。使い捨て temp project での決定的再現: ゲートを一度も開かずに `next` を 5 回実行すると 5 行、失敗する approve でも 1 行(調査報告 §3 の逐語出力)。
- **期待結果・完了条件**: 同一 occurrence に対する「人間へ委ねた」記録が高々 1 行になること(方式は設計裁定 — 冪等鍵、発火点をゲート提示へ移す、read と emit を分離する、等)。落ちる実証: 現行コードで同一ゲートへ 2 行以上積まれることを Red として実測し、修正後に 1 行へ pin する。ゲートが開いていない時点での発火が 0 件であることも pin する。
- **影響・価値**: append-only 台帳の膨張。および「何回人間を止めたか」を数える下流分析の系統的過大計上 — RFC-0001 付録 B の semi 停止コスト 172 件はこの計数由来であり、実際の人間提示回数ではない。
- **関連**: RFC-0001 D6、#2378(本イベントの導入元)、#2739(提示側の UX)、intent 260815-rfc-autonomy-modes の `construction/d6-investigation/investigation-report.md`。
- **初期分類**: 実装起因(発火点の配線)。

### Issue 2

**title**: `bug(gates): autonomy が human-required と宣言した milestone ゲートが、別目的の未消費 HUMAN_TURN だけで承認される(空振り承認・監査から区別不能)`

**種別**: bug / **優先度**: P1 / **重大度**: S2

**body**:

- **背景・対象範囲**: RFC-0001 付録 B 行 2/3 は semi の契約を「フェーズ境界ゲート / walking-skeleton ゲート = 人間が承認」と定める。実装では `assertHumanPresentForGateResolution`(`packages/framework/core/tools/amadeus-state.ts:3691-3742`)が autonomy の `SCOPE_OUT` 宣言を監査行 1 行にするだけで(同 `:3714`)、承認可否は `humanActedSinceGate`(`packages/framework/core/tools/amadeus-lib.ts:3828-3838`)だけが決める。その述語は「直前のゲート解決以降に未消費の HUMAN_TURN が存在するか」であり、**その問いに人間が答えたかは問わない**(境界設計の根拠は `amadeus-lib.ts:3662-3665` に逐語)。結果、モード宣言や「続けて」のために打たれた 1 ターンが milestone 承認として消費される。
- **根拠・実測証拠**: コーパス 185 record で `GATE_APPROVED` 595 件中、「human-required 宣言と同一秒、かつ `Grant Id` も `User Input` も無い」承認が 32 件(うち semi milestone 15 件 = phase-gate 11 / walking-skeleton 4)。根拠 HUMAN_TURN からの経過は最短 4 秒・中央値 14 秒・最長 371 秒で、32 件中 30 件はゲート開設(`STAGE_AWAITING_APPROVAL`)より厳密に前(残り 2 件はゲート開設後にターンがあり空振りと断定しない)。代表例 260814-park-provenance 2026-08-14T11:03:37Z は `STAGE_AWAITING_APPROVAL` / `INTENT_AUTONOMY_HUMAN_REQUIRED` / `GATE_APPROVED` が同一秒に並び、HUMAN_TURN は 9 秒前(生ブロック逐語は調査報告 §2.2)。使い捨て temp project で決定的に再現し、対照として HUMAN_TURN 皆無なら guard は正しく拒否する(調査報告 §3)。あわせて `GATE_APPROVED` の `User Input` は conductor の自由記述で、`approve-batch` の合成文字列 24 件や autonomy 自動承認の転記を含むため人間の証拠にならない(調査報告 §2.3)。
- **期待結果・完了条件**: (1) autonomy が human-required と宣言した occurrence の承認が、その occurrence への人間の応答へ結線されること(方式は設計裁定 — 宣言と応答の対応付け、gate-open 以降に限定した presence、targeted presence reservation の適用拡大など)。(2) `GATE_APPROVED` から「人間が答えた / engine が未消費ターンで通した」を機械的に区別できること。落ちる実証: 現行コードで別目的の HUMAN_TURN 1 件のみによる milestone 承認が exit 0 で通ることを Red として実測。
- **影響・価値**: semi(および none)の milestone ゲートが、ユーザーの認識なしに通過しうる。フェーズ境界・walking-skeleton という「人間が見る前提の節目」がその前提を失い、着地後の監査でも検出できない。P4(不可逆・外部境界には人間を置く)の実効性が機構側で担保されていない。
- **関連 / 非重複**: RFC-0001 D6、#2739(理由の提示 = UX、本件は執行と記録)、#1647(approve-batch の presence 不在 = 別経路、FR-12)、#2378 / #2067 / #2253(autonomy 側)、#675 / #685 / #736 / #779(presence guard 側)。既存 6 述語の検索で本件を扱う Issue は不在。
- **初期分類**: 設計起因(autonomy 層と presence 層の接合部が未規定)。実装単体のバグではない。
