# Reliability Design — u4-tools-distribution

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 障害モードと回復(FD の I1/I3/I4 の障害モード+I2 の非該当宣言を表内で全数カバー)

| 障害 | 挙動 | 根拠 |
|---|---|---|
| u1 未着地(tools 実体なし) | manifest 宣言と実体の不一致で compose が loud 拒否 | business-logic-model.md I1 / M1 の検証 |
| digest 算出元の未拡張(drop 不能) | 落ちる実証で恒久ピン(stages のみ変種で drop 拒否を実測) | M2 の必須項+BR-U4-3(FD の I2 とは別機構) |
| —(FD I2: trusted-path 拡張) | **障害モードとして扱わない** — FD I2 は「ADR-1 の trusted-path 拡張は機構不適合で撤回済み」という設計是正の記録であり、対応する実装時検証は不要 | business-logic-model.md I2(撤回記録) |
| zero-plugin 構成の挙動変化 | t311 バイト等価テストが検出 | I3 / 既存 t311 |
| 宣言外ファイルの host 混入 | 宣言駆動(manifest 分のみ書込)+ownedPaths 照合 | I4 / M2 |
| 一括 compose の部分失敗 | 中断せず loud 列挙+exit 非0、成功ツリーは維持(再実行冪等) | M4 の fail-closed 集計 |

## 回復経路

compose 失敗は drop→再 compose で冪等回復(digest 照合が中間状態を検出)。PR 面は revert が最終経路。
