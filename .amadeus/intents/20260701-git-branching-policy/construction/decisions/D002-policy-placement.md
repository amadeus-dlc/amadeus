# D002: Git ブランチ戦略 policy の配置

## 状態

active

## 文脈

R001 は、Git ブランチ戦略を steering policy として採用し、概要と個別 policy の配置を説明できることを求めている。

## 判断

`.amadeus/steering/policies.md` に概要と導線を置く。

`.amadeus/steering/policies/git-branching.md` に具体ルールを置く。

`.amadeus/steering/policies/README.md` は、詳細 policy が登録済みであることだけを同期する。

## 影響

AGENTS.md は操作指示の管理元として残す。

Git ブランチ戦略 policy は Intent 成果物から参照する長期方針として扱う。

## 根拠

- [R001](../../inception/requirements/R001-policy-placement.md)
- [R003](../../inception/requirements/R003-agents-policy-responsibility.md)
- [B001](../../inception/bolts/B001-policy-placement.md)
