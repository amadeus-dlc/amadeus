# Business Rules — 質問レンダリング UX の規則

上流要求は `../../../inception/requirements-analysis/requirements.md`（R001〜R009、N001〜N004）である。

## 表示言語規則（R001、R002）

- structured question（mode 選択、gate 承認、ステージ質問の対話提示）のユーザー向け表示（prompt、options の label と description）は、そのときの**会話言語**で提示する。
- 機械可読の記録と判定（mode 分岐、`[Answer]:` 書き戻し、audit の decision / answer、エンジンへの report の `--user-input`）は**正準の英語 label** を維持する。
- `[Answer]:` の書き戻しは「正準ラベル（英語）+ 表示訳」の併記とする（MUST）。
- 質問ファイル・spec ブロック・annex 本文は英語のまま維持する（Skill Language Policy、N003）。表示言語規則は「英語で書かれた指示が、実行時に会話言語での表示を命じる」構造で書く。
- engine-bridge の「User-facing question text is Japanese」は「会話言語に従う（正準 annex の Display language 節を参照）」へ一般化する。questions ファイルの構造・見出し・タグ（`[Answer]:` を含む）は上流書式のまま維持する。

## Grill me レンダリング規則（harness 中立、R005）

- 1 回のツール呼び出しに 1 問だけを載せる（逐次適応性を呼び出し単位で保つ）。
- 推奨回答は先頭 option に置き、label 末尾に会話言語の推奨マーク（日本語会話なら「（推奨）」）を付ける。
- 推奨の根拠と「なぜ今この決定が要るか」は、質問本文またはツール呼び出し直前の地の文に書く。option の description は短い補足に使う。
- 質問ファイルの選択肢が harness 上限を超える場合は、既存の分割規則（先頭グループの後に残りを続ける）を流用する。
- 「もう少し議論したい」と自由記述は、harness 組み込みの経路（Claude Code: Other、Codex: custom option）を受け皿にする。
- decision / answer の audit 記録と `[Answer]:` 書き戻しは現行の engine-bridge 手順のまま変えない。

## Codex 束縛規則（R003、R004、R007）

- 束縛先ツールは `request_user_input`。1 回の呼び出しで 1〜3 問、各問 2〜3 選択肢 + custom option。
- mode 選択（4 択）は **3 択 + custom** へ畳む。options に Guide me / Grill me / I'll edit the file を載せ、Chat は custom 経由で選べることを質問本文に明記する（設計 Q1 回答 A）。
- Grill me は 1 呼び出し 1 問とし、custom option を「もう少し議論したい」と自由記述の受け皿にする。
- `request_user_input` は `config.toml` `[tools] experimental_request_user_input` の opt-in が必要（既定 off）で、`codex exec` では使えない。使えない環境ではフォールバック書式に従う。
- フォールバック書式: 1 メッセージに 1 問だけ、A/B/C… の番号付き選択肢、推奨マーク、回答方法の案内（選択肢の記号または exact label で返答）を含める。回答は正準 label で記録する。

## 不変条件（N001〜N004）

- Guide me / I'll edit the file / Chat、gate 承認、Claude Code の既存 AskUserQuestion 束縛の挙動を変えない（変更は表示言語の追加指示と Grill me レンダリング規則の追加だけ）。
- 上流共通ファイルに差分を作らない。`npm run parity:check` が pass し、`engineFileExceptions` は空のまま。
- wiring 検査は決定論的で、LLM を呼ばない。
- 正準 label の並び順（Guide me / Grill me / I'll edit the file / Chat）は既存 wiring 検査の order assert を維持する。

## 検証規則

- dev-scripts の変更は RED → GREEN の順で進める。検査の拡張を先に入れ、annex 変更前に fail することを確認する。
- 昇格は `dev-scripts/promote-skill.ts --replace` で行い、`npm run test:it:promote-skill` を実行する。
- 完了条件は `npm run test:all`（parity:check、wiring 検査を含む）の pass と AmadeusValidator の pass（受け入れ条件、Issue #448/#449/#450）。
