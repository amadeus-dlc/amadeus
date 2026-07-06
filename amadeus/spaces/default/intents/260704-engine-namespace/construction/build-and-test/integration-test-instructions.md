# Integration Test Instructions — 260704-engine-namespace

Test Strategy が Minimal のため、本 Intent 専用の統合テストは追加しない。
変更範囲（`../implicit/code-generation/code-summary.md` と `../implicit/code-generation/code-generation-plan.md` を参照）は改名と参照更新であり、統合境界は repo 標準検証と実運用で覆われている。

## 既存の統合検証で確認する範囲

```sh
npm run test:all
```

`test:it:engine-e2e`（sandbox e2e）が改名後のエンジン（`.agents/amadeus/{tools,amadeus-common,...}` のコピー）で intent-birth → run-stage directive → 完了拒否 → audit shard 生成の一連を検証する。

## 実運用での確認（実施済み）

本 Intent 自身のワークフローが、改名直後のエンジン（`amadeus-orchestrate.ts` の report / next）で gate commit と stage 遷移を正常に実行できることを確認した（dogfooding）。

## 判断根拠

- 改名は挙動変更を含まず（N002）、エンジンの実行結果検証は engine-e2e が決定論的に担う。
