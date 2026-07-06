# Requirements — 260704-question-rendering-ux

対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/448 、https://github.com/amadeus-dlc/amadeus/issues/449 、https://github.com/amadeus-dlc/amadeus/issues/450
scope: refactor（Minimal depth）

## Intent 分析

Issue #442 で導入した mode 選択（Guide me / Grill me / I'll edit the file / Chat）と question-rendering annex には、実行時観察で 3 つの UX 欠落が確認された。

1. mode 選択や gate 承認が英語固定で表示される（#448）。annex が spec を AskUserQuestion へ 1:1 マップする指示だけを持ち、表示言語の指示を持たないためである。
2. Codex harness では構造化質問 UI が使われず、素のテキストで複数問が一括提示される（#449）。annex が Claude Code 専用で、Codex には束縛が存在しないためである。
3. Grill me の各質問がプレーンテキストで進む（#450）。engine-bridge が手順（一問ずつ、推奨付き）だけを定め、レンダリング手段を指定していないためである。

3 Issue は同一の annex 群（`skills/amadeus/references/question-rendering.md`、`skills/amadeus-grilling/references/engine-bridge.md`）と同一 skill（amadeus、amadeus-grilling）への変更で promote 単位が重なるため、1 Intent に統合する。
新機能の追加ではなく、#442 で宣言済みの構造化質問契約を「表示言語」「harness 横断」「Grill me」の 3 面で完成させる改善である。

本 Intent は ideation を SKIP する refactor scope のため、intent-statement と scope-document は成果物として存在しない。
両者に相当する内容（背景、確定判断、受け入れ条件）は Issue #448 / #449 / #450 に記録済みであり、intent description は `audit/` の workflow 記録に残っている。
team-practices は `aidlc/spaces/default/memory/team.md`（Git Branching Policy、PR 粒度制約を含む）を参照する。

## 機能要求

| ID | 要求 | 出典 |
|---|---|---|
| R001-display-language-rule | annex に、structured question（mode 選択、gate 承認、ステージ質問の対話提示）のユーザー向け表示（prompt、options の label と description）を**会話言語**で提示する規則を追加する。機械可読の記録と判定（mode 分岐、`[Answer]:` 書き戻し、audit の decision / answer、エンジンへの report）は**正準の英語 label** を維持し、`[Answer]:` の書き戻しは正準ラベル（英語）+ 表示訳の**併記とする**。 | Issue #448、本ステージ Q1 回答 |
| R002-engine-bridge-language-alignment | `engine-bridge.md` の「User-facing question text is Japanese」固定文言を、R001 の会話言語指示と整合させる（会話言語への一般化）。 | Issue #448 実施候補 |
| R003-codex-annex | `skills/amadeus/references/question-rendering-codex.md` を新設し、structured question spec を Codex の `request_user_input` へ束縛する（spec フィールドのマッピング、mode 選択と gate 承認の提示、バッチ上限の差の吸収）。 | Issue #449、本ステージ Q2 回答 |
| R004-codex-fallback-format | Codex annex に、`request_user_input` が使えない環境向けの**テキスト提示フォールバック書式**（1 問ずつ、番号付き選択肢、`[Answer]:` 記入案内、exact label での記録）を契約として明文化する。 | Issue #449 受け入れ条件、本ステージ Q2 回答 |
| R005-grill-me-neutral-rules | Grill me の harness 中立レンダリング規則を annex に追加する。「1 回のツール呼び出しに 1 問だけ」「推奨回答を先頭 option にし、ラベルに推奨マークを付ける」「推奨の根拠は質問本文（またはツール呼び出し直前の地の文）に書く」「選択肢が harness 上限を超える場合は既存の分割規則を流用」「自由記述は harness 組み込みの経路を受け皿にする」「decision / answer 記録と `[Answer]:` 書き戻しは現行手順のまま」。 | Issue #450、本ステージ Q3 回答 |
| R006-grill-me-claude-binding | Claude Code の Grill me を AskUserQuestion へ束縛する（1 問あたり選択肢最大 4 個、Other は UI 組み込み、5 個以上は分割）。 | Issue #450 実施候補 |
| R007-grill-me-codex-binding | Codex の Grill me を `request_user_input` へ束縛する（1 呼び出し 1 問、選択肢 2〜3 個 + custom option、custom を「もう少し議論したい」と自由記述の受け皿にする。不可時は R004 のフォールバック書式に従う）。 | Issue #450 実施候補 |
| R008-wiring-check-extension | `dev-scripts/grilling-wiring.ts` に、表示言語規則の存在、Codex annex の存在と正準 label、Grill me レンダリング規則の存在を assert する検査を追加する（RED→GREEN、既存 marker 検査と両立）。 | Issue #448 / #449 / #450 実施候補 |
| R009-promotion-sync | 変更 skill を `dev-scripts/promote-skill.ts --replace` で昇格し、source と昇格先を同期する。`npm run test:it:promote-skill` を実行する。 | Issue #448 実施候補、`.agents/rules/amadeus-artifacts-and-examples.md` |

