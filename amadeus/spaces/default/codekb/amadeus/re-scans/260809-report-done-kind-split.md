# re-scan 記録 — 260809-report-done-kind-split（Issue #2762: `kind:"done"` の2義衝突）

## 0. 実行メタデータ

- Base commit: `778567dd03b00f22cb887eec06f025557eeaaaf4`（直前 intent `260809-sensor-parseflags-failop` の observed。`git merge-base --is-ancestor 778567dd03b00f22cb887eec06f025557eeaaaf4 HEAD` → **exit 0** = 祖先性 OK）
- Observed commit: `91f37ec8589cdf468599b4787e27e5125d4d16e8`（`git rev-parse HEAD` 実測）
- Scan mode: **xrev differential**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— #2762 はクロスレビュー2名 ESTABLISHED_WITH_REFINEMENTS 済み
- 行番号 currency: レビュー検証 SHA ≡ observed（完全一致）→ 再解決は **no-op**（`cid:reverse-engineering:E-XBB-RE-S13-c2`、測定区間は `review..observed`）。加えて `base..observed` の変更 68 ファイル（`git diff --name-only <base> <observed> | wc -l`）に患部ファイルは含まれない（record・codekb・metrics・sensor docs・intent-autonomy-production のみ）
- 二重化: Developer scan を一次入力とし、Architect が observed 断面を `git show "<SHA>:<path>"` で verbatim 再読（`cid:requirements-analysis:zsh-revpath-brace-quoting` に従いブレース明示）
- **観測 ref**: 以下すべての file:line は observed = `91f37ec85` で解決する（`cid:reverse-engineering:measurement-ref-in-artifacts`）

---

## 1. 非終端 `done` ack の全数分類

検索述語（逐語・再実行可能。`cid:requirements-analysis:enumeration-completeness-review` の追補 E-ASD-RES13 に従い、パターン・対象・除外を記録）:

```
git show "91f37ec8589cdf468599b4787e27e5125d4d16e8:packages/framework/core/tools/amadeus-orchestrate.ts" | grep -nE 'kind: ?"done"'   # → 7 hit
git show "91f37ec8589cdf468599b4787e27e5125d4d16e8:packages/framework/core/tools/amadeus-orchestrate.ts" | grep -cE 'kind: ?"done"'   # → 7
git show "91f37ec8589cdf468599b4787e27e5125d4d16e8:packages/framework/core/tools/amadeus-orchestrate.ts" | grep -nE '"done"'          # → 8 hit（+ :4635 は FORWARD_RESULTS の値 "done"、kind ではない → 除外）
```

Architect 独立再列挙の結果は Developer scan と**一致**（7サイト、除外1件も同一）。

| 行 | 到達経路（関数） | 分類 | reason 逐語（要点） |
|---|---|---|---|
| 2987 | `handleNext` Branch 0 read-only latch（`:2983-2992`） | **turn 終端・正**（stop が正しい） | `The read-only/navigation command (${latchLabel}) already ran this turn and its output was shown above. … The workflow is unchanged; if one is active it remains paused where it was. STOP.` |
| 3582 | `handleNext` 完了判定（`!next` かつ Status=Completed） | **終端・正** | `Workflow complete — no in-scope stage remains after ${currentSlug} (scope: ${scope}).` |
| 4933 | single-stage run 完了 | **終端・正** | `Single-stage run of "${node.slug}" committed under synthetic workflow "${wfId}". The main workflow's Current Stage is untouched.` |
| **5382** | `handleAuthorizedApprovalReport` | **★ 多義（polymorphic）** | `Committed approve for "${slug}" with ${authority.kind} authorization. State advanced; run next to continue.` |
| 5744 | `handleReport` already-Completed 再 report | **終端・正** | `Workflow is already completed at "${slug}" (scope: ${scope}); no transition was needed.` |
| **5765** | `handleReport` stale re-report guard（`:5754-5771`） | **純・非終端** | `Stage "${slug}" is already completed and the workflow has moved on to "${currentSlug}" (scope: ${scope}); idempotent re-report, no transition needed.` |
| **5849** | `handleReport` 通常 commit ack | **★ 多義（polymorphic）** | `Committed ${committed.join(" + ")} for "${slug}" (scope: ${scope}). State advanced.${intentCaptureMirror} Run next to continue.` |

