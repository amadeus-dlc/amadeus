# Code Summary — fix-2762-done-terminal

上流入力(consumes 全数): `requirements.md`(FR-1〜FR-7)。ただし FR の受け入れ基準は方式 A 前提で書かれており、`requirements-analysis-questions.md` Q1 の方式 B 改訂で一部が失効している(下記「方式改訂が FR に与えた影響」)。設計系 consumes(business-logic-model / business-rules / domain-entities / performance-design / security-design / deployment-architecture)と `unit-of-work.md` は self-fix スコープの上流 SKIP により不在(expected)。

## 測定 ref

- **`e7c0515fec217a589035e8ba0aef814599ad34a2`** — 本 unit の FR 実測を採った tree(この worktree の `origin/main` 断面)
- **`b47609adaaa689610faf9a1c5ace312b750e8606`** — `pr-convergence-report.md` の attestation が束縛する local / remote / PR head(record checkpoint コミット)
- 両者の関係: `git diff --name-only e7c0515fe b47609ada -- . ':(exclude)amadeus/'` → **0 行**。record checkpoint は `amadeus/` 配下しか触っていないため、下記の FR 実測はすべて attest 断面 `b47609ada` でも同値

## 本 unit の実配送(再実装せず着地面を実測)

実装は **PR #2767**(`fix(orchestrate): report の commit ack を専用の `committed` ディレクティブ種別へ分離(#2762)`、squash `34888d840e538d0df8a504ed7cd26b9814a9b5c8`、merged 2026-08-10T01:00:03Z)で `main` へ着地済み。本 intent 自身の CG 成果 PR #2770(方式 A)は 2026-08-10T01:21:22Z に supersede クローズ。Issue #2762 は CLOSED。

- 祖先証明: `git merge-base --is-ancestor 34888d840e538d0df8a504ed7cd26b9814a9b5c8 HEAD` → **exit 0**
- 状態取得: `gh pr view 2767 --json state,mergedAt,mergeCommit` / `gh pr view 2770 --json state,closedAt` / `gh issue view 2762 --json state`
- 本セッションでの実装コード変更は **0 行**

## 方式改訂が FR に与えた影響

RA 当初裁定 Q1 = A(`done` へ `terminal: boolean`)。CG 実測により **B(専用 kind `committed` の新設)** へ改訂済み(`requirements-analysis-questions.md` の「裁定の改訂」節と「裁定改訂の provenance 訂正」節が正本)。読み替え:

| FR | 方式 A の原文 | 方式 B での扱い |
|---|---|---|
| FR-1 | `done` へ `terminal` 追加 | `committed` kind 新設 |
| FR-2 / FR-3 | 全7サイトが `terminal` を明示 | 非終端3サイトを `committed` へ、終端4サイトは `done` 不変 |
| FR-4 | Stop hook を `terminal` 参照へ改訂 | Stop hook 無改修(`committed` は `report` のみ発行) |
| FR-5 | `done` 行を `terminal` 契約へ | `committed` 行を追加、`done` 行を「終端のみ」へ |
| FR-6 | 落ちる実証 | 不変 |
| FR-7 | **件数語の diff 0・`VALID_KINDS` 要素追加なし** | **失効**(下記 FR-7 節) |

## FR 別の着地面実測

### FR-1 — `committed` kind の新設(`packages/framework/core/tools/amadeus-directive.ts`)

述語 `grep -n '"committed"' packages/framework/core/tools/amadeus-directive.ts` → 5 行(:54 `DirectiveKind` union / :401 `CommittedDirective.kind` / :502 `VALID_KINDS` / :743 `FIELD_CHECKS_BY_KIND` の committed row / :1456 golden sample)。`COMMITTED_FIELDS = ["kind", "reason"]`(:587)、`FIELD_CHECKS_BY_KIND.committed`(:619)。`DoneDirective` は `{kind, reason}` のまま(:407-410)、`DONE_FIELDS` も `["kind","reason"]` のまま(:588)。

### FR-2 / FR-3 — emit サイトの終端 / 非終端分離(`amadeus-orchestrate.ts`)

述語(再実行可能・所有関数は列 0 の `function` 宣言から機械決定):

