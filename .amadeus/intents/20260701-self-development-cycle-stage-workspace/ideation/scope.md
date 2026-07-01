# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | Amadeus DLC の自己開発 cycle で使う stage0、stage1、stage2 の意味を定義する。 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 採用 |
| SC-IN-002 | stage2 を次回 stage0 として採用する条件と、人間による採用判断を定義する。 | [policies.md](../../../steering/policies.md) | 採用 |
| SC-IN-003 | build workspace、host environment、target workspace、target artifacts の対応記録先を定義する。 | [development.md](../../../development.md) | 採用 |
| SC-IN-004 | 後続 Intent が参照する stage 判定と workspace 対応記録の追跡方法を定義する。 | [D002](../../20260629-self-dev-steering-layer/ideation/decisions/D002-issue-233-handoff-scope.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | skill 実装。 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 採用 |
| SC-OUT-002 | validator 実装。 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 採用 |
| SC-OUT-003 | example snapshot 再生成。 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 採用 |
| SC-OUT-004 | 後続の個別 Intent に固有の詳細設計と実施作業。 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 採用 |
| SC-OUT-005 | `CONTEXT.md` 本体への stage 語彙追記。 | [D002](../../20260629-self-dev-steering-layer/ideation/decisions/D002-issue-233-handoff-scope.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | feature | 後続 Intent が共通して参照する stage 判定と workspace 対応記録を定義する新規機能相当の Intent であるため。 |
| 省略 stage | なし | Requirement、Acceptance、Use Case、Unit、Bolt へ分解して、Construction で docs 更新または `.amadeus/` 更新を実行できる状態へ進めるため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | stage 判定、採用判断、workspace 対応記録先を後続 Intent が参照できる粒度で定義するため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | `.amadeus/` 全体と対象 Intent の validator、`npm run typecheck`、`npm run test:all` で成果物契約と標準検証を確認するため。 |

## Inception への引き継ぎ

- stage0、stage1、stage2 の意味を要求として定義する。
- stage2 を次回 stage0 として採用する条件と、人間による採用判断の記録先を受け入れ状態にする。
- build workspace、host environment、target workspace、target artifacts の対応記録先を要求とユースケースにする。
- User Stories は Maintainer の判断価値を表す必要がある場合だけ作る。
- `CONTEXT.md` への stage 語彙追加、example snapshot provenance、assets 混入検出は後続判断に残す。
