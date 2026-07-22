# Tech Stack Decisions — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, business-logic-model, business-rules, technology-stack — 現行スタックは technology-stack.md(Bun/TypeScript/Biome/tsc)、追加判断は requirements.md NFR-1 と business-rules.md BR 群に依拠。

## 決定

- T-1: 新規依存ゼロ — technology-stack.md の現行構成(Bun 直接実行・node:fs/child_process 相当の Bun API)のみで実装。business-logic-model.md の全フローが既存 API で充足。
- T-2: 配置は scripts/(配布外)— dist/self-install 再生成は不要(requirements.md NFR-1、W-3)。
- T-3: lint/typecheck は既存 CI スコープ(scripts/ は tsc 対象)に乗せ、新設 workflow なし(ci-pipeline:c2 — 既存 workflow が唯一の正本)。

## 非導入(明示)

- 新規パッケージ・ランタイム依存・CI workflow・配布面の追加はいずれも非導入(T-1〜T-3 の帰結。理由なき導入は Forbidden 系に抵触)。
