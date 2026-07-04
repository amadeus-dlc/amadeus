# Domain Entities — 質問レンダリング UX の構成要素

上流要求は `../../../inception/requirements-analysis/requirements.md`（R001〜R009、N001〜N004）である。
本書は質問レンダリング契約を構成するエンティティと、変更対象ファイルの正準一覧を定義する。

## エンティティ

| エンティティ | 属性 | 役割 |
|---|---|---|
| StructuredQuestionSpec | `prompt`、`header`、`multiSelect`、`options[].label`、`options[].description` | stage-protocol / stage ファイルが持つ harness 中立の質問仕様（` ```question ` フェンス）。英語で書かれ、変更しない |
| CanonicalLabel | 英語の option label（例: `Guide me`、`Approve`） | 機械可読の記録と判定（mode 分岐、`[Answer]:` 書き戻し、audit、エンジン report）の正準値。wiring 検査の assert 対象 |
| DisplayText | 会話言語へ訳した prompt / label / description | ユーザー向け表示専用。記録には使わない（R001） |
| CanonicalAnnex | `skills/amadeus/references/question-rendering.md` | stage-protocol が名指しする正準 annex。harness 中立節（表示言語、Grill me レンダリング）+ Claude Code 束縛 + harness routing 行を持つ（設計 Q2 回答 A） |
| CodexAnnex | `skills/amadeus/references/question-rendering-codex.md`（新設） | Codex 固有差分（`request_user_input` 束縛、バッチ上限、4 択の畳み方、フォールバック書式）+ 中立節への参照（R003、R004） |
| HarnessBinding | 束縛先ツール名、バッチ上限、組み込み自由記述経路 | Claude Code: AskUserQuestion（4 問 × 4 択、Other 組み込み）。Codex: request_user_input（1〜3 問 × 2〜3 択 + custom） |
| FallbackTextFormat | 1 問ずつの番号付き提示書式、`[Answer]:` 記入案内 | 構造化ツールが使えない環境の契約（R004）。exact label 記録を担保する |
| EngineBridge | `skills/amadeus-grilling/references/engine-bridge.md` | Grill me 選択後の手順（decision/answer 記録、`[Answer]:` 書き戻し）。表示言語文言を R001 と整合させる（R002） |
| WiringCheck | `dev-scripts/grilling-wiring.ts` | annex 群の存在、正準 label、中立節、Codex annex、昇格同期を assert する決定論的検査（R008） |

## 変更対象ファイル（正準一覧）

| # | ファイル | 変更種別 | 要求 |
|---|---|---|---|
| 1 | `skills/amadeus/references/question-rendering.md` | 中立節（Display language、Grill me rendering）+ harness routing 行の追加 | R001、R005、R006 |
| 2 | `skills/amadeus/references/question-rendering-codex.md` | 新設 | R003、R004、R007 |
| 3 | `skills/amadeus-grilling/references/engine-bridge.md` | 表示言語文言の一般化（Japanese 固定 → 会話言語 + 正準ラベル記録） | R002 |
| 4 | `dev-scripts/grilling-wiring.ts` | 検査の拡張（RED → GREEN） | R008 |
| 5 | `dev-scripts/evals/grilling-wiring/check.ts` | eval fixture の拡張。最小 fixture（`annexText` / `bridgeText`）へ新 assert が要求する内容（中立節、Codex annex、会話言語文言）を追加し、新 assert の欠落 fixture が fail する negative ケースを加える。前例: Intent 260704-grilling-mode-wiring の code-summary.md（検査拡張と fixture 更新は同一 PR） | R008 |
| 6 | `.agents/skills/amadeus/references/`、`.agents/skills/amadeus-grilling/references/` | promote-skill.ts --replace による昇格同期 | R009 |

上記以外（`amadeus-common/` 上流ファイル、エンジン `.agents/amadeus/tools/`、stage skill の SKILL.md）は変更しない。
conductor SKILL.md（`skills/amadeus/SKILL.md`）も変更しない。harness routing は CanonicalAnnex 内の routing 行が担い、stage-protocol の「annex = question-rendering.md」という名指しを保つ。

## 関係

- StructuredQuestionSpec は変更されない。CanonicalAnnex / CodexAnnex が spec → HarnessBinding のマッピングを持つ。
- CanonicalAnnex の中立節は CodexAnnex から参照される（複製しない。設計 Q2 回答 A）。
- CanonicalLabel は StructuredQuestionSpec・questions ファイル・audit 記録の間で不変。DisplayText は表示層だけに現れる。
- WiringCheck は CanonicalAnnex・CodexAnnex・EngineBridge・昇格先の 4 者を検査する。
