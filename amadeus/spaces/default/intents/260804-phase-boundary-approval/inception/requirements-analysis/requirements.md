# Requirements — 260804-phase-boundary-approval(Issue #2143 + #2232)

上流入力(consumes 全数): `codekb/amadeus/business-overview.md`、`codekb/amadeus/architecture.md`、`codekb/amadeus/code-structure.md`(いずれも RE 差分リフレッシュ済み、observed `b938898f3`)。裁定入力: `requirements-analysis-questions.md`(Q1〜Q6、全て A)。

測定 ref: observed = `b938898f3`(本 intent の RE 断面)。file:line は observed 断面で実読確認済み(`re-scans/260804-phase-boundary-approval.md` が一次記録)。

## Intent analysis

**達成したいこと**: phase boundary の承認と検証、および advisory の人間選択という2つの「人間の正当な意思表示」が、機構に一度も無音破棄されずに受理される状態にする。

Issue #2143 の起票時点の前提「3契約(governance protocol / harness annex / state guard)すべてが不整合」は observed 断面では成立しない。governance protocol は区間内の `f7273b9ab`(#2166)で state guard と整合済みであり(`stage-protocol-governance.md:14-18`)、正順の実装記述も `harness/pi/skills/amadeus/SKILL.md:99-104` に既に存在する。**残ギャップは「pi 以外の skill-bearing 5 ハーネス(claude/codex/kimi/kiro/kiro-ide)の SKILL.md が正順を記述していない」ことに縮退している**(8ハーネス全数実読、`re-scans` 記録。なお RE 記録の「pi の annex :98-103」は正しくは SKILL.md:99-104 — 本書で訂正)。

Issue #2232(ユーザー裁定「一緒に直せ」で編入)は同型の欠陥である: #2143 が「正当な承認が typed error になる」なら、#2232 は「正当な advisory 選択が無音不採用になる」。本セッションで4経路を実測した(完全一致要求 `amadeus-advisory-choice.ts:829-836` / AskUserQuestion 非計上 `amadeus-mint-presence.ts:142-152` / binding 失効 / 提示→選択の隣接順序要求 `amadeus-advisory-choice.ts:569-588`)。人間は同じ選択を5回入力させられた。

さらに #2211(autonomy)の着地により、`full` モードが phase boundary を auto-approve する経路(`stage-protocol.md:33`、`:129`)が新設されたが、guard(`amadeus-state.ts:379-395`、approve 呼出は `:3466-3473`)は autonomy を認識せず、artifact を著述する順序の記述もない。テスト空白は CONFIRMED。

## Functional requirements

### FR-1: 正順記述の横展開(裁定 Q3=A / Q6=A)

**FR-1a**: `harness/pi/skills/amadeus/SKILL.md:99-104` の正順記述(「`directive.phase_boundary` を持つ run-stage では、governance companion を読み、approval を report する**前**に `<record>/verification/phase-check-<phase>.md` を書く。scope override 後に計算されるため早期 phase 終了もカバーする。先に report して後から修復しない」)と等価な文言を、claude / codex / kimi / kiro / kiro-ide の `skills/amadeus/SKILL.md`(正本 = `packages/framework/harness/<h>/skills/amadeus/`)へ追加する。

**FR-1b**: 文言は pi を正本とし、各ハーネスの既存の承認節(codex/kimi の直接 report 契約を含む)と矛盾しない位置に置く。直接 report 契約自体は変更しない(承認の前提条件を明示するだけ)。

**FR-1c**: 投影(`dist/` / self-install ツリー)は生成物として同期する(手編集しない)。

**受け入れ基準**:
- skill-bearing 6 ハーネス(pi 含む)の SKILL.md 全てが `phase_boundary` → artifact 著述 → approval report の順序を記述していること
- codex annex の直接 report 契約(`question-rendering.md` の approval 節)と読み合わせて順序循環が生じないこと

### FR-2: annex 間 drift の機械検査(裁定 Q4=A)