### ★ 最重要所見: `:5382` / `:5849` は「非終端 ack」ではなく**多義**

両レビュアーは `:5382` / `:5765` / `:5849` を一律「非終端 ack 3箇所」と分類したが、実測では **`:5382` と `:5849` は同じ emit 点から terminal も出す**。修正方式に直接効く事実である。

`:5849` の合流構造（observed 断面の verbatim。Architect が `sed -n` + `nl` で再読・全行一致を確認）:

```
5674:  const isFinal = nextInScopeStage(slug, scope, stateContent) === null;
5675:  const completionDisposition = isFinal
5676:    ? completionMirrorDisposition(pd)
5677:    : { kind: "immediate" as const };
…
5790:    sequence.push(approveArgs(slug, flags, deferWorkflowCompletion));   // gated → approve
5791:  } else if (isFinal) {
5792:    const completeArgs = ["complete-workflow", slug];                   // 非gated かつ最終 → TERMINAL
5793:    if (flags.reason) completeArgs.push("--reason", flags.reason);
5794:    sequence.push(completeArgs);
5795:  } else {
5796:    sequence.push(["advance", slug]);                                   // 非gated 途中 → NON-TERMINAL
5797:  }
…
5814:    committed.push(subArgs[0]);
5848:  emit({
5849:    kind: "done",                                                       // 3分岐すべてがここへ合流
```

`:5382` の合流構造（verbatim）:

```
5298:  const isFinal =
5299:    scope !== null && nextInScopeStage(slug, scope, stateContent) === null;
…
5349:  const deferWorkflowCompletion =
5350:    isFinal && completionDisposition.kind === "defer";
5351:  const approve = ["approve", slug];
5352:  if (deferWorkflowCompletion) {
5353:    approve.push("--defer-workflow-completion");
5354:  }
…
5377:  if (deferWorkflowCompletion) {
5378:    emitDeferredCompletionBoundary(pd, slug, approvalIntent);
5379:    return;
5380:  }
5381:  const approvedReason = `Committed approve for "${slug}" with ${authority.kind} authorization. State advanced; run next to continue.`;
5382:  emit({ kind: "done", reason: approvedReason });
```

**含意（修正設計の一次制約）**:

1. 判別子 `isFinal` は**両サイトのスコープ内に既に存在する**（`:5674` / `:5298-5299`）→ 新規の状態読取なしで判別可能
2. `committed` 配列の中身（`approve` vs `complete-workflow`）は**判別子として不十分** — gated 最終ステージは `approve` が `complete-workflow` へ自己委譲する（`tests/unit/t115.test.ts` T16 が `WORKFLOW_COMPLETED` を1回 assert）。信頼できるのは `isFinal`
3. `deferWorkflowCompletion` 経路は両サイトとも先に return（`await-completion` / mirror boundary directive）→ **多義解消の設計先例が既に存在する**（「終端だが未コミット」を別 kind へ切り出した実装）
4. 事実の精密化: `:5849` の reason は terminal 時にも `State advanced. … Run next to continue.` と述べる = **kind が曖昧なだけでなく reason 文言も terminal ケースで不正確**

### `:2987` の扱い（準患部）

stop 自体は正しい（read-only コマンドは前進しない）。ただし SKILL.md 契約の「Present the completion summary」文言はこのケースに不適合。**分類は裁定事項**（reviewer-2 も同旨）。

---

## 2. 契約面（消費者）の棚卸し

### 2-a. ハーネス SKILL.md — **6面**

`find packages -name SKILL.md -path '*amadeus*'` → harness 配下 6ファイル実在（`claude` / `codex` / `kimi` / `kiro` / `kiro-ide` / `pi`。他は `packages/framework/core/skills/` の別スキル群で対象外）。

| harness | 契約行 | 文言 |
|---|---|---|
| claude | `:60` | `` | `done` | The workflow (or single-stage run) is complete. Present the completion summary and STOP the loop. | `` |
| codex | `:58` | 同上（逐語一致） |
| kimi | `:60` | 同上 |
| kiro | `:56` | 同上 |
| kiro-ide | `:56` | 同上 |
| **pi** | **`:121`** | `` - `done`: present the completion summary and stop. ``（**別文言**） |

さらに全6面が forwarding-loop の stop 集合に `done` を含む（claude `:22` / codex `:20` / kimi `:22` / kiro `:20` / kiro-ide `:20` / pi `:70`）。

