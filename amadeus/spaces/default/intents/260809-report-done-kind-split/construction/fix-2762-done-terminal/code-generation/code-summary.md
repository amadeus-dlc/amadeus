# Code Summary — fix-2762-done-terminal

上流入力(consumes 全数): `requirements.md`(FR-1〜FR-7、および `requirements-analysis-questions.md` の方式改訂節による方式 B への読み替え)。設計系 consumes(business-logic-model / business-rules / domain-entities / performance-design / security-design / deployment-architecture)と `unit-of-work.md` は self-fix スコープの上流 SKIP により不在(expected)。

## 本 unit の実配送(再実装せず着地面を実測)

本 unit の実装は、2026-08-10 の並行セッションが出した **PR #2767**(`fix(orchestrate): report の commit ack を専用の `committed` ディレクティブ種別へ分離(#2762)`、squash `34888d840e538d0df8a504ed7cd26b9814a9b5c8`、merged 2026-08-10T01:00:03Z)で `main` へ着地済み。本 intent 自身の CG 成果 PR #2770(方式 A)は 2026-08-10T01:21:22Z に supersede クローズ済み。Issue #2762 は CLOSED。

- 測定 ref: worktree `intent-2764-complete` の HEAD = `e7c0515fec217a589035e8ba0aef814599ad34a2`(origin/main 断面)
- 祖先証明: `git merge-base --is-ancestor 34888d840e538d0df8a504ed7cd26b9814a9b5c8 HEAD` → exit 0
- PR 状態の取得: `gh pr view 2767 --json state,mergedAt,mergeCommit` / `gh pr view 2770 --json state,closedAt` / `gh issue view 2762 --json state`
- 本セッションでの実装コード変更は **0 行**(再実装は不要と実測で確定)

## 方式(A → B)の確定

- RA 当初裁定 Q1 = A(`done` へ `terminal: boolean`)。CG 実測により **B(専用 kind `committed` の新設)** へ改訂済み(`requirements-analysis-questions.md` の「裁定の改訂」節と「裁定改訂の provenance 訂正」節が正本)
- 以下の FR 検証は、その改訂後の読み替え(FR-1 = `committed` kind 新設 / FR-2・FR-3 = 非終端3サイトを `committed` へ・終端4サイトは `done` 不変 / FR-4 = Stop hook 無改修 / FR-5 = SKILL 8面+docs / FR-6・FR-7 不変)に対して行う

## FR 別の着地面実測

### FR-1 — `committed` kind の新設(`packages/framework/core/tools/amadeus-directive.ts`)

述語 `grep -n '"committed"' packages/framework/core/tools/amadeus-directive.ts` → 5 行一致(:54 DirectiveKind union / :401 `CommittedDirective.kind` / :502 `VALID_KINDS` / :743 `FIELD_CHECKS_BY_KIND` の committed row / :1456 golden sample)。`COMMITTED_FIELDS = ["kind", "reason"]`(:587)、`FIELD_CHECKS_BY_KIND.committed`(:619)。`DoneDirective` は `{kind, reason}` のまま不変(:407-410)、`DONE_FIELDS` も `["kind","reason"]` のまま(:588)。

### FR-2 / FR-3 — emit サイトの terminal / 非終端分離(`amadeus-orchestrate.ts`)

`kind: "done"` / `kind: "committed"` の全行を抽出し、列 0 の `function` 宣言で所有者を機械決定(python 走査、上記測定 ref):

| 行 | kind | 所有関数 | 分類 |
|---|---|---|---|
| 3301 | done | `emitReadonlyLatchDone` | 終端(read-only latch) |
| 3931 | done | `handleNext` | 終端(workflow complete) |
| 5710 | done | `handleSingleReport` | 終端(single-stage 完了) |
| 6772 | done | `handleReport` | 終端(already-Completed の再 report) |
| 6317 | committed | `handleAuthorizedApprovalReport` | 非終端(承認 ack) |
| 6793 | committed | `handleReport` | 非終端(idempotent stale re-report) |
| 6879 | committed | `handleReport` | 非終端(通常 commit ack) |
| 6920 / 6941 / 6946 | committed | `handleFailureRuling` | 非終端(後続 intent が追加した retry / skip 系) |

RA が名指した非終端3サイト(旧 :5382 / :5765 / :5849)は 6317 / 6793 / 6879 に対応し、いずれも `committed`。終端4サイト(旧 :2987 / :3582 / :4933 / :5744)は 3301 / 3931 / 5710 / 6772 に対応し、いずれも `done` のまま。`handleFailureRuling` の3件は本 intent より後の変更で追加された非終端 ack であり、同じ分離規則に従っている。