skill-bearing ハーネスの SKILL.md 全数に対し、順序契約の文言(`phase_boundary` と `phase-check-` と「before reporting approval」相当)の存在を検査する test を追加する。新ハーネス追加時に SKILL.md が正順記述を欠くと赤になること(pi を含む全数走査で、ハードコードのハーネス列挙をしない)。

### FR-3: production-path test(裁定 Q5=A)

**FR-3a**: phase-check artifact 不在から開始し、「artifact 著述 → approve 成功」の正順と「artifact 不在のまま approve → fail-closed 拒否」の両アームを、phase 最後の in-scope stage について検証する production-path test を追加する。

**FR-3b**: Ideation→Inception、Inception→Construction、Construction→Operation の3境界を同じ契約で検証する(既存 `t-phase-check-gate-seam.test.ts` の16ケースを土台に、不足分を追加)。

**FR-3c**: canonical な phase 終端 stage が SKIP される scope でも、実際の phase 最後の in-scope stage でガードが発火することを検証する(guard 呼出 `amadeus-state.ts:3471` の `nextInScopeStage` 分岐)。

### FR-4: autonomy `full` × phase boundary の構造対応(裁定 Q2=A)

**FR-4a**: `autonomy_auto_approve: true` かつ `phase_boundary` 付きの directive では、conductor が approval を report する**前**に phase-check artifact を著述する順序を `stage-protocol.md`(auto-approve 節 `:33` 付近)へ明記する。guard(`amadeus-state.ts:379-395`)は変更しない。

**FR-4b**: この交差の test を追加する: phase-check 不在で auto-approve 経路が approve を呼ぶと fail-closed 拒否になること、artifact 著述後は成功すること。

### FR-5: advisory-choice の決定的受理経路(裁定 Q1=A、#2232)

**FR-5a**: `amadeus-advisory-choice.ts` に `record` サブコマンドを新設する: `record --advisory-instance <id> --choice <run-now|defer-with-risk> [--project-dir <path>]`。conductor が AskUserQuestion の回答を受けて呼ぶ。

**FR-5b**: provenance は直近の real `HUMAN_TURN` へ束縛する(shard / eventIdentity / timestamp を receipt に記録、既存 `recordProtectedAdvisoryChoice` の provenance 形と同一)。HUMAN_TURN が1件も無い場合は fail-closed で拒否する。

**FR-5c**: 既存の prompt 完全一致経路(`choiceFromExactPrompt` / mint-presence hook)は後方互換として残す。`record` は既存の受理条件のうち「提示→選択の隣接順序」(`hasMatchingAdvisoryPresentation`)を「open な pending が存在し、DECISION_RECORDED 提示が記録済みであること」へ置き換える(同一 HUMAN_TURN の二重消費拒否・shard 一致・grounded 検査は維持)。

**FR-5d**: 拒否時は理由を stderr の typed error で返す(無音 false を返さない)。

**FR-5e**: conductor 側の手順を更新する: `await-advisory-choice` 直下(SKILL.md の当該行)を「AskUserQuestion で提示 → 回答を `record` で確定 → `next` 再実行」へ書き換える(skill-bearing 全ハーネス、FR-1 と同じ投影同期)。

**受け入れ基準**:
- AskUserQuestion の回答だけで advisory が確定し、人間が選択肢文字列を手打ちする必要がないこと
- 複数行メッセージ・介在ターンが受理を壊さないこと(record 経路)
- 二重 record が同一 receipt に畳まれる(または明示拒否される)こと
- prompt 経路の既存 test が green のままであること

### FR-6: 既存テスト契約の明示改訂

FR-3/FR-4/FR-5 で挙動が変わる既存 test(`t-phase-check-gate-seam.test.ts`、advisory-choice 系)は、改訂前 assert・改訂後 assert・理由を code-generation の成果物に記載する。

## Non-functional requirements

