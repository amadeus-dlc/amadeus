# RE Developer Code Scan — #1548 mirror-lifecycle answer/manual-boundary 不成立

Intent: 260726-answer-manual-binding / スコープ amadeus-bugfix / read-only スキャン(修正なし)

## 差分リフレッシュ基点

| 項目 | 値 |
|---|---|
| Base commit | `09c669901385ad44e9a5b378b8d8903eebbc184c`（前 intent `260726-t258-p95-flake` の observed。`ls -t` 最新 re-scan の宣言 observed） |
| 祖先性 | `git merge-base --is-ancestor 09c669901 HEAD` **exit 0**、`git rev-list --count 09c669901..HEAD` = **2**（cid:reverse-engineering:rescan-base-ancestry。候補中で祖先かつ距離最小。f9a0fb86a=距離4 / e39402224=非祖先 / 1673c4332=距離42） |
| Observed commit | `ad1ff5de9785af38f3c845b64372b65e8b73bb4e`（= 現 HEAD、`git rev-parse HEAD` 実測） |

### 区間 `09c669901..HEAD` の面別内訳（実測）

`git log --oneline 09c669901..HEAD`:
- `ad1ff5de9` chore(record): 260726-t258-p95-flake CG+B&T artifacts …
- `f8c068975` chore(record): 260726-t258-p95-flake RE+RA artifacts …

`git diff --numstat 09c669901..HEAD | grep -v amadeus/spaces/` = **0 行**（コード/dist/self-install 面は区間内 0 変更、record-only の2コミット）。

**対象面の交差確認**: `git diff --name-only 09c669901..HEAD | grep -iE "mirror-lifecycle|mirror-gateway|t282|coordinator"` = **0 hit**。lifecycle answer/guard スタックは区間内で不変 → 上流クロスレビュー時点の観測は observed でも行番号込みで有効（ただしブリーフィングの `:340-346`/`:1052-1067` は #1553 のモジュール分割前の stale 値のため全て現 HEAD で再解決した。下記は observed `ad1ff5de9` 実測値）。#1553(v1 読取統一)は着地済みで本コードは分割後の姿。PR #1557(t258)は t258 テスト+p95 perf 面のみで本対象と非交差。

---

## 1. 欠陥機序（現 HEAD で再解決・全て verbatim）

### 1-a. answer 転送の欠落（根本原因）
`packages/framework/core/tools/amadeus-mirror-lifecycle.ts:969-985` `runMirrorLifecycleAnswer`:

```ts
969  return runMirrorLifecycleBoundary(
970    {
971      projectDir: request.projectDir,
972      space: identity.space,
973      intentDir: identity.intentDir,
974      ...(request.repository ? { repository: request.repository } : {}),
975      boundary: expected.event.boundary,
976      answer: {
977        choice: request.choice,
978        bindingId: request.bindingId,
979        answerId: (runtime.newAnswerId ?? randomUUID)(),
980        event: expected.event,
981        operation: expected.operation,
982      },
983    },
984    { ...runtime, ports },
985  );
```

→ `boundary: expected.event.boundary` を転送するが `manualOperation`/`invocationId` を渡さない。

### 1-b. guard(:253-265)が answer を免除しない
`amadeus-mirror-lifecycle.ts:253-265` `runMirrorLifecycleBoundary` 冒頭:

```ts
253  export async function runMirrorLifecycleBoundary(
254    request: MirrorLifecycleRequest,
255    runtime: MirrorLifecycleRuntime = {},
256  ): Promise<MirrorLifecycleAdapterOutcome> {
257    if (
258      request.boundary.kind === "manual" &&
259      (!request.manualOperation || !request.invocationId)
260    ) {
261      return {
262        kind: "error",
263        message: "Manual Mirror lifecycle requires an operation and invocation ID.",
264      };
265    }
```

→ `expected.event.boundary.kind === "manual"` かつ manualOperation/invocationId 未転送のため、manual-boundary ask への answer は常にここで error 終了し、正規経路 `driveMirrorBoundary`→`handlePromptAnswer` に到達不能。

---

## 2. answer 経路の型・契約(修正案 (b) の実現可能性根拠)

**MirrorLifecycleRequest**（`amadeus-mirror-lifecycle.ts:56-65`）:
```ts
56  export type MirrorLifecycleRequest = Readonly<{
57    projectDir: string; …
61    boundary: MirrorBoundary;
62    manualOperation?: MirrorOperation;   // optional
63    invocationId?: string;               // optional
64    answer?: MirrorPromptAnswer;
65  }>;
```

**永続化された expected の中身**（`amadeus-mirror-types.ts:118-124`）:
```ts
118  export type MirrorExpectedPrompt = Readonly<{
119    bindingId: string;
120    event: MirrorEventIdentity;
121    operation: MirrorOperation;
122    issuedAt: string;
123    retryOf?: …;
124  }>;
```
`MirrorEventIdentity`（types :30-34）= `{ intentUuid; boundary; operation }`。manual boundary（types :28）= `{ kind: "manual"; instance: string }`。

