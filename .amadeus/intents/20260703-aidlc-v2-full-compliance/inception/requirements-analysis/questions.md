# Questions：Requirements Analysis

| # | 確認したいこと | 推奨回答 | 回答 |
|---|---|---|---|
| 1 | v2 規定の機械可読・構造的成果物（aidlc-state.md、intents.json、audit/、memory.md の構造）の言語と構造をどうするか | v2 の構造・英語ラベルのまま（記述系成果物は日本語維持） | v2 の構造・英語ラベルのまま |
| 2 | 自己開発 workspace の Space 名をどうするか | `default`（v2 の自動生成既定に従う） | `default` |
| 3 | 旧 `.amadeus/` と既存 record（この Intent 自身）の移行をどうするか | 完全移行（steering → memory/、knowledge/codebase → codekb/、record は `aidlc/spaces/default/intents/260703-aidlc-v2-full-compliance/` へ YYMMDD 化して移設。旧 `.amadeus/` は削除し git 履歴に残す） | 完全移行（`.amadeus` 削除） |