claude `:22` 逐語:
```
Treat the directive returned by the report as the next loop step: continue immediately for `run-stage`, `invoke-swarm`, and `print`; stop for `ask`, `select-intent`, `error`, `parked`, `await-completion`, or `done`.
```

→ **report の返り値を loop step として stop 判定する**契約であるため、多義は契約を直撃する。

**レビュアー verdict の照合**: reviewer-1「5つの SKILL.md」= 逐語同一文言の集合（正）。reviewer-2「6ハーネス全て」= pi の別文言を含む集合（正）。**両者は矛盾せず、修正時の同期対象は 6面**。

### 2-b. ★ reviewer-1「訂正4」の反証 — docs/reference にも契約は実在する

reviewer-1 は逐語「stage-protocol.md と docs/reference には `done` kind の契約はありません」と述べたが、Architect 独立実測で**後半を反証**:

- `docs/reference/17-skill-system.md:38` 逐語: `` | `done` | Yes | The workflow (or single-stage run) is complete. Present the completion summary and STOP. | `` ← **SKILL.md と同じ契約行**
- `docs/reference/17-skill-system.ja.md:38` 逐語: `` | `done` | Yes | ワークフロー（または single-stage 実行）が完了した。完了サマリを提示し、STOP。 | ``
- `docs/reference/17-skill-system.md:76` / `.ja.md:76`（terminal 分岐の散文。逐語「For terminal `print`, `error`, and `done` it stops the loop.」）
- `docs/reference/17-skill-system.md:80` / `.ja.md:80`（Stop hook の done→allow）
- `docs/reference/06-hooks-and-tools.md:50, 250, 259` / `.ja.md:48, 248, 257`
- `docs/reference/14-claude-features.md:333` / `.ja.md:328`

一方 stage-protocol 側は **0 hit**（`grep -rc '`+"`done`"+`' packages/framework/core/amadeus-common/` → 全ファイル 0）= reviewer-1 のこの半分は正。

→ **同期対象は「6ハーネス SKILL.md + `amadeus-directive.ts` + docs/reference 3文書 × 英日2面」**。reviewer-1 の提案集合（5 SKILL.md + directive.ts）では docs 6ファイルが漏れる。

### 2-c. 型・validator（`amadeus-directive.ts`）

観測 ref での実測座標（**Architect が scan の座標を1件訂正**）:

| 座標 | 内容 |
|---|---|
| `:52` | union メンバ `\| "done"` |
| `:330-331` | doc 逐語 `// done — stop the loop (workflow or single-stage complete). \`reason\` records // why the loop ended.` |
| **`:332-335`** | `export interface DoneDirective { kind: "done"; reason: string; }` — **scan 記載の `:333-336` は off-by-one。実測は `:332` が `export interface DoneDirective {`、`:333` が `kind: "done";`** |
| `:338` 近傍 | `parked` doc 逐語 `Distinct from \`done\` (which means "workflow complete")` |
| `:357` 近傍 | `await-completion` doc `Distinct from \`done\`: nothing has completed yet.` |
| `:407` | `VALID_KINDS` の要素 |
| `:474` | `const DONE_FIELDS = ["kind", "reason"] as const;` |
| `:495` | `KNOWN_FIELDS_BY_KIND` の row（`done: DONE_FIELDS,`） |
| `:548` | `FIELD_CHECKS_BY_KIND` の row（`done: (o, errors) => checkString(o, "reason", "done", errors),`） |
| `:1201` | golden sample `{ kind: "done", reason: "Workflow complete — all in-scope stages approved." }` |

`VALID_KINDS` 実数 = **13**（機械再計算。`cid:requirements-analysis:ledger-count-mechanical-recalc`）:

```
git show "91f37ec8589cdf468599b4787e27e5125d4d16e8:packages/framework/core/tools/amadeus-directive.ts" \
  | awk '/VALID_KINDS = \[/,/\] as const/' | grep -cE '^\s*"'   # → 13
```

要素列挙（同述語の `grep -E` 出力からの転記）: `run-stage`, `dispatch-subagent`, `await-advisory-choice`, `invoke-swarm`, `present-gate`, `ask`, `select-intent`, `print`, `error`, `done`, `parked`, `await-completion`, `await-approval`。

