# Tech Stack Decisions — U3 run-model-check

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 選択

| 領域 | 技術 | 根拠 |
|---|---|---|
| CLI | Bun + TypeScript ESM | 既存formal-verif資産と整合 |
| Local planner | sandbox-exec + Temurin 26 | 既存Darwin経路を維持 |
| CI planner | `eclipse-temurin:26-jdk@sha256:939e35776c4582f5454276c42a9ca3825df1b4a983ed2edd4cd9b4e130bb0eeb` | 2026-07-24にOCI indexを実測したLinux再現面 |
| Model checker | TLA+ 1.7.4 `tla2tools.jar` | 公式URL `https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar`、SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` |

## 非採用

- shell command文字列、image tag参照、network許可、graceful degradeは採用しない。
- plannerごとのnormalize再実装は検証判定を分岐させるため禁止する。
- CIはjarをhost workspaceのcontent-addressed cacheへHTTPS取得・checksum検証してからread-only bind mountし、`--network=none` containerへ渡す。取得失敗・cache driftはspawn前 HARNESS_ERROR とする。
