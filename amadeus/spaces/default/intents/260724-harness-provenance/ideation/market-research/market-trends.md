# Market Trends — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md

## N/A 判定(外部市場トレンド)

intent-statement.md の Initiative Trigger が示すとおり、本 intent のトリガーは外部市場圧力・規制動向ではなく、技術負債/運用ギャップ(実行ハーネスの多様化に伴う記録欠落)である。market-research-questions.md Q3 の回答どおり、外部業界トレンドは本 intent の根拠に含まれない。

## 内部運用トレンド(参考、外部市場トレンドの代替ではない)

- Amadeus プロジェクトは 2026-07 時点で claude-code / codex / cursor / opencode / kiro の複数 AI ハーネスを並行運用しており(`.claude/`、`.codex/`、`.cursor/`、`.opencode/`、`dist/kiro*/` の配布ツリーが実在)、この多様化自体が記録欠落を顕在化させた運用上のコンテキストである
- team.md の学習記録(§13)には「Codex native subagent」等の断片的言及が既に存在するが(例: `cid:feasibility:c1-2`)、構造化フィールドではなく grep での機械参照ができない

代わりに使う内部証拠: リポジトリの `.claude/`・`.codex/`・`.cursor/`・`.opencode/`・`dist/` ディレクトリ構成、team.md 該当 cid。
