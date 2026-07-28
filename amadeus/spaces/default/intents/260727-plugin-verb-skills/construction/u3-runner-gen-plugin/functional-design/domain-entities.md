# Domain Entities — U3 u3-runner-gen-plugin

上流入力(consumes 全数): component-methods.md(C4)、components.md(C4)、requirements.md(FR-4)、services.md、unit-of-work.md(U3)、unit-of-work-story-map.md

## 型拡張

| エンティティ | 形 | 備考 |
|---|---|---|
| `GraphStage` へ追加 | `plugin_source?: true`(optional・plugin 由来ノードのみ焼かれる。正確な名称は既存 graph フィールド命名様式へ実装時に揃え申告) | compile が唯一の書き手。stock ノードには現れない(バイト不変性 = FR-4c) |
| runner 生成対象の判定 | `isRunnableStage`(phase !== "initialization")— **変更なし** | plugin ノードも runnable。識別フィールドは生成対象の絞り込みでなく「repo 側 check の文脈情報・fixture 検証」用途(生成は全 runnable 一律) |
| 配線 spawn | `["bun", <THIS_DIR>/amadeus-runner-gen.ts, "write"]` | spawnRecompile(:253-263)と同型の spawnSync。失敗 = false → failure |

## 不変条件

- graph の schema 変更は additive(optional フィールド追加のみ)— 既存消費者(runner-gen 以外の graph 読者)に non-breaking。実装時に graph 消費者を grep で全数棚卸しする(enumeration-reverify-at-implementation)
- runner dir の生成・除去は runner-gen のみが行う(plugin CLI は spawn するだけで skills/ に直接書かない)
- 生成 runner は stock runner と同一テンプレート・同一マーカー(`--stage`/`--single`)を持ち、drift check の集合等価判定に自然に参加する