**allowlist は strict**（rule 3、verbatim）:
```
590:  // Rule 3: unknown keys — any key not in this kind's allowed set.
591:  const known = new Set<string>(KNOWN_FIELDS_BY_KIND[kind]);
592:  for (const key of Object.keys(o)) {
593:    if (!known.has(key)) {
594:      errors.push(`${kind}: unknown key: ${key}`);
```

→ フィールド追加方式は `DONE_FIELDS` の改修が**必須**（reviewer-1 の指摘どおり）。両 Record は total（`Readonly<Record<DirectiveKind, …>>`）なので新 kind 方式は**行漏れがコンパイルエラーになる**（`:503` 逐語コメント「Adding a DirectiveKind without a row here is a compile error (Record is total).」）。

### 2-d. テスト消費者

検索述語: `grep -rn --include="*.ts" '"done"' tests/` → 103 hit。うち orchestrate directive の消費者は下表（残りは audit `Details: "done"`、hook の `last_assistant_message: "done"`、`amadeus-election.ts` 自前の `done` kind（t236/t241/t237）、純関数 `nextConstructionStep` の `{kind:"done"}`（t250）= **別型・除外**）。

| ファイル:行 | 対象サイト | 形 |
|---|---|---|
| `tests/unit/t115.test.ts:287,314,332,350,373` | **`:5849`（非終端）** | `expect(report.out).toContain('"kind":"done"')` |
| `tests/unit/t115.test.ts:426,496` | **`:5849`（終端 = 最終 gated approve）** | 同上（`countEvent(p,"WORKFLOW_COMPLETED")===1` と対） |
| `tests/unit/t115.test.ts:502` | `:5744`（already completed） | + `toContain("already completed")` |
| `tests/unit/t115.test.ts:538,557` | **`:5765`（非終端）** | stale re-report guard |
| `tests/unit/t115.test.ts:586` | `:5849` 系 | 同上 |
| `tests/unit/t186-…:481` | `:5849`（per-unit 全被覆後 approve） | `expect(d.kind).toBe("done")` |
| `tests/unit/t179-…:112,132,152,169,190,210,229,253` | `:2987`（latch） | `toContain` / `not.toContain` 各 assert |
| `tests/unit/t-batch3-orchestrate-seam.test.ts:164` | `:2987` | in-process `handleNext` |
| `tests/unit/t113.test.ts:137` | validator fixture | `{ kind:"done", reason:"Workflow complete." }` |
| `tests/integration/t118.test.ts:52,441,457` | **`:5382`（authorized）** | テスト名逐語 `SP7-control: report --result approved --user-input -> done` |
| `tests/integration/t-solo-gate-transaction-carrier.test.ts:167` | **`:5382`** | `expect(directive.kind).toBe("done")` |
| `tests/integration/t365-kimi-reviewer-boundary…:788,1747,1844,2393` | `:5382` / `:5744` | `JSON.parse(approved.stdout).kind` |
| `tests/integration/t435-intent-autonomy-production…:564` | **`:5382`/`:5849`** | `toContain('"kind":"done"')` |
| `tests/integration/t127-single-stage-invariant.test.ts:193` | `:4933` | 終端・正 |
| `tests/integration/t321-…:222` / `t322-…:174` | `:4933`（`--single`） | 終端・正 |
| `tests/integration/t429-legacy-goal-migration…:211` | `:3582` | `toMatchObject({ kind: "done" })` |
| `tests/integration/t121-stop-hook-enforce.test.ts:221-222,846-847,917,924,1464,1469` | Stop hook 側 | スタブ engine が `done` を返す |

`t115` は `.sh` からの CLI 契約ポート（TAP plan 22）で、ヘッダ逐語「An in-process twin would lose the directive-JSON-to-stdout half (every "kind":"done"/"kind":"error" assertion)」— 挙動が3重（テスト名・assert・パリティ注記）に固定されている。`cid:reverse-engineering:c1-pinned-behavior-ruling` の対象であり、**方式によっては要件段で仕様裁定とテスト契約の明示改訂をセットで確定してから着手する必要がある**。

### 2-e. Stop hook（バックストップ）

`packages/framework/core/hooks/amadeus-stop.ts:931-932` 逐語:
```
// `done` → the workflow is complete; allow the turn to end.
if (kind === "done") {
```