### FR-4 — Stop hook 無改修で整合(`packages/framework/core/hooks/amadeus-stop.ts`)

`grep -n 'committed\|runEngineNextKind\|"done"' packages/framework/core/hooks/amadeus-stop.ts` → hook は `runEngineNextKind()`(:852、新規 spawn した `next` の kind)を読み、`kind === "done"` で `allowStop()`(:1021)。`committed` の分岐は存在しない(0 hit)。上表のとおり `committed` の emit は全て `report` 系ハンドラであり `next` 経路は 1 件も発行しないため、非終端 ack が Stop 判定へ到達しない構造が保たれている。

### FR-5 — conductor 契約の同期

`for f in packages/framework/harness/*/skills/amadeus/SKILL.md packages/framework/harness/*/commands/amadeus.md; do grep -c committed "$f"; done` → claude / codex / kimi / kiro / kiro-ide の SKILL.md が各 6、cursor / opencode の commands/amadeus.md が各 6、pi の SKILL.md が 5(pi は別文言のため件数が異なる — RA 前提どおり)。合計 8 面すべてが非ゼロ。docs は `docs/reference/17-skill-system.md` 6、`docs/reference/17-skill-system.ja.md` 5 — 差の1件は en 側 :126(swarm `finalize` 表の無関係な語)であり、契約に関わる 5 行(:38 `committed` 行 / :39 `done` 行 / :66 ループ手順 / :77 mermaid / :81 図のテキスト説明)は英日で同一位置・同一内容。

契約行の逐語(claude SKILL.md):
- :22 forwarding loop — 「continue immediately for `committed`, `run-stage`, `invoke-swarm`, and `print`; stop for `ask`, `select-intent`, `error`, `parked`, `await-completion`, or `done`」
- :60 `committed` 行 — 「Never present this as a completion — it is the ack for a successful `report`, not the end of the workflow.」
- :61 `done` 行 — 「Only a terminal completion emits this — a successful `report` acks with `committed`.」

### FR-6 — 落ちる実証テスト

`tests/integration/t528-report-ack-kind.integration.test.ts` が実在(初出コミット = `34888d840` = PR #2767 そのもの、`git log --diff-filter=A -- <path>` で実測)。RA は「新規テスト番号は t524 から」と予約していたが実配送は t528 で着地しており、採番差の理由は #2767 の diff からは導出できない(推測しない)。現行 t524 は別 intent の2本 — `t524-mint-presence-dist-exclusion`(初出 `4baad0b8a` / PR #2768)と `t524-subjects-declare-writer`(初出 `c0fca4ecb` / PR #2779)— が占有しており、いずれも #2767 マージ(01:00:03Z)より後の着地。番号の再取得は不要。

- `bun test tests/integration/t528-report-ack-kind.integration.test.ts` → **7 pass / 0 fail**(15 expect)
- 既存 directive 系: `bun test tests/unit/t115.test.ts tests/integration/t118.test.ts` → **38 pass / 0 fail**(171 expect)

### FR-7 — スコープ外の不変

`VALID_KINDS` への追加は `committed` のみ(:502)。他 directive kind の形は不変(`DONE_FIELDS` 不変を上記 FR-1 で実測)。件数語は方式 B 採用に伴い「値の断定を除去」ではなく実数へ同期する形で吸収されており、SKILL.md :76 は emit 対象13種を明示列挙している(`VALID_KINDS` 17 要素のうち `dispatch-subagent` / `present-gate` は同行が placeholder と明記、`waiting` / `await-approval` は列挙外 — この差分は RA が Out of scope とした件数語ドリフト(仮説C)の残余であり、本 unit の患部外)。

## 生成物 drift

`bun run build` 実行後の `git status --porcelain --untracked-files=no` → 1 行(`amadeus-state.md`、本セッションの unpark による record 更新)。`packages/` / `dist/` / `docs/` / `tests/` の tracked 変更は 0。

## 配送記録(pr-convergence)

本 unit の Bolt PR は #2770 だが収束せず、#2767 に supersede された。したがって収束レポートは `kind: override` で記録する(監督者裁定 2026-08-19、選択肢 C)。詳細は同ディレクトリの `pr-convergence-report.md` と `requirements-analysis-questions.md` の「配送クロージャの裁定(2026-08-19)」節。

## プランからの逸脱

- code-generation-plan.md の Step 1〜7(実装)は、着地済みのため本セッションでは実行せず**検証に置換**した(上記 FR 別実測)。再実装は org.md Forbidden「要求されない変更を足さない」および surgical 規範に反する
- Step 9(配送)の「Bolt PR 発行 → 収束ループ → converged」は成立せず、override による記録へ置換(監督者裁定)
