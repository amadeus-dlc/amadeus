# Tech Stack Decisions — U5 completeness-sensor

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 選択

| 領域 | 技術 | 根拠 |
|---|---|---|
| Runtime | Bun 1.3.13 | 既存sensor dispatcherと一致 |
| Language | TypeScript ESM | 判別ユニオンと既存tools規約を再利用 |
| Hash | `node:crypto` SHA-256 | 追加依存なしで決定的 |
| Test | `bun:test` unit/integration | 純関数と実FS fireを分離 |

## 制約

- ModelMap型はU1からimportし、独立再定義しない。
- 外部scanner、DB、daemon、network serviceは導入しない。