## 非機能要求

| ID | 要求 |
|---|---|
| N001-existing-behavior-unchanged | Guide me / I'll edit the file / Chat、gate 承認、Claude Code の既存 AskUserQuestion 束縛の挙動を変更しない（表示言語の追加指示を除く）。 |
| N002-parity-preserved | 上流共通ファイル（`.agents/amadeus/amadeus-common/` ほか）に差分を作らず、`npm run parity:check` が pass する（`engineFileExceptions` は空のまま）。 |
| N003-language-policy | skill 本文（SKILL.md、annex、TS スクリプト）は英語必須（Skill Language Policy）。表示言語規則は「英語で書かれた指示が、実行時に会話言語での表示を命じる」構造にする。 |
| N004-deterministic-check | R008 の検査は決定論的であり、LLM を呼ばない。 |

## 制約

- 上流共通ファイル（`stage-protocol.md` を含む `amadeus-common/`）は変更しない。parity の byte-match 対象である。
- dev-script は TDD で進める。先に失敗する検証を書き、失敗を確認してから最小実装を入れる（`.agents/rules/dev-scripts.md`）。
- skill 昇格は `dev-scripts/promote-skill.ts --replace` を使い、手動同期しない。
- PR 粒度: wiring 検査の拡張（R008）は annex 変更なしでは fail するため、team.md の粒度制約の例外（不可分ケース）として skill 変更と同一 PR にする。例外理由を PR 説明に記録する。

## 前提

- `request_user_input` の有効化条件（Issue #449 の先行確認、2026-07-04 に codex-cli 0.142.5 のバイナリで確認済み）:
  - ツールハンドラ `core/src/tools/handlers/request_user_input.rs` と TUI レンダラ `tui/src/bottom_pane/request_user_input/` が存在する。
  - config キー `experimental_request_user_input`（`ToolsToml`）で gate されており、`config.toml` の `[tools]` セクションでの opt-in が必要である。**既定では無効**。
  - 「request_user_input is not supported in exec mode」の文字列があり、非対話の `codex exec` では使えない。
  - 結論: 既定 off + 環境依存のため、R004 のテキストフォールバック書式は必須の契約である。
- `request_user_input` のバッチ上限は 1 回の呼び出しで 1〜3 問、各問 2〜3 選択肢 + custom option（Issue #449 の確認済み事実）。
- 既存 annex は「Claude Code harness annex」と自己宣言しており、stage-protocol は「orchestrator SKILL.md の隣の annex」を参照する harness 中立契約である（annex の対追加は上流契約と衝突しない）。
- `parity:check` は skill を存在チェックのみで照合するため、annex の追加・変更は parity と衝突しない（Intent 260704-grilling-mode-wiring で裏取り済み）。

## スコープ外

- エンジン（`amadeus-orchestrate.ts`）の `ask` directive の拡張や、エンジンコード（`.agents/amadeus/tools/`）の変更。
- Grill me の既定昇格（Guide me より前に置く変更）。
- Codex 以外の新 harness（Cursor など）向け annex の追加。
- `experimental_request_user_input` を有効化する環境セットアップの自動化。
- ユーザーのタイプ入力が別 worktree の Intent へ HUMAN_TURN として記録される presence フックの worktree 追従問題（本ステージ実行中に観察。別 Issue 候補）。

## 未解決事項

- R001〜R007 の annex / engine-bridge の正確な文面は code-generation ステージで確定する。本ステージで確定しているのは規則の趣旨と配置である。
- mode 選択 4 択を Codex の「選択肢 2〜3 個 + custom」制約へ畳む具体案（3 択 + custom へ畳む / 質問を分割する）は functional-design ステージで確定する。
- R008 で追加する assert の具体的な marker 文字列は、annex 文面の確定に合わせて code-generation ステージで確定する。

## Review

**Verdict: READY**（2 回目。1 回目は NOT-READY: R001 の「併記を許す」が Q1 確定回答から後退）

- R001 は「`[Answer]:` の書き戻しは正準ラベル（英語）+ 表示訳の併記とする」へ修正され、Q1 確定回答と語尾まで一致した。対象の具体列挙（mode 選択、gate 承認、ステージ質問の対話提示）も復元され、Issue #448 の受け入れ条件との対応が明示的になった。
- 機能要求 R001〜R009 は Issue #448/#449/#450 のすべての受け入れ条件と Q1〜Q3 の確定回答に出典が張られており、オーファンはない。
- スコープ外セクションが「エンジン ask directive の拡張」「Grill me の既定昇格」「他 harness annex」「presence フックの worktree 追従問題」を明示除外しており、refactor scope・最小深度の規律が保たれている。
- 制約・前提が upstream parity、Skill Language Policy、promote-skill.ts 経由昇格と矛盾しない。N003 は「英語で書かれた指示が実行時に会話言語表示を命じる」構造を明示し、言語方針との緊張を先回りで解消している。