kind の出所は report の stdout ではなく `runEngineNextKind()`（= `next` の再 spawn）→ reviewer-1「訂正3」・reviewer-2「精緻化5」と整合（実害は conductor 判断層に限定。例外は fail-open 時と Stop hook 非配線ハーネス）。

---

## 3. 修正方式の surgical 比較（RA 裁定の材料。**裁定ではなく所見**）

### 方式(a): 別 kind 新設（例 `committed` / `advanced`）

触る面:
- `amadeus-directive.ts`: union `:52`、新 interface、`VALID_KINDS :407`、`<KIND>_FIELDS` 新設、`KNOWN_FIELDS_BY_KIND :495` 近傍、`FIELD_CHECKS_BY_KIND :548` 近傍、golden sample `:1201` 近傍 = **7箇所**
- ハーネス SKILL.md **6面**: 契約表1行追加 + forwarding-loop stop/continue 集合（claude `:22` 等）+ **kind 件数語の同期**
- `docs/reference` **6ファイル**（17-skill-system 英日 `:38`/`:76`/`:80` / 06-hooks-and-tools 英日 / 14-claude-features 英日）
- Stop hook: continue 側集合への追加（現状 `done` は allow なので、新 kind は block 側 = **実挙動変更**）
- テスト: 上表の `:5382` / `:5849` / `:5765` を pin する約15 assert の期待値改訂

**★ 件数語ドリフトの実測（方式(a)固有のコスト）**:
- SKILL.md 5面 逐語「The orchestration engine emits **ten** kinds today」（claude `:73` / codex `:71` / kimi `:71` / kiro `:67` / kiro-ide `:67`）
- `docs/reference/17-skill-system.md:32` 逐語「a discriminated union over **nine** directive kinds」「The engine **emits seven kinds today**」
- `docs/reference/17-skill-system.ja.md:32` 逐語「**9つ**のディレクティブ種別」「エンジンは**今日7つの種別を発行**します」
- 実測 `VALID_KINDS` = **13**

→ **すでに4値がドリフト済み**（ten / nine / seven / 9つ・7つ vs 実数 13）。方式(a)はこの件数語群を全て触ることになり、`cid:code-generation:count-comment-sync-on-catalog-change`（件数語は隣接列挙がある場合のみ許容）と `cid:functional-design:c3-adjacent-enum-numerals` の適用対象になる。**これは本 issue の患部ではない既存ドリフト**（同根棚卸しとして別 Issue 化候補 — `cid:code-generation:same-root-inventory`）。

利点: 型で terminal/非terminal が分離され消費者が誤読しえない（parse-don't-validate 的）。`await-completion` / `parked` が既に「done から切り出した別 kind」という**設計先例**を持つ。

### 方式(b): `done` に `terminal: boolean` を追加

触る面:
- `amadeus-directive.ts`: `DoneDirective :332-335` に1フィールド、`DONE_FIELDS :474` に1要素、`FIELD_CHECKS_BY_KIND` の done row `:548` に boolean 検査、golden sample `:1201` = **4箇所**
- ハーネス SKILL.md **6面**: 契約表1行の文言改訂（件数語は不変 = ドリフト面に触らない）
- `docs/reference` **6ファイル**: 同上
- Stop hook: `kind === "done"` のみで allow している `:932` を `terminal` 参照へ改訂（**必須** — さもなくば非終端 done でも allow する）
- テスト: `toContain('"kind":"done"')` 形の assert は**そのまま通る**（部分文字列）。`toBe("done")` / `toMatchObject({kind:"done"})` も通る。**改訂が必須なのは terminal 判別を新たに assert する分のみ**

**後方互換の実測判定**: strict allowlist（rule 3）により、新フィールドは既存 done 消費者を壊さない（unknown key チェックは受信側 validator が持つ集合を使うので、集合を更新すれば済む）。ただし `terminal` を optional にすると「未指定 = どちらか」の曖昧が残り**判別子として fail-open** になる → **required boolean** が P2（検証劇場回避）と整合。required にすると `:2987` / `:3582` / `:4933` / `:5744` の4サイトも `terminal: true` の明示追加が必要（機械的）。

### surgical 比較（所見。裁定は RA）

