# 事業概要：amadeus

## 目的

Amadeus DLC は、AI-DLC v2（上流 awslabs/aidlc-workflows、基準 commit fde1e1af）を適応した開発ライフサイクル基盤である。
このリポジトリは Amadeus 本体の自己開発 workspace を兼ね、`amadeus/spaces/default/` に自身の Intent record を蓄積する。

## 中核の運用モデル

- ライフサイクルの公開入口は `amadeus` skill の 1 個で、実行はエンジン駆動（`amadeus-orchestrate.ts` の next / report forwarding loop）である。
- Intent の正準台帳は `intents/intents.json`、進行台帳は各 record の `amadeus-state.md` と `audit/`（追記型）である。
- 開発は GitHub Issue 起点、PR 単位は phase / Bolt、merge は人間が行う。
- 自己開発用途に加え、`scripts/amadeus-install.ts`（`npm run amadeus:install`）により、エンジンと skill を外部 workspace へ配布インストールできる（#451）。
