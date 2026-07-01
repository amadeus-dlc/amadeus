# R001: policy 配置

## 要求

- Git ブランチ戦略を Amadeus の steering policy として扱う。
- 概要は `.amadeus/steering/policies.md` に置き、具体ルールは `.amadeus/steering/policies/git-branching.md` に置く。

## 受け入れ条件

- `.amadeus/steering/policies.md` から Git ブランチ戦略の存在と個別 policy への導線を読める。
- `.amadeus/steering/policies/git-branching.md` が具体ルールの配置先として説明されている。
- GitHub branch protection 設定、CI workflow、merge 自動化、既存 PR の branch 整理を対象外として読める。

## 根拠

- [Issue #254](https://github.com/amadeus-dlc/amadeus/issues/254)
- [scope.md](../ideation/scope.md)
- [codebase-analysis.md](../codebase-analysis.md)

## 未確認事項

- なし。
