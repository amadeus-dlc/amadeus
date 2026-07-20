# Performance Requirements — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、technology-stack.md(brownfield 条件付き consumes — codekb) — 性能要求は business-logic-model.md の受理フロー(1入力1 parse)と business-rules.md BR-1 の regex 形から導出し、実行基盤は technology-stack.md の Bun/TypeScript 前提、上限根拠は requirements.md の対象データ規模(NFR-3 の store 全数)に依拠。

## 要求

| # | 要求 | 根拠 |
| --- | --- | --- |
| P-1 | parseChoiceResolution は O(入力長) — regex `/^choice:(0|[1-9][0-9]*)$/` は nested quantifier なし・アンカー付きの線形形。regex-linearity-untrusted-input の適用判定: --resolution は leader/ユーザーの CLI 引数(固定様式の短トークン照合に近い信頼側入力)であり 100KB 級実測の義務化対象外 — ただし形状が線形であることを設計時確認済み(本行がその記録) | BR-1、team.md regex-linearity cid |
| P-2 | choices 実在照合は O(choices 数) の some — 実選挙の choices は 2〜4件(store 実測)で上限問題なし。性能テストは追加しない(強制メカニズム不在の数値目標を発明しない — constants-from-code) | BR-1、NFR 系ノルム |
| P-3 | render/trail の追加コストは既存 map 1回の範囲内(生成式無変更) | business-logic-model.md render フロー |
