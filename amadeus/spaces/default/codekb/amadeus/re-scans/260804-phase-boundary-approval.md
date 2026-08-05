# RE スキャン記録 — 260804-phase-boundary-approval

## 実行メタデータ

- Date: `2026-08-05`
- Intent: `260804-phase-boundary-approval`（scope `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal）
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
  - 選定根拠: `cid:reverse-engineering:rescan-base-ancestry` に従い、記録済み observed のうち**祖先性を満たす最新**を採用。`git merge-base --is-ancestor 9458bbda8 b938898f3` は exit 0（実測）。
  - 不採用: `58761daa5` は observed の祖先ではないため base にできない。
- Observed commit: `b938898f364160d4b5857e153579b40b5ab18372`（= 本 worktree HEAD、`git rev-parse HEAD` で一致を実測。`cid:reverse-engineering:c2-observed-mainline-commit` に従い mainline 系譜のコミットを記録）
- 区間規模: `git rev-list --count 9458bbda8..b938898f3` = **134 commits**、`git diff --name-only` = **1041 files**、`--shortstat` = `1041 files changed, 84296 insertions(+), 11280 deletions(-)`。
- Focus: [Issue #2143](https://github.com/amadeus-dlc/amadeus/issues/2143) — phase boundary verification の**規約順序**と **approval guard** の非両立。患部は (a) governance protocol § 13 の「いつ検証するか」、(c) `amadeus-state.ts` の `verifyPhaseCheckArtifact` ガード、(d) 各ハーネス annex の approval 手順。加えて区間内の `state` / `approve` 隣接着地を対象に含めた。
- Verification: 患部 seam を observed 断面の verbatim 実読で全数検証（引用不一致は下記「Developer scan との差分」に全て記録）。`tests/unit/t-phase-check-gate-seam.test.ts` を実行 — **16 pass / 0 fail / 36 expect / 214ms**。
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の `260804-evidence-revision-rebind` 節を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない。

## #2143 の3契約の現在地（observed `b938898f3`）

### (a) governance protocol — **区間内で是正済み**

`packages/framework/core/amadeus-common/protocols/stage-protocol-governance.md:14-18`:

```
### When to verify
- After the last stage's outputs and review are complete
- Before reporting approval for the gate whose `run-stage` directive carries
  `phase_boundary`; the approval transition is fail-closed until the artifact exists
