# Domain Entities — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): component-methods.md(C2 変更点)、services.md(入口3系統)、requirements.md(FR-2)、components.md(C2 境界)、unit-of-work.md(U1)、unit-of-work-story-map.md(アクター)

## エンティティ(U1 は新規ドメイン型を導入しない)

| 概念 | 表現 | 備考 |
|---|---|---|
| 委譲対象 verb 列 | `readonly string[]`(rest そのまま) | パースしない — parse は plugin CLI の専管(parse-don't-validate は所有側1箇所で) |
| 委譲コマンド | `["bun", <TOOLS_DIR>/amadeus-plugin.ts, ...rest]` の配列 | argument array のみ(シェル文字列組立て禁止 — gh-scripts-boundary と同旨) |
| 委譲結果 | spawn の exitCode + 透過済み stdout/stderr | utility 側で再解釈しない |
| `PluginDelegateDeps` | `{ spawn: (cmd: readonly string[]) => number }`(既定実装 = Bun.spawnSync ラッパー、stdout/stderr "inherit" 透過) | C2 確約の注入 seam。既習同型 = `PluginCliDeps.recompile`(amadeus-plugin.ts:169/:276) |

## 既存エンティティとの関係

- `PluginCliCommand` / `PluginCliResult`(amadeus-plugin.ts:71-75 / :87-94)は**参照のみ** — U1 は import しない(spawn 境界の向こう側)
- TOOLS_DIR 解決は amadeus-utility.ts の既存定数を再利用(handleMigrate と同一)

## 不変条件

- utility 側は plugin CLI の出力・exit code に対して恒等写像(検証・変換・抑制のいずれもしない)
- spawn は同一ハーネスディレクトリ内の amadeus-plugin.ts のみを対象とする(パスは TOOLS_DIR 由来固定 — 外部入力からのパス合成なし)
