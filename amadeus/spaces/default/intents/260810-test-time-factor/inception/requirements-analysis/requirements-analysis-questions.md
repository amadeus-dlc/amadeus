# Requirements Analysis 質問

leader 承認 2026-08-10T14:41:11Z（User input: Confirm）

## 根拠

- `business-overview.md`: CI 能力差と固定 timeout の問題を入力とした。
- `architecture.md`: workflow、係数 resolver、runner、test wait の境界を入力とした。
- `code-structure.md`: runner、TUI/IDE driver、CI workflow の配置を入力とした。

## Q1. CI の既定 `TEST_TIME_FACTOR` はいくつにしますか？

A. `2`（通常の CI 向け、推奨）  
B. `3`（より低速な CI 向け）  
X. Other (please specify)

[Answer]: A — `2`（User input: すべて推奨で / 2026-08-10T14:40:33Z / Mode: guided）

## Q2. 係数を適用する timeout の範囲はどれですか？

A. テスト用 timeout の基準値全体と、それを構成・検証する `sleep`/poll/settle に適用する（推奨）  
B. runner の既定 timeout と `sleep`/poll/settle のみに適用し、明示 timeout override は最終値とする  
C. 既知の flake 箇所だけに適用する  
X. Other (please specify)

[Answer]: A — テスト用 timeout の基準値全体と、それを構成・検証する `sleep`/poll/settle に適用する（User input: すべて推奨で / 2026-08-10T14:40:33Z / Mode: guided）