```python
import re
lines=open('packages/framework/core/tools/amadeus-orchestrate.ts').read().split('\n')
decls=[(i,m.group(1)) for i,m in ((i,re.match(r'^(?:export )?(?:async )?function (\w+)',l)) for i,l in enumerate(lines)) if m]
def owner(idx):
    prev=None
    for i,n in decls:
        if i<=idx: prev=(i+1,n)
        else: break
    return prev
for i,l in enumerate(lines):
    if 'kind: "committed"' in l or 'kind: "done"' in l:
        print(i+1, 'committed' if 'committed' in l else 'done', owner(i))
```

| 行 | kind | 所有関数 | 分類 |
|---|---|---|---|
| 3301 | done | `emitReadonlyLatchDone` | 終端(read-only latch) |
| 3931 | done | `handleNext` | 終端(workflow complete) |
| 5710 | done | `handleSingleReport` | 終端(single-stage 完了) |
| 6772 | done | `handleReport` | 終端(already-Completed の再 report) |
| 6317 | committed | `handleAuthorizedApprovalReport` | 非終端(承認 ack) |
| 6793 | committed | `handleReport` | 非終端(idempotent stale re-report) |
| 6879 | committed | `handleReport` | 非終端(通常 commit ack) |
| 6920 / 6941 / 6946 | committed | `handleFailureRuling` | 非終端(本 intent より後の変更で追加) |

RA の旧行番号との対応は、行番号ではなく **PR #2767 本文の「7サイトの terminal 分類(実測)」表**(旧 2987 / 3582 / 4933 / 5382 / 5744 / 5765 / 5849 と各文脈の対応を #2767 自身が記録)を一次記録として引き、上表の文脈記述と突き合わせて確認した。旧→新の行番号写像そのものは本セッションでは再測定していない(#2767 以後の main 前進で行が移動しているため)。

**gated 最終の終端信号の所在**: 6317(`handleAuthorizedApprovalReport`)は承認 ack として `committed` を返し、終端は返さない。gated 最終で終端が出るのは、その後に conductor が回す `next` の `handleNext`(3931、`Workflow complete — no in-scope stage remains after ...`)、または完了トランザクション未settle時の `emitDeferredCompletionBoundary`(6313-6316 の `deferWorkflowCompletion` 分岐)である。したがって方式 A の受け入れ基準「gated 最終は `terminal:true`」は、方式 B では「gated 最終の ack は `committed`、終端は次の `next` が出す」に置き換わっている。

### FR-4 — Stop hook 無改修で整合(`packages/framework/core/hooks/amadeus-stop.ts`)

述語 `grep -n 'committed\|runEngineNextKind\|"done"' packages/framework/core/hooks/amadeus-stop.ts` → hook は `runEngineNextKind()`(:852、新規 spawn した `next` の kind)を読み、`kind === "done"` で `allowStop()`(:1021)。`committed` の分岐は **0 hit**。

結論の成立根拠は2段階で、強い方だけで足りる:
- (強・独立に成立)`committed !== "done"` かつ hook に `committed` 分岐が無いので、仮に `next` が `committed` を返しても `allowStop()` へは到達しない
- (補強・推論)上表の所有関数名から `committed` の emit は `report` 系ハンドラに限られると読める。ただしこれは所有関数名からの推論であり、CLI verb からの dispatch を辿る述語では確認していない

### FR-5 — conductor 契約の同期

**存在側**: 全10面(SKILL 6面 + cursor/opencode commands 2面 + docs 英日2面)が `committed` を含む。`grep -c committed` → claude/codex/kimi/kiro/kiro-ide の SKILL.md 各 6、cursor/opencode の commands/amadeus.md 各 6、pi の SKILL.md 5(別文言)、`docs/reference/17-skill-system.md` 6、同 `.ja.md` 5。

**不在側**(受け入れ基準「`done` を stop 集合に無条件で挙げる旧記述の残存 0」): #2767 が置換した逐語リテラルで census。対照(現行形)を同時に測り、全件 0-hit の偽陰性を排除:

```
FACES=(claude/codex/kimi/kiro/kiro-ide の SKILL.md + cursor/opencode の commands/amadeus.md = 7 面)
RETIRED='continue immediately for `run-stage`'          → 0 / 7  (期待 0)
CURRENT='continue immediately for `committed`, `run-stage`' → 7 / 7  (対照、期待 7)
```

pi 面は別文言のため個別確認: `packages/framework/harness/pi/skills/amadeus/SKILL.md:68-70` 逐語「Continue for / `committed`, `run-stage`, `invoke-swarm`, and `print`. Stop for `ask`, / `select-intent`, `error`, `parked`, `await-completion`, and `done`.」— continue 集合に `committed`、stop 集合に `done`。

契約行の逐語(claude SKILL.md): :22 forwarding loop / :60 `committed` 行「Never present this as a completion — it is the ack for a successful `report`, not the end of the workflow.」/ :61 `done` 行「Only a terminal completion emits this — a successful `report` acks with `committed`.」

### FR-6 — 落ちる実証

**緑側(本セッション実測、tree = `e7c0515fe`)**:
- `bun test tests/integration/t528-report-ack-kind.integration.test.ts` → **7 pass / 0 fail**(15 expect)
- `bun test tests/unit/t115.test.ts tests/integration/t118.test.ts` → **38 pass / 0 fail**(171 expect)

**赤側(本セッションでは再導出していない)**: 一次記録は PR #2767 の本文「Red → Green(TDD)」節。Red(実装前)= `2 pass / 3 fail`、失敗の逐語は「(fail) `committed` is a valid kind carrying a reason」「(fail) a gated approve acks with `committed`, never the terminal `done`」「(fail) the idempotent stale re-report acks with `committed`」。Green(実装後)= `5 pass / 0 fail / 11 expect()`。negative control として「read-only latch の bare `next` は依然 `done`」が Red 時点から pass。

本セッションで赤を再測定しなかった理由: 赤は実装前のツリー(`34888d840` の親)に t528 を植えた状態でしか成立せず、その ablation は本 unit の患部外へ広く波及する(以後の main 前進で t528 の依存面が変化している)。**したがって FR-6 の赤側は「#2767 の一次記録による」であり、本セッションの未検証面である**。緑側とテストファイルの実在は本セッションで実測した。なお t528 のテスト数は #2767 当時の 5 から現在 7 へ増えている(後続 intent による追加)。

### FR-7 — 受け入れ基準は方式 B 改訂により失効(満たしていない)

方式 A の FR-7 は「件数語を含む行の diff 0」「`VALID_KINDS` の要素追加・削除なし」を課していた。**方式 B ではどちらも成立しない**:

- `VALID_KINDS` へ `committed` が追加されている(`amadeus-directive.ts:502`)— 方式 B の本体そのもの
- 件数語行も #2767 が触っている。述語 `git show 34888d840 -- <SKILL/docs> | grep -E "^[+-].*(nine|ten|seven|eleven)"` の実測:
  - `docs/reference/17-skill-system.md` — **count-free 化**。`-` 側「defines a discriminated union over **nine** directive kinds … The engine **emits seven kinds today**」→ `+` 側「defines a discriminated union keyed on the `kind` field … The kinds below are the ones the conductor branches on; two are documented placeholders …, and the rest are emitted today」(数の断定を除去)
  - SKILL.md 各面 — **実数へ同期**。`-`「emits ten kinds today: …」→ `+`「emits eleven kinds today: … `committed`, …」

この失効は `requirements-analysis-questions.md` の Q1 改訂節が明示的に裁定している(逐語「FR-7 の『件数語不変』は B 採用に伴い『count-free 化(値の断定を除去)』へ緩和」)。**したがって FR-7 は「満たした」のではなく「方式 B 採用により受け入れ基準が置き換わった」**。現行 main の SKILL.md :76 は後続 intent により「thirteen kinds」へ再同期されており(`VALID_KINDS` は 17 要素、うち `dispatch-subagent` / `present-gate` は同行が placeholder と明記、`waiting` / `await-approval` は列挙外)、この残差は RA が Out of scope とした件数語ドリフト(仮説C)であり本 unit の患部外。

