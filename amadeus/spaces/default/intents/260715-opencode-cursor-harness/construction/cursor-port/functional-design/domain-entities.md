# Domain Entities — U3 cursor-port

intent: `260715-opencode-cursor-harness` / Unit: U3
上流入力: application-design の component-methods.md(C2 emit 構成)、requirements.md(AC-3c/3d)、unit-of-work.md / unit-of-work-story-map.md(視点2)、components.md(C2 写像表)。

## エンティティ

U1 と同じく既存型宇宙(`HarnessManifest`/`EmitContext`/`EmitResult`)に載り、新規に必要なのはアダプタ内部の2型のみ(parse-don't-validate 適用面):

| エンティティ | 型 | 不変条件 |
| --- | --- | --- |
| cursor manifest | `HarnessManifest`(既存型) | name="cursor" / harnessDir=".cursor" / authoredExempt=[/^hooks\/amadeus-cursor-[^/]+\.ts$/] / skipRunnerGen=true |
| CursorHookEnvelope | アダプタ内 type(判別: hook_event_name)— stdin JSON を parse して**検証済みであることを型で運ぶ**(parse 関数 `parseCursorEnvelope(raw): CursorHookEnvelope \| null`、null = 非ゼロ exit) | hook_event_name / workspace_roots は必須。tool 系イベントは tool_name を持つ |
| ToolNameMap | `Readonly<Record<string, string>>`(モジュールスコープ定数 — Bolt 3 冒頭の実測で確定) | 写像表にないキーは変換せず非ゼロ exit(無音の素通し禁止 — R-U3-6) |
| emission table | U1 と同一様式 | write⇔check の単一ソース |

## 状態遷移

なし(アダプタはステートレスな1回変換。dedupe 等の状態が実測で必要と判明した場合は codex アダプタの D-4 様式を参照するが、必要になるまで導入しない — YAGNI、逸脱時は実装前停止)。

## frontend-components.md の不作成(CONDITIONAL 判定)

U3 も UI を含まない(CLI/hook/配布のみ)— U1 と同一判定(services.md に UI 面なし、ui-less-mockups 既決整合)。
