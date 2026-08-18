# Requirements Analysis — Clarifying Questions

Intent: 260818-priority-bug-batch-4(#2837 + #3106、depth Minimal)

> リーダー承認(ユーザー直接裁定): 2026-08-18T08:03:26Z — Q1 の [Answer] B は本セッションの実 HUMAN_TURN(AskUserQuestion への直接回答)で確定(E-OC1)。Intent Autonomy Mode = none につき梯子は使用せず、全裁定をユーザーへ直接提示した。

質問は「矛盾または実装を阻む要件欠落」に限定した(cid:requirements-analysis:c5)。両 Issue はクロスレビュー2名成立済みで、機序・受け入れ条件・修正面は issue-evidence.md に確立済みのため、再質問しない。

## Q1: #2837 クロスレビューが特定した「同根 A」(死んだ SKILL.md 手順参照)をスコープに含めるか

reviewer-1 の同根分析: `amadeus-bolt.ts:439` は "SKILL.md Step 6.5's git-merge dispatch" を、`amadeus-state.ts:6119` は "SKILL.md Step 0.6 recovery seam" を参照するが、conductor 面に該当手順は現存しない(grep 0 件)。C7/C11/C12 と同じ根(conductor 面から手順が失われツール側の前提だけが残存)であり「まとめて扱える」と提案されている。ただし #2837 の完了条件(directive の実行コンテキスト欠落の解消)には含まれない。

- A. スコープ外とし、別 Issue として起票する(本 intent は #2837 の完了条件に外科的に閉じる)
- B. #2837 unit に同梱して修正する(同根をまとめて閉じる)
- C. スコープ外とし、起票もしない(記録のみ)
- X. Other (please specify)

[Answer]: B(ユーザー裁定 2026-08-18、AskUserQuestion 経由 — 実 HUMAN_TURN。同根 A の死んだ参照 2 箇所を #2837 unit に同梱して閉じる。実体は両方ともコード内コメントの stale 参照であり挙動不変の文書面修正: amadeus-bolt.ts:435-441 の「SKILL.md Step 6.5's git-merge dispatch」、amadeus-state.ts:6117-6121 の「SKILL.md Step 0.6 recovery seam」— 本 RA が実読で確認)
