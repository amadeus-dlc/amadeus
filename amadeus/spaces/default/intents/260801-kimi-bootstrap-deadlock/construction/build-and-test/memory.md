# Build and Test — memory.md

## Interpretations

- 2026-08-01T13:30:00Z — Minimal 戦略のため新規テスト指示は unit のみ本体とし、integration/performance/security は「既存スイートでカバーされる根拠」を記す形式に留めた。ステージ規定のソフトガイドラインどおり。

## Deviations

- 2026-08-01T13:30:00Z — ステージ散文の Step 10「失敗時は自身で修復」は conductor の指示(本変更関連の失敗時は修復せず STOP して報告)を優先。

## Tradeoffs

- 2026-08-01T13:30:00Z — perf/security の新規ベンチマーク・SAST 追加は見送り。hook 順序修正に対して既存 pin(t10)+ full runner で十分であり、発明的な追加は Minimal 戦略に反する。

## Open questions

- なし。
