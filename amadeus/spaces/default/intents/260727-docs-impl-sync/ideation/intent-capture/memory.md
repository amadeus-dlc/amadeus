<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T06:29:01Z — Q5 で A,B,C,D 全選択の回答を「全読者均等(優先順位なし)」と解釈; D が A-C を包含するため
- 2026-07-27T06:29:01Z — 対象範囲を README*.md + docs/ に限定し、amadeus/ workspace 文書と .claude/ 内部文書は対象外(発見時は Issue 起票のみ)と解釈; intent 記述の対象列挙に一致

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-27T06:29:01Z — 質問ファイル初版に conductor が推奨回答を先記入してしまい、提示前に自己捕捉して空欄へ是正(election-answer-after-ruling 違反のヒヤリハット); 以後ユーザー回答のみ記入

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-27T06:29:01Z — 乖離検出は差分駆動(安価)でなく全域 HEAD 照合(網羅)をユーザーが選択(Q6=A); git log 差分は優先順位付けへ降格。監査コストは増えるが「それ以前からの乖離」の取りこぼしを構造的に消す

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-27T06:29:01Z — 全域監査で乖離件数が想定を大きく超えた場合の PR 分割単位(文書ディレクトリ別か、乖離クラス別か)は delivery 段階(RA/FD)で確定する
