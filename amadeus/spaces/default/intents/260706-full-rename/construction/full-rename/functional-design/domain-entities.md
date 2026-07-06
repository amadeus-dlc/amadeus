# Domain Entities — full-rename

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 対象面の分類表（c50a0fe5 時点の実測。実装時に fresh 再走査）

| 面 | 実測 | 主要な所在 |
|---|---|---|
| エンジン tools | 20 ファイル | amadeus-lib.ts（workspace root 定数 L358 / L1644 ほか resolver 群）、state/utility/orchestrate/learnings ほか |
| hooks | 9 ファイル | session/stop/mint/sensor-fire/runtime-compile |
| sensors | 4 manifest | 出力 path 記述（aidlc-docs 旧表記の残存含む） |
| skills（source + 昇格先） | 59 + 54 | SKILL prose の /aidlc 表記、path 例示 |
| dev-scripts | 33 | parity-check、promote、kanban、evals（engine-e2e / installer / rename-leftovers / linter-sensor 等の fixture path） |
| docs・README | 31 | AMADEUS.md、README、docs/amadeus/（.md/.ja.md 対） |
| 設定 | .gitignore（5 行）、.claude/settings.json（hooks 配線）、CLAUDE.md 参照 | |
| 検査データ | dev-scripts/data/parity-map.json（nameMappings 107+）、rename-leftovers/allowlist.json（22 entries）、parity eval C10 pin | |
| 実体 | aidlc/（spaces/default = memory 7 + knowledge + codekb + intents 36 record）、各 record の aidlc-state.md・.aidlc-sensors/ | |

## 写像エンティティ

nameMappings 追加 4 系統（business-rules.md の表）。既存の `"aidlc-"` cli-token（引用符付き）や `state` cli-token（.md ガード）との相互作用は、追加前に単体で回帰確認する（parity eval C 系に検査を追加）。
