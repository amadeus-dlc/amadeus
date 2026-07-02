# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-shared-index-generation | [20260702-shared-index-generation.md](../../20260702-shared-index-generation.md) | Inception の要求分析で参照する。 |
| Issue | #334 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/334) | 共有インデックス再生成の Requirement、Acceptance、Use Case の根拠にする。 |
| Discovery | 20260702-parallel-execution | [Discovery Brief](../../../discoveries/20260702-parallel-execution.md) | recommended 候補の選定理由と、他候補を生成物化の後に扱う依存順の根拠にする。 |
| 対象境界 | intents.md と discoveries.md の再生成、validator の不整合検査、配布先ユーザー環境での実行 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | インデックスに残す情報と配下モジュールへ移す情報の境界を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | 再生成の決定論性検証、validator の不整合検査、examples での再生成一致確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で並行統合と再生成の確認フローを具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-shared-index-generation | なし | Discovery の recommended 候補であり、既存 Intent の完了を前提にしないため。 | [intents.md](../../../intents.md) |
| Issue | #334 | なし | Discovery 20260702-parallel-execution の候補判断で、4 候補の先頭に置かれた recommended 候補として起票されたため。 | [Discovery Brief](../../../discoveries/20260702-parallel-execution.md) |
| アクター | ACT001 Maintainer | なし | インデックスと配下モジュールの情報境界、生成入口の配置先を判断するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| `intents.md` と `discoveries.md` が配下モジュールから決定論的に再生成できる。 | scope の SC-IN-001 に記録した。 | インデックスに残す情報と配下モジュールへ移す情報の境界を要求化する。 |
| 並行 branch の統合で、共有インデックスの手動コンフリクト解消が不要になる。 | scope の SC-IN-001 と初期モックに記録した。 | 並行統合と再生成の確認手順を要求化する。 |
| インデックスと配下モジュールの不整合を validator が fail にする。 | scope の SC-IN-002 に記録した。 | validator の検査契約を確定する。 |
| 生成の入口が配布先ユーザー環境で実行できる。 | scope の SC-IN-003 に記録した。 | 生成入口の配置先と実行環境の前提を要求化する。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降でインデックスの情報境界や生成入口の配置先がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