| 観点 | (a) 別 kind | (b) terminal フラグ |
|---|---|---|
| `directive.ts` 触る箇所 | 7 | 4 |
| 既存テスト assert の期待値改訂 | 約 15 | ほぼ 0（追加 assert のみ） |
| 件数語ドリフト面への波及 | **あり**（ten/nine/seven/13 の是正を巻き込む） | なし |
| Stop hook | continue 集合へ追加（挙動変更） | `:932` を terminal 参照へ（挙動変更） |
| 型による誤読防止 | 強（kind で分離） | 中（同 kind・フィールドで分岐） |
| 設計先例 | `await-completion` / `parked` が先例 | 先例なし |
| **多義2サイトの分岐実装** | 両方式とも `isFinal` で分岐（**同コスト**） | 同左 |

**いずれの方式でも共通に必要な実装**: `:5382` と `:5849` で `isFinal` による分岐、`:5765` は常に非終端、`:2987` / `:3582` / `:4933` / `:5744` は常に終端。加えて `:5849` の reason は terminal 時に `State advanced. Run next to continue.` と述べる不正確さがあるため、分岐時に文言も分ける必要がある。

---

## 4. 自己参照リスク

この修正が動かす契約は、**修正 intent 自身の report ループが使う面**である。

- 実装中の `report` は旧 `done`（または新 kind）を返し、conductor がそれを stop と読むと自 intent が止まる
- 固定手段: **`:5849` を pin する既存テスト `t115` が CLI 契約ポート（プロセス境界 spawn）** なので、ここに「非終端 ack が terminal と区別可能であること」を追加 assert すれば、実行時の自己参照とは独立に固定できる（`t115` はサブプロセスで隔離された state を使う）
- あわせて `tests/integration/t121-stop-hook-enforce.test.ts:846-847`（スタブ engine が `done` を返し `runEngineNextKind` が `"done"` を返す）が Stop hook 側の分岐を固定しており、Stop hook 改訂の**落ちる実証**はここへ注入できる
- 実装中の運用ハザード: 本 intent の conductor は自分の report ack を stop と誤認しないよう、**report 直後に `next` を実測**する（issue 本文の観測どおり `next` は `run-stage` を返す）

---

## 5. Requirements Analysis へ送る裁定候補

1. **修正方式の選択** — 方式(a) 別 kind 新設 / 方式(b) `terminal` required boolean。実測コスト差は §3 の表。型による誤読耐性（LLM conductor が boolean 分岐を確実に踏むか）は**実測不能な設計判断**
2. **`:2987`（read-only latch）の分類** — stop 自体は正しいが SKILL.md の「completion summary を提示」文言が不適合。terminal 扱いのままとするか、第3の分類を設けるか
3. **`t115` 既存ピンの明示改訂範囲** — `cid:reverse-engineering:c1-pinned-behavior-ruling` に従い、仕様裁定とテスト契約の改訂をセットで確定してから着手する。方式(b)なら改訂は追加 assert のみで足りる見込み（未実装のため見積り）
4. **件数語ドリフト（ten/nine/seven/9つ/7つ vs 実数 13）の扱い** — 本 issue の患部外の既存欠陥。別 Issue 化するか、方式(a)を採るなら同一変更で是正するか
5. **`terminal` を required にする場合の終端4サイトへの明示追加** — 機械的だが diff は広がる。fail-open 回避（P2）との整合は required 側に立つ
6. **Stop hook `:932` の改訂と落ちる実証の注入面** — `t121:846-847` を注入面とすることの可否

---

## 6. 事実・仮説・未検証の分離

### 事実（observed 断面で verbatim 実測済み）

1. `kind:"done"` は `amadeus-orchestrate.ts` に **7サイト**。うち `:5382` と `:5849` は**多義**（terminal/非terminal の両方を単一 emit 点から出す）、`:5765` は純・非終端、残り4は終端
2. 判別子 `isFinal` は両多義サイトのスコープ内に既存（`:5298-5299` / `:5674`）。新規の状態読取は不要
3. `committed` 配列は判別子として不十分（gated 最終は `approve` が `complete-workflow` へ自己委譲）
4. `deferWorkflowCompletion` は両サイトで先に return し `await-completion` / mirror boundary を出す = **多義を別 kind へ切り出した設計先例が既に存在**
5. 契約面は SKILL.md **6面**（5面逐語同一 + pi 別文言）+ `amadeus-directive.ts` 座標群 + **`docs/reference` 6ファイル**（英日3対）。stage-protocol は 0 hit
6. validator rule 3 は unknown key を **strict 拒否**（`:590-594`）→ 方式(b)は `DONE_FIELDS` 改修必須、方式(a)は Record total によりコンパイル時に漏れ検出
7. `VALID_KINDS` = **13**。SKILL.md は「ten kinds」、`17-skill-system.md:32` は「nine」「seven」、`.ja.md:32` は「9つ」「今日7つ」= **既存の件数語ドリフト（本 issue の患部外）**
8. Stop hook `:932` は `next` 再 spawn の kind で判定するためバックストップとして機能（両レビュアーの精緻化と整合）
9. テストピンは `t115`（CLI 契約ポート・TAP parity）が中核。非終端サイトを pin する assert は `t115` / `t118` / `t-solo-gate-carrier` / `t435` / `t186` に分布

