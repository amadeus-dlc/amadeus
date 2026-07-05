# Code Summary — space-inventory

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| # | ファイル | 変更 |
|---|---|---|
| D1 | memory/development.md | 読むべきファイルを intents.json（正準台帳）へ |
| D2 | memory/team.md | 共有成果物の統合を「intents.json の entry union」へ（廃止済み索引の再生成手順を除去） |
| D3/D4 | memory/project.md | Intent 例を実在 record へ、Unit 命名を小文字 `unnn-<slug>`（PR #483 の slug 正規化と一致）へ |
| D5 | memory/phases/{ideation,inception,operation}.md | construction.md と同型の phase 防護規定を新設（欠落解消。operation は「default space 対象外」の適用範囲注記付き） |
| D6 | codekb/amadeus/ 4 ファイル + timestamp.md | 廃止機構（intents.md 索引、IndexGenerate.ts）の記述を現行事実へ補正し、部分補正の履歴を追記 |

## 検証の記録

- grep: 修正後、memory / codekb / rules に廃止参照の残存なし。
- parity:check ok（上流適応ファイルは非編集）、`npm run test:all` exit 0。
- stage-graph.json の再生成は #494 へ委ねる（新設 phase ファイルは #494 merge 後の compile で rules_in_context へ載る）。
