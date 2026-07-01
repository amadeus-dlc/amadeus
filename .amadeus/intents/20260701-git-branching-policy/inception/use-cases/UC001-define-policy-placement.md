# UC001: policy 配置を定義する

## システム境界

- Agent が Issue #254 と既存 steering を読み、Git ブランチ戦略の概要と個別 policy の配置を整理する。

## 事前条件

- Issue #254 が存在する。
- `.amadeus/steering/policies.md` と `.amadeus/steering/policies/` が存在する。

## 基本フロー

1. Agent は Issue #254 の目的、推奨配置、対象外を読む。
2. Agent は `.amadeus/steering/policies.md` の既存方針を読む。
3. Agent は `.amadeus/steering/policies/git-branching.md` を個別 policy の配置候補として扱う。
4. Agent は AGENTS.md の操作指示と steering policy の責務差を整理する。
5. Agent は Inception 成果物へ配置方針と責務分担を記録する。

## 代替フロー

- 既存 policy と Issue #254 の対象外が衝突する場合は、要求を書かずに人間判断へ戻す。

## 事後条件

- Git ブランチ戦略の配置方針と責務分担が後続 stage へ渡せる。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | Steering Policy Entry | Git ブランチ戦略の概要と個別 policy への導線を扱う。 |
| 制御 | Policy Placement Decision | `.amadeus/steering/policies.md` と個別 policy の責務分担を判断する。 |
| エンティティ | Git Branching Policy | branch 戦略の長期方針を表す。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Steering Policy Entry | 採用候補 | 概要、導線、対象外 | 個別 policy に具体ルールを渡す |
| Git Branching Policy | 採用候補 | branch lifecycle、例外、検出境界 | AGENTS.md に実行操作指示を委ねる |