- On demand if the user requests verification via `/amadeus --status`
```

base `9458bbda8` 時点の同箇所は:

```
- After the last stage of each phase is approved
- Before the first stage of the next phase begins
```

差分の帰属コミットは **`f7273b9ab` "feat(pi): add Pi agent core support (#2166)"**（`git log 9458bbda8..b938898f3 -- <path>` の結果は当該1コミットのみ）。すなわち **#2143 が指摘した規約側の矛盾（「承認後に検証する」と書いてあるがガードは承認前に発火する）は、Pi ハーネス追加 PR に相乗りする形で既に解消している**。

### (c) state guard — **区間内で無変更**

`packages/framework/core/tools/amadeus-state.ts:379-396` `verifyPhaseCheckArtifact(pd, phase)`。拒否文言は `:390-394`（`Refusing to complete the "<phase>" phase boundary: verification/phase-check-<phase>.md does not exist …`）。

呼出は5箇所（うち4箇所が `amadeus-state.ts` 内）:

| 位置 | 経路 |
| --- | --- |
| `amadeus-state.ts:2263` | `advance` |
| `amadeus-state.ts:2413` | `finalize` |
| `amadeus-state.ts:2539` | `complete-workflow` |
| `amadeus-state.ts:3472` | `approveUnderLock` |
| `amadeus-jump.ts:545` | 前進 jump（`if (hasExecuted) verifyPhaseCheckArtifact(pd, phase)`。`amadeus-state.ts:379` の export をそのまま再利用） |

approve 経路での発火順序（実読、`amadeus-state.ts:3461-3484`）:

```
3461  verifyStageArtifacts(pd, stage);
3464  const authorization = authorizeApproval(pd, content, stage, override);
3467  const nextForPhaseGate = nextInScopeStage(slug, approveScope, content);
3468  if (deferWorkflowCompletion && nextForPhaseGate !== null) {
3469    error("--defer-workflow-completion is valid only for the final in-scope stage.");
3471  if (!nextForPhaseGate || nextForPhaseGate.phase !== stage.phase) {
3472    verifyPhaseCheckArtifact(pd, stage.phase);
3484    setCheckbox(validateStageState(content), slug, "completed"),
```

**ガード `:3472` は checkbox 書込 `:3484` より前**であり、artifact 不在なら `error()` が exit するため state file は無傷のまま承認が拒否される（fail-closed）。区間内でこの関数・呼出点に変更はない。

### (d) harness annex — **ギャップは「annex 対 guard」へ移動、かつ pi のみ正しい**

8ハーネス全数を observed 断面で実読した結果:

| ハーネス | approval 条項 | `phase_boundary` / phase-check への言及 |
| --- | --- | --- |
| `pi` | `skills/amadeus/SKILL.md:98-103` | **あり** — 唯一の正しい記述 |
| `claude` | `skills/amadeus/SKILL.md:98-99` | なし（`:119` に「load at phase boundaries」の弱いポインタのみ） |
| `codex` | `skills/amadeus/SKILL.md:96-97` | なし（`:117` に同上） |
| `kimi` | `skills/amadeus/SKILL.md:96-97` | なし（`:117` に同上） |
| `kiro` | `skills/amadeus/SKILL.md:92-93` | なし（`:119` は「load at phase boundaries」のみ、目的語なし） |
| `kiro-ide` | `skills/amadeus/SKILL.md:92-93` | なし（同上） |
| `cursor` | `commands/amadeus.md`（82行） | approval 条項自体が薄く、phase-check 言及なし |
| `opencode` | `commands/amadeus.md`（81行） | 同上 |

pi の正しい記述（`packages/framework/harness/pi/skills/amadeus/SKILL.md:98-103`、verbatim）:

```
When a `run-stage` directive carries `directive.phase_boundary`, load the
governance companion and write
`<record>/verification/phase-check-<phase>.md` before reporting approval. The
field is computed after scope overrides, so it also covers an early phase exit
where the phase's usual final stage was skipped. Never report first and try to
repair a rejected transition afterward.
```

対して claude `:99`（verbatim 抜粋）は `Otherwise present the approval gate via AskUserQuestion (Approve / Request Changes). On approval, report --stage "<directive.stage>" --result approved` と、**artifact 前提に一切触れずに approval report を直呼びさせる**。codex `:97` / kimi `:97` / kiro `:93` / kiro-ide `:93` も同型である。

5ハーネスが `:117` / `:119` で持つ `stage-protocol-governance.md` へのポインタは「load at phase boundaries」としか言わず、**`report` に対する相対順序を指定しない**。したがって規約（(a)、是正済み）とガード（(c)、fail-closed）は整合しているが、**conductor が実際に読む annex 5本がその順序を伝えていない**。#2143 の残余はここに集約される。

## 新規交差 — autonomy full × phase boundary（#2211 Bolt3 由来）

区間内で `directive.phase_boundary` と autonomy auto-approve が同一 directive 上に共存しうる構造が新設された。

`packages/framework/core/tools/amadeus-orchestrate.ts:2160-2166`（`phase_boundary` の算出）:

```
2160  const phaseBoundary = node.phase === "ideation"
2161      || node.phase === "inception"
2162      || node.phase === "construction"
2163    ? node.phase
2164    : undefined;
2165  if (phaseBoundary !== undefined && (!next || next.phase !== node.phase)) {
2166    directive.phase_boundary = phaseBoundary;
```

`amadeus-orchestrate.ts:2181-2196`（`routeMainWorkflowDirective` — autonomy の付与）:

```
2181  const phaseBoundary = directive.next_stage === null ||
2182    (next !== null && next !== undefined && next.phase !== directive.phase);
2183  const autonomy = productionStageAutonomy({ … phaseBoundary });
2192  if (autonomy.mode === "semi" || autonomy.mode === "full") {
2193    directive.intent_autonomy_mode = autonomy.mode;
2194    directive.autonomy_auto_approve = autonomy.autoApprove;
```

規約側:

- `stage-protocol.md:33` — `A directive carrying autonomy_auto_approve: true is different: the audit-backed Intent authorization has already selected the gate effect, so after the full quality ritual the conductor reports approval without presenting a human question or synthesizing HUMAN_TURN.`
- `stage-protocol.md:129` — `` `none` requires a human for stage and phase gates. `semi` auto-approves gates within a phase but requires a human at a phase boundary. `full` auto-approves both under the active Intent grant. ``

`full` では phase boundary も auto-approve され、人間ターンなしで `report --result approved` に到達する。一方 `verifyPhaseCheckArtifact`（`:3472`）は autonomy を一切参照しない。**artifact を書く主体が人間ターンだと暗黙に仮定されているのに、その人間ターンが存在しない経路が新設された。** 結果として `full` × phase boundary は「ガードで確実に止まる」形になり、fail-closed ではあるが**進行不能**である（誰も artifact を書かない）。ただし本 RE では `full` grant 下の実 run を再現していないため、実損の有無は **UNCONFIRMED**。

directive スキーマ側の宣言（`amadeus-directive.ts`）:

- `:97-100` `intent_autonomy_mode?: "semi" | "full"` / `autonomy_auto_approve?: boolean` / `intent_grant_id?: string` / `quality_repair?: "active" | "error"`
- `:143` `next_stage?: string | null`
- `:144-149` `phase_boundary?: "ideation" | "inception" | "construction"`（コメント `:144` = `the phase whose verification artifact must exist BEFORE this gate is approved`）
- 検証器 `:606-609`（optional enum / boolean / string）、`:633-637`（`phase_boundary` の enum 検証）
- 既知キー配列 `:403-411`

## 構成デルタ（実測）

### core tools 103 → 116

追加14（すべて `packages/framework/core/tools/`、行数は observed 実測）:

| ファイル | 行 | 役割 |
| --- | --- | --- |
| `amadeus-approval-authorization.ts` | 80 | approval 権限の分類とサブプロセス結果の解釈 |
| `amadeus-goal.ts` | 582 | goal 定義 |
| `amadeus-goal-reconciliation.ts` | 883 | goal lineage の突合 |
| `amadeus-intent-autonomy.ts` | 961 | autonomy ドメイン |
| `amadeus-intent-autonomy-production.ts` | 900 | 本番結線（`productionStageAutonomy`） |
| `amadeus-intent-autonomy-runtime.ts` | 800 | ランタイム |
| `amadeus-intent-autonomy-replay.ts` | 175 | replay |
| `amadeus-loop-monitor.ts` | 795 | ループ検出ドメイン |
| `amadeus-loop-monitor-runtime.ts` | 816 | ランタイム |
| `amadeus-loop-monitor-replay.ts` | 553 | replay |
| `amadeus-quality-repair.ts` | 838 | 品質修復ドメイン |
| `amadeus-quality-repair-runtime.ts` | 951 | ランタイム |
| `amadeus-quality-repair-replay.ts` | 190 | replay |
| `amadeus-pi-doctor.ts` | 392 | pi 診断 |

削除1: **`amadeus-grant-authorization.ts`**。後継は `amadeus-approval-authorization.ts`:

- `:20-48` `classifyApprovalAuthority(input): ApprovalAuthority` — `normal` / `targeted-human` / `invalid` の3値に分類。`targetIntentId` と `presenceReservationId` は**対で必須**（`:26-28` の `hasTarget !== hasReservation` → `"partial authorization carrier"`）。`targeted-human` は `operatingMode === "solo"` かつ UUIDv7 / UUIDv4 形式を要求（`:30-37`）。
- `:55-80` `parseApprovalProcessResult(result)` — 承認サブプロセスの stdout を**単一 JSON 行**として解釈。`exitCode !== 0` → `fatal-error`、stderr 非空 → `protocol-error`、複数行 → `protocol-error`、`{"kind":"approved"}` 以外のキーを持つ → `protocol-error`。

消費側: `amadeus-orchestrate.ts:4445` `handleAuthorizedApprovalReport(pd, slug, authority)`、dispatch は `:4728`。

### 新ハーネス pi（8番目）

`packages/framework/harness/pi/` は既存ハーネスの hook / plugin 構成と異なり、**driver / guardian / replay-store / extension** 構成をとる:

| ファイル | 行 |
| --- | --- |
| `drivers/amadeus-pi-driver.ts` | 659 |
| `drivers/amadeus-pi-guardian.ts` | 377 |
| `drivers/amadeus-pi-replay-store.ts` | 336 |
| `drivers/amadeus-pi-driver-contract.ts` | 231 |
| `extensions/amadeus-pi-extension.ts` | 1313 |
| `manifest.ts` | 97 |
| `onboarding.fills.ts` | 31 |
| `skills/amadeus/SKILL.md` | 200 |
| `skills/amadeus/question-rendering.md` | — |
| `dot-gitignore` | — |

`package.json` に pi ブロックが追加（実測 diff）:

```json
"pi": {
  "extensions": ["./dist/pi/.pi/extensions/amadeus.ts"],
  "skills": ["./dist/pi/.pi/skills/amadeus"]
}
```

### config の破壊的再編（`07446ef8b feat(config)!`）

`amadeus-config.ts`（observed 771行）の canonical key は6本のドットパスに正規化された（`:59-64`）:

```
"intent-mirror.github.issue.mode"
"intent-mirror.github.project.targets"
"solo-election.trigger.mode"
"finding.github.issue.creation.mode"
"swarm.unit.concurrency.limit"
"plugin.activation.names"
```

実体は `AMADEUS_CONFIG_REGISTRY`（`:472` 以降）が持ち、各エントリは `legacy: { key, valueConversion }` を伴う。旧フラットキーは移行入力としてのみ解釈される。

| canonical path | 定義 | legacy key | 値変換 | 既定値 |
| --- | --- | --- | --- | --- |
| `intent-mirror.github.issue.mode` | `:474` | `auto-mirror` | `unchanged` | `"prompt"` |
| `intent-mirror.github.project.targets` | `:483` | `mirror-projects` | `unchanged` | `[]` |
| `solo-election.trigger.mode` | `:492` | `auto-solo-election` | `false -> manual; true -> auto` | `"manual"` |
| `finding.github.issue.creation.mode` | `:504` | `auto-file-findings` | `unchanged` | `"prompt"` |
| `swarm.unit.concurrency.limit` | `:513` | `max-parallel-units` | `unchanged` | `4` |
| `plugin.activation.names` | `:522` | `plugins` | `unchanged` | `[]` |

**`swarm.unit.concurrency.limit` は新規キーではなく `max-parallel-units` の改名である**（Developer scan の「新規」判定を実読で訂正）。`plugin.activation.names` のみ `layers: ["project"]`、他5本は `ALL_LAYERS`（`:470`）。

election 側は `amadeus-election.ts:66` の usage が `[--trigger manual|auto]` — 受理値は2種で、solo 経路の拒否は `:460` の `reason: "solo-election-manual-trigger-required"`。

### CLI 契約変更

- `amadeus-state.ts approve`: `--target-intent-id` / `--presence-reservation-id`（`:3684-3685` で読取、対で必須）、`--defer-workflow-completion`（`:3686` で読取、`:3468-3470` により**最終 in-scope stage 限定**）。`reject` も同じ presence 対を受ける（`:3945`, `:3950-3953`）。
- `amadeus-bolt.ts` サブコマンド5種追加: `set-autonomy`（`:1117`）/ `preview-autonomy`（`:1118`）/ `decide-question`（`:1119`）/ `observe-quality`（`:1120`）/ `resume-quality`（`:1121`）。既存 `approve-batch` は `:1091`。
- authorized 経路の承認出力は**単一 JSON 行 `{"kind":"approved"}`**（`amadeus-approval-authorization.ts:63-80`）。

### テスト

- `tests/` 配下 `.test.ts`: **883 → 927**。`.ts` 全体: **991 → 1066**。
- 新規（抜粋、実測）: `tests/unit/t426-loop-monitor.test.ts` / `t427-loop-monitor-runtime.test.ts` / `t428-quality-repair.test.ts` / `t429-quality-repair-replay-validation.test.ts` / `t431-intent-autonomy.test.ts` / `t431-structured-config.test.ts` / `t-live-e2e-kernel.test.ts` / `t-pi-driver-contract.test.ts` / `t-pi-harness-manifest.test.ts`、integration に `t426`/`t427`/`t429`/`t430`/`t432`/`t433`/`t435` と `t-pi-*` 8本、`t-live-e2e-*` 8本、e2e に `t-pi-candidate-conformance.serial.test.ts`。
- 削除: `t-solo-standing-grant-domain.test.ts`（unit / integration 両方）/ `t-solo-standing-grant-harness.test.ts` / `t-solo-standing-grant-opencode-mint.test.ts` / `t257-amadeus-config.test.ts` / `t343-amadeus-mirror-project-config.test.ts`。
- `tests/unit/t-phase-check-gate-seam.test.ts` 実行結果（本 RE で実測）: **16 pass / 0 fail / 36 expect / 214ms**。`complete-workflow` の describe が `state-fix-final-construction` + `seedGoalReceiptForFinalStage("build-and-test")` へ再シードされている — #2171 で goal receipt が workflow completion の前提条件になった帰結。

### CI

新規 workflow 3本: `.github/workflows/pbt.yml` / `metrics-backfill.yml` / `no-silent-drop-evidence-reconcile.yml`。
新規 scripts 6本: `scripts/harness-manifest.ts` / `no-silent-drop-evidence.ts` / `no-silent-drop-evidence-adapter.ts` / `pi-conformance-evidence.ts` / `pi-live-rpc.ts` / `pi-package.ts`。

### 依存

`package.json` の外部依存に変更なし（diff は pi ブロック追加のみ）。ビルドは bun 不変。

## 技術的負債シグナル

1. **annex 対 guard の契約ギャップ（#2143 の残余、S2 相当）** — 規約 (a) とガード (c) は整合したが、conductor が実際に読む annex 5本（claude / codex / kimi / kiro / kiro-ide）が `phase_boundary` → artifact → approval の順序を伝えない。pi のみ正しい。同一フレームワークの8ハーネスで手順が不一致。
2. **autonomy full × phase boundary（新規交差、S2 相当）** — `verifyPhaseCheckArtifact` は autonomy 非認識。`full` は phase boundary も auto-approve するため、artifact を書く人間ターンが存在しない経路が新設された。fail-closed だが進行不能。実損は UNCONFIRMED。
3. **config 破壊的再編の波及（S3 相当）** — canonical key の6ドットパス化に伴いテスト2スイート（`t257-amadeus-config` / `t343-amadeus-mirror-project-config`）が削除された。conductor 側の記述（`conductor.md` の config 節）が旧フラットキー前提のまま残っていないか要確認。
4. **runtime / replay 三つ組の構造的重複（S3 相当）** — `intent-autonomy` / `loop-monitor` / `quality-repair` / `goal` の4系統が `X.ts` + `X-runtime.ts` + `X-replay.ts` の同一命名規約で計約7500行あり、共有抽象がない。

## Developer scan との差分（Architect が実読で訂正した点）

Step 2 の Developer scan 出力に対し、observed 断面の verbatim 実読で以下を訂正した。

| 項目 | scan の記述 | 実測 |
| --- | --- | --- |
| 区間 commit 数 | 137 | **134**（`git rev-list --count`） |
| core tools 数 | 105 → 115 | **103 → 116** |
| harness annex の位置 | codex `:57-65` / kimi `:80-88` | **codex `:96-97` / kimi `:96-97`**（`:57-65` は directive 種別表であり approval 条項ではない） |
| claude / kiro / kiro-ide の approval 条項 | 「approval 条項なし」 | **あり** — claude `:98-99` / kiro `:92-93` / kiro-ide `:92-93`。いずれも phase-check 前提に触れない |
| pi の approval 条項 | 「approval 条項なし」 | **あり、かつ8ハーネス中唯一 `phase_boundary` → artifact → approval を正しく記述**（`:98-103`） |
| `classifyApprovalAuthority` | `:21-47` | **`:20-48`** |
| `parseApprovalProcessResult` | `:54-79` | **`:55-80`** |
| テストファイル数 | 767 → 803 | **`.test.ts` 883 → 927**（`.ts` 全体 991 → 1066） |
| scripts 追加 | 7本 | **6本**（`manifest-types.ts` は base 時点で既存） |
| `ci.yml` の変化 | 「135行改修」 | **`4 insertions(+), 131 deletions(-)`** — 改修ではなく `pbt-deep` ジョブの `pbt.yml` への移設が実体 |
| `swarm.unit.concurrency.limit` | 「新規」 | **`max-parallel-units` の改名**（`amadeus-config.ts:513` の `legacy.key`） |
| カバレッジゲート強化 | 2件 | **1件**（`Relative coverage gate (head vs merge-base)` → `Project coverage gate (absolute and merge-base-relative)`。別途 `persist-credentials: false → true` の権限緩和1件） |

上記のうち **pi と claude/kiro/kiro-ide の annex 判定の訂正は #2143 の結論を変える**。ギャップは「annex 一般が phase-check を知らない」ではなく、「**8ハーネス中 pi 1本だけが正しく、残り7本が未追随**」である。是正の形は「pi の記述を残り5つの skill-bearing annex へ横展開する」ことになる。
