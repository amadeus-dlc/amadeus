# Functional Design — 質問

Intent: 260704-question-rendering-ux / unit: implicit

requirements の未解決事項のうち、設計判断が必要なのは次の 2 問である。
（annex / engine-bridge の正確な文面と wiring 検査の marker 文字列は code-generation で確定する）

## Q1. mode 選択 4 択の Codex への畳み方（R003、requirements 未解決事項）

`request_user_input` は 1 問あたり選択肢 2〜3 個 + custom option（自由記述）である。
mode 選択（Guide me / Grill me / I'll edit the file / Chat）の 4 択をどう畳むか。

A. **3 択 + custom へ畳む**。options に Guide me / Grill me / I'll edit the file の 3 個を載せ、Chat は custom option（自由記述）経由で選べることを質問本文に明記する（例: "Type Chat to discuss freely"）。1 呼び出しで完結し、既定（Guide me 先頭）も保たれる
B. **2 呼び出しに分割する**。1 問目で大分類（対話で答える / ファイルで答える / 議論する）、2 問目で詳細を選ぶ。呼び出しが増え、既存 4 択との対応が崩れる
X. Other (please specify)

[Answer]: A — 3 択 + custom へ畳む。options に Guide me / Grill me / I'll edit the file を載せ、Chat は custom option 経由で選べることを質問本文に明記する

## Q2. harness 中立規則（表示言語 R001、Grill me R005）の配置

表示言語規則と Grill me レンダリング規則は両 harness annex に共通する。どこに置くか。

A. **既存 annex（`question-rendering.md`）に中立節として書き、Codex annex から参照する**。既存 annex は「Claude Code harness annex」だが、stage-protocol が名指しする正準ファイル名でもあるため、中立規則の置き場として自然。Codex annex は「Shared rules: see `question-rendering.md` § Display language / § Grill me rendering」の参照 + Codex 固有の差分（束縛先ツール、バッチ上限、フォールバック）だけを書く。単一の真実の記録が保たれ、wiring 検査は既存 annex の中立節と Codex annex の参照行を assert する
B. **両 annex に中立節を複製し、wiring 検査で同一性を assert する**。各 annex が自己完結するが、二重メンテになる
C. **第 3 のファイル（`question-rendering-common.md`）を新設して両 annex から参照する**。ファイルが 3 個になり、stage-protocol の「annex = question-rendering.md」という名指しから遠ざかる
X. Other (please specify)

[Answer]: A — 既存 annex（`question-rendering.md`）に中立節を書き、Codex annex から参照する
