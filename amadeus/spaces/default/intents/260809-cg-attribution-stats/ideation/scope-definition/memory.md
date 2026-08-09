# Scope Definition Memory

## Interpretations

- 2026-08-09T10:40:00Z — Issue #2695 の `In`、分節・会計規則、出力、完了条件 1〜10 はすべて SETTLED と扱う。ユーザーの明示裁定により、scope-boundary の縮小質問は生成しない。
- 2026-08-09T10:40:00Z — #2700 の既存 stdout 終了経路欠陥は解消済みだが、#2695 の出力追加後に3形式を 65,536 bytes 超で検証する完了条件は本 Intent に残す。

## Deviations

## Tradeoffs

- 2026-08-09T10:45:00Z — semantic model first と risk-first を組み合わせる。出力先行は早く見えるが会計規則との drift を招くため、identity・eligibility・union・恒等式を赤いテストで先に固定し、同じ model から3形式を生成する。
- 2026-08-09T10:45:00Z — 暦日締切は置かず、P2 の優先度と完了条件 1〜10 を品質ゲートとして扱う。期限による検証延期を防ぎ、ユーザーの非縮小裁定を維持する。

## Open questions
