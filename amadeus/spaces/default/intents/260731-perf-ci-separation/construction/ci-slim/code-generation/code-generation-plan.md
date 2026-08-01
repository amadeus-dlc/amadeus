# Code Generation Plan — U3 ci-slim

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md(U3 FD)

## 実行計画

1. ci.yml から 3 job を削除(business-logic-model.md ロジック1、削除のみ — BR-U3-1)
2. FR-3d 対照(V-1〜V-6)と AC-3 grep(正対照→0)の機械照合(ロジック2)
3. ci.yml を pin する既存テストの赤は実装前停止で裁定を仰ぐ(逸脱プロトコル)
4. PR CI green が最終検証

## 実行形態

swarm(batch 3)worktree 分離、builder subagent 1名、branch bolt-ci-slim。
