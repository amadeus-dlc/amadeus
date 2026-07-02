# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-gate-queue-visualization | [20260702-gate-queue-visualization.md](../../20260702-gate-queue-visualization.md) | Inception の要求分析で参照する。 |
| Issue | #350 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/350) | 承認待ち一覧の Requirement、Acceptance、Use Case の根拠にする。 |
| Discovery | 20260702-parallel-execution | [Discovery Brief](../../../discoveries/20260702-parallel-execution.md) | 候補「ゲート待ちキューの可視化」の課題と成功状態、待機条件が Issue #334 の cycle 完了で解消した経緯の根拠にする。 |
| 対象境界 | `state.json` の横断スキャンによる承認待ち一覧、0 件時の表示、配布先ユーザー環境での実行 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | feature、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 承認待ち判定の条件と一覧の出力契約を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | 承認待ち判定の決定論的検証、複数 Intent を含む workspace での一覧確認、0 件時の表示確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で承認待ち一覧の確認フローと一覧の列を具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-gate-queue-visualization | 20260702-shared-index-generation | 待機条件「共有インデックスの生成物化の後に扱う」が、この Intent の cycle 完了で解消したため。 | [intents.md](../../../intents.md) |
| インテント | 20260702-gate-queue-visualization | 20260702-phase-gate-approval-contract | 横断スキャンが読む `state.json` のゲート語彙と approval evidence の契約の定義元であるため。 | [intents.md](../../../intents.md) |
| インテント | 20260702-gate-queue-visualization | 20260702-state-json-scaffolding | スキャン対象になる `state.json` の構造安定の前提であるため。 | [intents.md](../../../intents.md) |
| Issue | #350 | なし | Discovery 20260702-parallel-execution の候補「ゲート待ちキューの可視化」として起票されたため。 | [Discovery Brief](../../../discoveries/20260702-parallel-execution.md) |
| アクター | ACT001 Maintainer | なし | 承認待ち判定の条件、一覧の出力形式、実行入口の配置先を判断するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| 複数 Intent が並行する workspace で、承認待ちの Intent、phase、ゲート、待ち理由を 1 回の実行で一覧できる。 | scope の SC-IN-001 と初期モックに記録した。 | 承認待ち判定の条件と一覧の列を要求化する。 |
| 承認待ちが 0 件の場合もその旨が分かる。 | scope の SC-IN-002 と初期モックに記録した。 | 0 件時の出力契約を要求化する。 |
| 配布先ユーザー環境（repo root の開発用スクリプトなし）で実行できる。 | scope の SC-IN-003 に記録した。 | 実行入口の配置先と実行環境の前提を要求化する。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で承認待ち判定の条件や実行入口の配置先がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
