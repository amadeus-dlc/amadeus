# Feasibility Memory

## Interpretations

- 2026-07-04T00:55:32Z — 前ステージの「全部推奨選択して」は intent-capture 限定の許可として扱い、feasibility には持ち越さない。Amadeus protocol の autonomy prohibition に従い、このステージの質問は空欄から開始する。
- 2026-07-04T01:05:53Z — `skills/` は配布物境界として扱う。実装時は source skill、昇格先 skill、host harness、Intent 成果物の境界を分け、`skills/` への直接変更を安易な主経路にしない。

## Deviations

- 2026-07-04T00:55:32Z — stage_file は `.claude/aidlc-common/stages/ideation/feasibility.md` を正として扱った。`.claude` は `.agents/aidlc` への harness 配置であり、実行 directive が `.claude` を指すためである。

## Tradeoffs

- 2026-07-04T00:55:32Z — Comprehensive depth だが、質問数は 10 問にした。対象 Issue と Intent Capture で文脈が具体化しており、Feasibility では未知情報よりも制約判断に集中する方が有効である。
- 2026-07-04T01:03:06Z — OpenTelemetry は分析価値があるが、現 Intent の主軸である deterministic な audit と doctor 証跡とは性質が異なる。外部 collector、依存追加、テスト安定性、trace data の扱いが追加制約になるため、scope に入れるかは追加質問で確認する。

## Open questions

- 2026-07-04T00:55:32Z — parity lock 対象の扱い、subagent hook payload の信頼性、conductor 逸脱検出の初期範囲は、回答後に contradiction analysis で確認する。
- 2026-07-04T01:03:06Z — OpenTelemetry を現 Intent の must-have、設計検討、後続 opportunity のどれとして扱うかを確認する。