**NFR-1(fail-closed 維持)**: phase-check 不在のまま `PHASE_VERIFIED` または次 phase へ進む経路は引き続き存在しないこと。advisory の `record` も grounded HUMAN_TURN 不在・pending 不在では拒否。

**NFR-2(投影同期)**: 変更対象の SKILL.md / protocol は 1正本 + 投影。`bun scripts/package.ts` → `bun run promote:self` で同期し、`distribution:check` / `source-only:check` を検証に含める。

**NFR-3(テスト配置)**: 実 FS を要する guard / record の検証は integration 層、文言存在検査(FR-2)は unit 層。

**NFR-4(落ちる実証)**: 新設ガード・検査は失敗ケースを注入して赤を実測してから完成扱い(org.md Mandated)。

## Constraints

- **C-1(guard 不変)**: `verifyPhaseCheckArtifact` の判定・メッセージは変更しない(裁定 Q6=A: エンジン/guard 改修なし)。
- **C-2(直接 report 契約の維持)**: codex/kimi annex の「approval 後に report を直接呼ぶ」契約は変更しない。
- **C-3(生成物の手編集禁止)**: `dist/` / `.claude/` 等の投影は package/promote で再生成する。
- **C-4(TDD)**: 実行可能な振る舞いの追加・変更は Red 実測 → 最小実装 → Green の vertical slice(team.md `cid:code-generation:tdd-default-with-narrow-exceptions`)。

## Assumptions

- **A-1**: `directive.phase_boundary` は scope override 後の実効 phase 終端で正しく立つ(`amadeus-orchestrate.ts:2160-2166`、`amadeus-directive.ts:144-149`)。FR-3c はこれを検証で裏取りする。
- **A-2**: 本 intent 自身のワークフローが Inception→Construction 境界を次の gate で踏むため、FR-1 の正順(artifact 著述 → approve)は本 run で実地検証される。
- **A-3**: `record` サブコマンド新設は `.amadeus-advisory-choice.json` の store スキーマを変えない(receipts へ同形で追記)。

## Out of scope

- **OS-1**: エンジンによる verification move の明示 route(裁定 Q6 で B を不採用。必要になれば別 intent)。
- **OS-2**: guard の ask 化(裁定 Q6 で C を不採用 — fail-closed の形を変えない)。
- **OS-3**: cursor / opencode への承認節新設(裁定 Q3 で B を不採用 — 承認儀式自体が無い)。
- **OS-4**: autonomy `full` の意味論変更・Bolt 5(terminal completion)— #2067 の active intent が所掌。
- **OS-5**: mint-presence hook の分類機構自体の再設計(#2232 の残余があれば follow-up)。

## Open questions

- **OQ-1**: FR-5e の conductor 手順更新で、`advisory-decision` 提示記録(`amadeus-log.ts`)と `record` の呼び順をどう固定するか(提示記録 → AskUserQuestion → record が自然)。functional-design 相当の検討は code-generation 計画で確定する(self-fix scope のため設計 stage は SKIP)。
- **OQ-2**: FR-2 の文言検査を、将来の文言リライトに壊されにくくする最小の不変量(フィールド名 `phase_boundary` + artifact パス断片 + 順序語)をどう選ぶか。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T01:02:22Z
- **Iteration:** 1
- **Scope decision:** none

requirements.md は上流3成果物・Q&A6設問(全てA)と矛盾なく対応。traceability良好、#2067との非干渉明示。FOLLOW-UP 2件は code-generation 計画で解消すれば十分。

### Findings

- FOLLOW-UP | requirements.md FR-5 受け入れ基準 | 二重recordの挙動(冪等畳み込み/明示拒否)を code-generation 計画で1つに固定する(OQ-1と併せて解消)
- FOLLOW-UP | requirements.md Q5とFRの対応 | 「初回の有効承認がerror化しない導線」をFR-3の受け入れ基準へ一文で明示する
- NIT | requirements.md FR-2/FR-3/FR-4 | 受け入れ基準の見出し形式を揃える
