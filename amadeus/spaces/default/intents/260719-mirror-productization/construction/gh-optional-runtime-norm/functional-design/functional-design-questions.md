# Functional Design Questions — gh-optional-runtime-norm

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## 質問不要の根拠

質問は0問とする。U1の唯一の責務は、`gh`をoptional runtime dependencyとして許容し、不在・未認証時はmirror capabilityだけをloud fault、workflowは継続可能、credentialは`gh`へ委譲、norm変更は独立PRと人間承認、というFR-23/C-05/NFR-06の既決contractを規則へ写像することである。新しいruntime behavior、API、data model、UI、retry policyを選ぶ余地はない。

## 裁定の記録

[Answer]: 質問0問で可。E-MPRU1FD1、ユーザーは`2026-07-23T10:48:06Z`のHUMAN_TURNでB1 Functional Design開始の推奨案を選択した。既決contractからの機械導出に限定し、scope変更が必要なら生成前に停止する。
