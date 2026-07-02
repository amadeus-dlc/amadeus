# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-provenance-mechanization | [20260702-provenance-mechanization.md](../../20260702-provenance-mechanization.md) | Inception の要求分析で参照する。 |
| Issue | #296 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/296) | `provenance:generate` と `provenance:check` の Requirement、Acceptance、Use Case の根拠にする。 |
| Discovery | 20260702-evidence-record-and-evaluation | [Discovery Brief](../../../discoveries/20260702-evidence-record-and-evaluation.md) | recommended 候補判断（GD001）の根拠にする。 |
| 依存 Intent | 20260701-self-development-cycle-stage-workspace | [state.json](../../20260701-self-development-cycle-stage-workspace/state.json) | U002 Unit Design Brief の再確認条件（evidence を JSON として標準化する必要が出た場合）の発火元として参照する。 |
| 対象境界 | `provenance:generate` と `provenance:check` の dev-scripts 追加と CI 組み込み | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | infra、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | JSON スキーマの項目構成と既存 Intent への遡及適用範囲を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | eval の TDD 記録、`provenance:check` の CI 組み込み、`npm run test:all` pass の確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で記録の生成と照合フローを具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-provenance-mechanization | 20260701-self-development-cycle-stage-workspace | Issue #296 は、Intent 20260701-self-development-cycle-stage-workspace の U002 Unit Design Brief が残した「evidence を JSON として標準化する必要が出た場合」という再確認条件の発火元であるため。 | [intents.md](../../../intents.md) |
| Issue | #296 | #315 | 親 Issue #315 の子 Issue であり、Discovery の進め方（#296 と #297 で記録形式を確定してから #240 を扱う）で依存順が確定しているため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/315) |
| アクター | ACT001 Maintainer | なし | provenance 記録の置き場所、JSON スキーマの項目構成、既存 Intent への遡及適用範囲、validator との連携範囲を判断するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| `provenance:generate` の出力だけで policies.md の最低記録項目を満たせる。 | scope の SC-IN-001、SC-IN-004 に記録した。 | JSON スキーマの項目構成を policies.md の最低記録項目に対応する要求として確定する。 |
| `provenance:check` が、記録と実測のずれ（md5 不一致、commit 不一致、参照先欠落）を検出して CI を fail にできる。 | scope の SC-IN-001、SC-IN-003 に記録した。 | `provenance:check` の照合対象と CI fail 条件を要求とユースケースにする。 |
| eval が実装前に失敗することを確認してから実装している（TDD 記録が PR にある）。 | scope の SC-IN-002 に記録した。 | eval の置き場所と実行方法を確定する。 |
| `npm run test:all` が pass する。 | scope の SC-IN-003 に記録した。 | `npm run test:all` chain への組み込み方法を Bolt の対象にする。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で記録の置き場所や JSON スキーマの項目構成がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
