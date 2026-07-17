# Deployment Strategy — Issue #1048

上流入力(consumes 全数): `../ci-pipeline/ci-config.md`、`../ci-pipeline/quality-gates.md`、`../installer-enum-extension/infrastructure-design/deployment-architecture.md`、`../installer-enum-extension/infrastructure-design/cicd-pipeline.md`。

## 戦略(既決の適用)

- リリース単位: release.yml の workflow_dispatch(人間起動)— Blue/Green・カナリアは N/A(デプロイ基盤不保持、トラフィック切替対象なし)
- 検証: マージ前 CI 全ゲート(quality-gates.md)が唯一の出荷判定。スモークテスト相当 = tests/run-tests.sh の smoke 層(既存)
- opencode/cursor の install 経路はユーザー側 pull 型(npx amadeus-setup)— push 型デプロイ非該当

## 中断条件

該当なし(push 型デプロイ不在)— 公開後の欠陥は rollback-runbook.md の revert 定型で対処。
