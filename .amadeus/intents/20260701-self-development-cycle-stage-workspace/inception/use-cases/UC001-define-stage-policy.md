# UC001: stage 方針を定義する

## システム境界

- Agent が Amadeus 成果物を読み、stage0、stage1、stage2 の意味と採用条件を Inception 成果物へ整理する。
- このユースケースでは skill 実装、validator 実装、example snapshot 再生成は扱わない。

## 事前条件

- Issue #233 が存在する。
- stage 判定の初期語彙が `.amadeus/glossary.md` と `.amadeus/steering/policies.md` に存在する。

## 基本フロー

1. Agent が Issue #233、Discovery、先行 Intent の D002 を読む。
2. Agent が stage0、stage1、stage2 の意味を要求として整理する。
3. Agent が stage2 を次回 stage0 として採用する条件を要求として整理する。
4. Agent が `CONTEXT.md` への stage 語彙追加を対象外として残す。

## 代替フロー

- stage 語彙が矛盾する場合は、要求を書かずに `amadeus-domain-grilling` へ戻す。

## 事後条件

- stage 判定方針が Requirement と Unit Design Brief へ渡せる。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | Stage Policy Record | stage 判定語彙と採用条件を読む入口。 |
| 制御 | Stage Policy Shaping | Issue、Discovery、既存方針から要求へ整理する。 |
| エンティティ | Stage Decision | stage0、stage1、stage2 と採用条件を表す。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Stage Policy Record | 採用候補 | stage 判定語彙、採用条件 | Construction で記録先を確定する。 |