**結論(修正案 (b) は fully-persisted なデータで実現可能)**:
- manual 経路の元の値（`parseManualArgs` :445-447）は `manualOperation = operation` / `invocationId = common.instance` / `boundary.instance = common.instance` — すなわち **`invocationId === boundary.instance`** かつ **`manualOperation === boundary の operation`**。
- したがって answer 側で `manualOperation = expected.operation`、`invocationId = expected.event.boundary.instance` を補填すれば元値と一致し、guard を字義どおり充足できる。永続情報だけで再構成に必要な全フィールドが揃う。

---

## 3. guard の防御意図（修正案 (a) が防御を毀損しないかの判断材料）

- guard 導入コミット: `2bb63f6b8 feat(mirror): complete automatic mirror modes`（2026-07-25 14:01、`git log -S` 実測。同コミットが coordinator の `manual execution requires an invocationId` も導入）。
- guard が守る対象 = **manual の decision 実行経路**。`invocationId` の唯一の実消費は `amadeus-mirror-coordinator.ts:304-312` `executionAuthorization`:
```ts
304    if (event.boundary.kind === "manual") {
305      if (!input.invocationId) {
306        throw new Error("manual execution requires an invocationId");
307      }
308      return { ...base, kind: "manual", invocationId: input.invocationId };
309    }
```
- `manualOperation` の唯一の実消費は `amadeus-mirror-coordinator.ts:576`（`selectBoundaryDecision` 内、**非 answer の** `driveBoundaryDecisions` 経路のみ）:
```ts
573    const operation =
574      reconciliation?.originalEvent.operation ??
575      (input.context.boundary.kind === "manual"
576        ? input.manualOperation ?? null
577        : operationForBoundary(input.context, state));
```

**決定的事実（修正案 (a) の安全性）**: `driveMirrorBoundary`（coordinator :700-717）は
```ts
713    if (input.answer) {
714      return handlePromptAnswer(input, initialized.state, input.answer);
715    }
```
で **answer 有り → 常に `handlePromptAnswer` へ分岐**。`handlePromptAnswer`(:509-558)と、その先の `executionAuthorization` の **promptAnswer 分岐(:292-303 `kind:"prompt-approved"`)は `input.invocationId`/`input.manualOperation` を一切参照しない**（invocationId 分岐 :304 へは promptAnswer 未指定時のみ到達、manualOperation 参照 :576 は driveBoundaryDecisions 専用）。
→ **guard の `request.answer` 免除は防御目的を毀損しない**。免除しても、answer なしの manual decision 実行経路には guard がそのまま残り、invocationId/manualOperation の必須性は維持される。

**(a) と (b) の要約**: どちらも到達可能で機能上等価。(a)=guard に `&& !request.answer` を足す最小変更、answer 経路が両フィールド不使用である事実に依拠。(b)=answer 側で永続値から両フィールドを補填、guard 不変。RE は事実提示のみ（裁定は設計/選挙）。

---

## 4. handlePromptAnswer(answer が guard を越えた後の処理)

`amadeus-mirror-coordinator.ts:509-558`。manual boundary でも正しく consume/skip できる構造:
- `:514` `const expected = state.expectedPrompt;` 未存在なら `suppressed:not-applicable`。
- `:524` `approveMirrorPrompt({ expected, answer, state })` で binding 照合。
- `:534` skip → `skippedOutcome`（`consumeExpectedPrompt:true` の skip-for-event transition、reducer :369-)。
- approve → `:543` `triggerEvent = mirrorEventIdentity(input.context.intentUuid, input.context.boundary, approved.operation)` で **`input.context.boundary`（= manual）から triggerEvent を再構成** → `executeDecision(..., promptAnswer)` → executionAuthorization が `prompt-approved` 権限を発行。
→ manual boundary 種でも context.boundary からトリガーを組めるため、guard を越えれば正常に consume される。answer 経路は manualOperation/invocationId に依存しない。

---

## 5. stale expectedPrompt の既存 record 遡及（運用回復手順の要否）

`grep -rl 'expectedPrompt' amadeus/spaces/*/intents/*/amadeus-state.md` = 5 ファイル。全て **`"expectedPrompt":null`**（bindingId 付き非 null は 0 件）:
- `260725-teamup-launch-hardening` / `260726-plugin-host-delivery`（#1548 実測対象と名指し） / `260725-teamup-attach-latency` / `260726-metrics-visualization` → いずれも `expectedPrompt:null`。
- `260726-answer-manual-binding`（本 intent record）は state block 外での言及のみ。

`grep -rEn '"expectedPrompt":\s*\{[^}]*bindingId'` = **0 hit**。

**結論**: committed record に stale expectedPrompt 残存は無い → **修正後の遡及回復手順は不要**。バグは再現可能だが、現時点でコミット済み state を汚染していない（観測はライブで起き、state は null のまま or 修復済み）。

