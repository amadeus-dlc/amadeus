# External Dependency Map — 260814-plugins-rename-drift

上流入力: `bolt-plan.md`、`requirements-analysis/requirements.md`。

## ゲート付き外部依存

本 intent は AI 完結(コード・テスト・docs・config が全て monorepo 内)であり、外部チーム・外部 API 承認・データ可用性ウィンドウの類のゲート付き依存は**なし**。

## 軽量な運用依存(ゲートではない)

| 依存 | 消費 Bolt | 失敗時の扱い |
|---|---|---|
| GitHub(PR・CI・merge queue) | 全 Bolt | 一時障害は retry。マージは人間承認が前提のため lead time は人間の応答時間 |
| gh CLI 認証 | 全 Bolt(PR 操作) | optional dependency ノルム — 不在・未認証は loud fail |
| git origin への fetch(B3 の落ちる実証でテスト用リポジトリを使用) | B3 | テストはローカル bare リポジトリで完結させ、実ネットワークに依存しない |
