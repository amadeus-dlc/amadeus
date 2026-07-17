# Domain Entities — U2 opencode-surface

intent: `260715-opencode-cursor-harness` / Unit: U2
上流入力: application-design の component-methods.md(C1)、requirements.md(FR-1)、unit-of-work.md / unit-of-work-story-map.md(視点1)、components.md(C1)。

## エンティティ

新規型なし — U1 の emission table(`ReadonlyArray<{dst, content}>`)にエントリを追加するのみ。設定例(opencode.json.example)は文字列リテラルとして emit 内で合成し、パーサ・スキーマ型は導入しない(消費者は opencode 本体であり、本 repo 側の検証は JSON.parse 可能性の単体テストのみ — 過剰ラップ回避)。

| エンティティ | 型 | 不変条件 |
| --- | --- | --- |
| emission table(拡張) | U1 と同一 | dst の重複なし(check モードの照合対象が一意) |
| AGENTS.md content | string(トークン置換対象) | 未置換トークン残存なし(R-U2-3) |
| opencode.json.example content | string | JSON.parse 可能(R-U2-2) |

## 状態遷移

なし(U1 と同一 — ビルドは純生成)。

## frontend-components.md の不作成(CONDITIONAL 判定)

U2 も UI を含まない — U1/U3 と同一判定(services.md に UI 面なし)。