---

## 6. t282 系テスト構造（ask→answer の既習様式 / manual 種の作り方 / gap）

`tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`（998 行）:

**ask→answer 往復の既習様式**（`:579-638` "answer approve binds to the persisted prompt"）:
1. `runMirrorLifecycleBoundary({ …, boundary: { kind: "intent-capture-approved", instance } }, runtime)` → `asked.outcome.kind === "ask"`, `bindingId` 取得。config は `"auto-mirror":"prompt"`。
2. state を parse し `persisted.snapshot.expectedPrompt.bindingId` と一致確認。
3. answer は **CLI 経路** `runMirrorLifecycleMain(["answer","approve","--binding-id", bindingId, "--project-dir", …, "--space", …, "--intent", …], runtime)`（`:620-634`）→ 内部で `runMirrorLifecycleAnswer` へ。
- 他 answer テスト: skip/invalid binding(`:640`)、replay 不可(`:745`)。**全て `intent-capture-approved` boundary の ask**。

**manual テスト**（`:832` "manual create and sync use durable invocation identities" / `:858` "provenance mismatch blocks manual sync"）: いずれも `runMirrorLifecycleBoundary({…, boundary:{kind:"manual",…}, manualOperation, invocationId})` を **直接** 呼ぶだけで、ask→answer 往復を経ない。

**guard の既存 negative テスト**: `:435` "rejects incomplete manual lifecycle requests before target resolution" は manual + 欠落で error を確認（＝バグの guard が正しく発火する側だけを固定）。

**テスト gap（確定）**: **manual boundary が ask を生成 → その ask を answer で貫通する往復テストが不在**。regression-first の落ちる実証はこの往復を新設する必要がある。

**manual ask の作り方(再現シード — 実測トレース)**:
- `decideMirrorAction`（policy :127-134）は `input.kind==="manual"` で常に `kind:"execute"`（prompt を返さない）。よって manual boundary 単独では ask にならない。
- ask 化の経路 = **reconciliation**。先行の manual create が非終端 receipt（status `prepared`/`attempted`/`pending`）を残すと、`selectMirrorReconciliation`（coordinator :116-140）がその receipt を拾い `originalEvent = receipt.event`（manual boundary 付き）を返す。
- 後続の **prompt モードの** 任意 boundary が `driveBoundaryDecisions`→`selectBoundaryDecision`（:569-595）で `event = reconciliation.originalEvent`（= manual event）を採り、`decideMirrorAction({kind:"lifecycle", mode:"prompt", event: manualEvent})`（policy :149-150）→ `{kind:"prompt", event: manualEvent}`。
- `driveBoundaryDecisions`（:633-644）が `set-expected-prompt` を `event: decision.event`（= manual event）で永続 → **`expectedPrompt.event.boundary.kind === "manual"`**。
- この ask を answer すると 1-a/1-b で常に弾かれる。→ 再現には「先行 manual create（非終端 receipt を残す）＋後続 prompt モード boundary」が必要（ブリーフィング整合）。

**stale が全 sync を封鎖する連鎖**（P1/S2 の裏取り）:
- consume は answer 経由のみ。reducer `consumeExpectedPrompt`（state-reducer :244-250）で削除、prompt-approved/skip transition からのみ発火（:272/:300/:382）。repair verbs（status/relink/abandon）は expectedPrompt 非対象 → ツール内回復不能。
- 未 consume のまま次 boundary が prompt 化すると `reduceSetExpectedPrompt`（state-reducer :539-547）:
```ts
540    if (existing) {
…
547      return invalid("set-expected-prompt: a different unconsumed prompt is pending");
```
→ coordinator :641-663 で `expectedPromptWasPersisted` false → `safety-blocked`「expected prompt could not be persisted」。**以後の create/sync/close prompt が全滅**。

---

## 7. 配布面（対象ファイルのコピー数）

`amadeus-mirror-lifecycle.ts` = **13 コピー**（worktree 除く）:
- canonical 1: `packages/framework/core/tools/`
- self-install 5: `.claude/tools/` `.codex/tools/` `.cursor/tools/` `.kimi-code/tools/` `.opencode/tools/`
- dist 7: `dist/{claude,codex,cursor,kimi,kiro-ide,kiro,opencode}/…/tools/`

修正時は正本編集 → `bun scripts/package.ts`(dist)+`bun run promote:self`(self-install)で同期、`dist:check`/`promote:self:check` で drift 検証（project.md Mandated)。同様に coordinator/policy/types/reducer を触る場合も各 13 コピー同期対象。

---

## 面別サマリ（区間 09c669901..HEAD）

| 面 | 変更 |
|---|---|
| core canonical（lifecycle/coordinator/policy/types/reducer） | 0 |
| dist / self-install | 0 |
| tests（t282 系） | 0 |
| record（amadeus/spaces） | 2 コミット（260726-t258-p95-flake 成果物のみ、本欠陥面と無関係） |
