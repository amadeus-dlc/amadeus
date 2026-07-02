# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-bolt-wave-parallel-execution | [20260702-bolt-wave-parallel-execution.md](../../20260702-bolt-wave-parallel-execution.md) | Inception の要求分析で参照する。 |
| Issue | #352 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/352) | wave 実行契約の Requirement、Acceptance、Use Case の根拠にする。 |
| Discovery | 20260702-parallel-execution | [Discovery Brief](../../../discoveries/20260702-parallel-execution.md) | 候補の課題と成功状態、待機条件が 3 候補の cycle 完了で解消した経緯の根拠にする。 |
| 対象境界 | wave 導出契約、wave 単位の実行と統合と検証、並行運用ポリシーとの整合 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | feature、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | wave の導出規則と実行手順の契約を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | validator、標準検証、skill-forge 確認、必要な場合の eval を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で wave 導出と実行順序の具体例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-bolt-wave-parallel-execution | 20260702-parallel-operation-policy | wave 実行契約は並行運用の判断基準（worktree 分離、直列化）を前提にするため。 | [intents.md](../../../intents.md) |
| インテント | 20260702-bolt-wave-parallel-execution | 20260702-shared-index-generation | 共有インデックスの追記衝突の解消が並行実行の構造前提であるため。 | [intents.md](../../../intents.md) |
| インテント | 20260702-bolt-wave-parallel-execution | 20260702-gate-queue-visualization | wave 内の複数 Bolt の承認は、承認待ちキューの確認とまとめ承認の運用を前提にするため。 | [intents.md](../../../intents.md) |
| Issue | #352 | なし | Discovery 20260702-parallel-execution の候補「Bolt の依存 wave 並行実行」として起票されたため。 | [Discovery Brief](../../../discoveries/20260702-parallel-execution.md) |
| アクター | ACT001 Maintainer | なし | wave 導出の契約、定義先の skill、まとめ承認の扱いを判断するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| 依存のない Bolt を wave 単位で並行実行し、wave ごとに統合と検証を行う契約が Construction skill から読める。 | scope の SC-IN-001、SC-IN-002 と初期モックに記録した。 | wave 導出の規則、実行と統合と検証の手順、定義先の skill を要求化する。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で wave 導出の契約や定義先の skill がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