### レビュアー verdict への訂正（一次証拠付き）

- **reviewer-1「訂正4」の「docs/reference には done kind の契約はありません」は誤り** — `docs/reference/17-skill-system.md:38` に SKILL.md と同一の契約行が実在（英日2面）。`stage-protocol.md` に無いという半分は正。同期対象集合は reviewer-1 提案より **docs 6ファイル分広い**
- **両レビュアーの「非終端 ack 3箇所」は分類が粗い** — `:5382` / `:5849` は非終端専用ではなく多義。「3箇所を別 kind へ替える」という素朴な修正は**終端ケースを非終端として出す新たな欠陥を作る**
- reviewer-1「5 SKILL.md」と reviewer-2「6ハーネス」は矛盾せず（逐語同一集合 vs 全集合）。修正時の同期は 6面

### Architect 独立再実測による Developer scan の訂正

- `interface DoneDirective` の座標は **`:332-335`**（scan 記載の `:333-336` は off-by-one）。`git show … | grep -nE 'interface DoneDirective'` → `332`、`kind: "done";` → `333` で確定。**結論に影響なし**（触る箇所数は不変）
- 上記以外の全座標（7サイト・directive.ts の `:52`/`:407`/`:474`/`:495`/`:548`/`:1201`・SKILL.md 6面・docs 6ファイル・件数語）は scan と**一致**

### 仮説（未実測 — RA/設計で確定すべき）

- **仮説A**: `:2987` の stop 自体は正しく、契約文言（「completion summary を提示」）のみ不適合 → 分類は裁定事項。実測で確認したのは stop の正しさのみで、文言の可否は判断
- **仮説B**: 方式(b)で `terminal` を required にした場合、終端4サイトへの機械的追加で済む見込み。ただし **conductor 側（SKILL.md）の読み手が boolean 分岐を確実に踏むか**は LLM 挙動依存であり、型で分離する方式(a)の方が誤読耐性が高い可能性 — 実測不能、設計判断
- **仮説C**: 件数語ドリフト（ten/nine/seven/9つ/7つ/13）は本 issue と独立の既存欠陥。同根棚卸し（`cid:code-generation:same-root-inventory`）として別 Issue 化が妥当と思われるが、方式(a)を採る場合は同一変更で触らざるを得ない

### 未検証（修正着手前に実測で確定すること）

- `:5765`（stale re-report guard）の**実再現**は未実施（静的読解 + `t115:538,557` の pin 実在で裏取り）。reviewer-1 も同箇所を未再現と申告
- issue 本文「intent 260809 実行中に3回再現」の回数は record diary 未参照（reviewer-2 が audit シャードから4例目を実測報告済み — 主張を弱める方向ではない）
- 方式(a)/(b) の実際の diff 行数は未実装のため見積り（**触る箇所数は実測**）
- `docs/reference/06-hooks-and-tools.md` / `14-claude-features.md` の各 hit が契約行なのか散文言及なのかの逐語分類は未実施（`17-skill-system.md:38` のみ契約行と確認済み）。同期作業の粒度確定時に要実読

---

## 7. tNNN 予約

使用済み最大 **`t523`**（`find tests -name 't[0-9]*' | grep -oE '/t([0-9]+)' | grep -oE '[0-9]+' | sort -n | tail -1` → `523`）。本 intent は **`t524`** を予約する（`cid:code-generation:swarm-test-number-reservation` / `cid:code-generation:c1-tnnn-collision-on-regrounding` — PR 発行直前とマージ直前に、rev-parse した固定 base SHA の `tests/` で再確認すること）。