## 検証コマンドと exit code(tree = `e7c0515fe` / `b47609ada`、コード面は同値)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run source-only:check` | 0 |
| `bun scripts/mirror-distribution-check.ts` | 0 |
| `bun scripts/mirror-docs-contract.ts` | 0(`OK (4 documents, 44 topics)`) |
| `bun scripts/scan-public-projections.ts` | 0(`OK (448 files)`) |
| `bun run no-silent-drop -- --base-revision e7c0515fe` | 0 |
| `bun tests/callsite-guard.ts --check` | 0 |
| `bun run build` 後の `git status --porcelain --untracked-files=no` | record 配下のみ(`packages/` `dist/` `docs/` `tests/` は 0 行) |

`mirror-docs-contract.ts` と `scan-public-projections.ts` は、フルスイート併走中の初回実行で exit 1 を観測したが、単独再実行でいずれも exit 0 かつ `OK` 行を出力した(併走時の一過性)。表の値は単独実行のもの。フルスイート(`bun run test:ci`)の結果は build-and-test ステージの成果物に記録する。

## 配送クロージャ(pr-convergence)

本 unit の Bolt PR は #2770 だが収束せず、#2767 に supersede された。#2770 には欠落していた Amadeus provenance(タイトル接頭辞と `## Amadeus Work`)を 2026-08-19 に真実として補記済み(実装・コミットは未接触)。

当初の裁定(選択肢 C = `pr-convergence override` で記録)は CLI 契約上実行不能と実測した:

- `override` は self-* record では checkout ブランチ == PR head ブランチを要求(`plugins/github-pr-convergence/tools/pr-convergence-git-runner.ts:255` `verifyCurrentPrerequisites`、ブランチ照合 :263-266)。実行結果 exit 1、逐語 `delivery prerequisite failed: checked-out branch intent-2764-complete is not the PR head branch worktree-agent-a99898fa56f0e6079`
- それを満たしても `selfEvidence`(同 `pr-convergence-cli.ts:711`、定義 :703)が既存の created epoch を要求 — 逐語 `created report is missing; run create first`。#2770 は CLI の `create` を経ていないため不在
- `--unlinked true` は self-* で禁止(同 :662-663)

再エスカレーションのうえ **選択肢 A′** の裁定を得た。本 unit の Delivery Bolt PR は **#3236**(head `chore/record-260809-report-done-kind-split` @ `b47609ada`、base `main`、`git diff --name-only origin/main...HEAD` は record 配下5ファイルのみ)。

> **このレポートの収束判定は「#3236 が収束したこと」を意味し、実装の配送を意味しない。** 実装の配送先は #2767 / `34888d840`。

`pr-convergence-report.md` は CLI が mint し attestation の content digest に束縛されるため、この区別を示す注記をレポート本体へ追記することはできない(追記すると digest 不一致でセンサーが落ちる)。区別は本ファイルと PR #3236 の本文が担う。この構造欠落(supersede された unit に正直なクロージャ経路がなく、機械可読な区別も持てない)は Issue **#3239** として起票済み。

## プランからの逸脱

- code-generation-plan.md Step 1〜7(実装)を実行せず**着地面の実測検証へ置換**した。同じ要件が既に main へ着地しており、再実装は org.md Forbidden(要求されない変更を足さない)と surgical 規範に反する
- Step 9(配送)は当初形「Bolt PR 発行 → 収束ループ → converged」を採れなかった。実装は自 bolt 外(#2767)で配送済みで、自 bolt の PR #2770 は収束せず supersede されたため。監督者裁定により **A′ = 残存成果物(intent record)を運ぶ Bolt PR #3236 の発行**へ置換した。`override` による記録は上記のとおり実行不能で、**実行していない**

## 未検証面(受け入れ基準の外)

- FR-6 の赤側 — #2767 の一次記録による。本セッションでの再導出はしていない(理由は FR-6 節)
- RA 旧行番号(:5382 / :5765 / :5849 等)から現行行番号への写像 — #2767 本文の分類表と文脈記述の突き合わせで確認しており、行番号写像そのものは再測定していない
- `committed` の emit が `report` verb からのみ dispatch されること — 所有関数名からの推論。FR-4 の結論は独立に成立する(FR-4 節)
