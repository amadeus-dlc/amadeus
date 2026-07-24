# Tech Stack Decisions — U2 plugin-skeleton

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 選択

| 領域 | 技術 | 根拠 |
|---|---|---|
| Discovery | Bun/TypeScript + `node:fs` | 既存graph compilerと一致 |
| Manifest | JSON + Markdown frontmatter | 既存plugin/stage schemaを再利用 |
| Lifecycle | plugin-composition既存engine | lock/journal/drop契約を再利用 |
| Test | bun:test + 実FS E2E | lifecycleの実配線を検証 |

## 制約

- plugin-composition/projectionを変更せず、walk拡張はamadeus-graphへ限定する。
- 6 harness packagingとself-installを再生成・drift-checkする。

## 代替案

- filesystem walk対index: 現行規模ではwalkが単純でdrop後の陳腐indexを持たないため採用。10秒/1,000 stage閾値を超えた場合だけindexを再評価する。
- 既存JSON/frontmatter対専用schema: compose・graph validatorを再利用できるため既存形式を採用し、二重schemaとmigrationを避ける。
