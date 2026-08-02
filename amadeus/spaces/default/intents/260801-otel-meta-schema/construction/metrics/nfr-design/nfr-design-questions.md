# NFR Design Questions — U5 metrics

上流入力(consumes 全数): business-logic-model.md(実在 — registerMeterProvider の実シグネチャ準拠呼出し・INSTRUMENTS 閉集合5計器・cardinality 統制が既決であることを照合した)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)。

## E-OC1 選挙不要判定

- 判定: **質問 0 件**。根拠種別: 既決裁定(計器語彙は #1868 §6 で確定、配線形は FD レビュー(iteration 2 READY)で実装シグネチャと一致確認済み)
- ユーザー承認: 2026-08-01T04:07:00Z(ユーザー指示「これをもとにintent起こしてあなたが進めて」+ FD ゲート Approve の継続実行範囲内)

## 裁定の記録

- 未決の設計判断は発生しなかった。常駐 service 向け質問(auto-scaling 等)は非適用(nfr-design:c1)。
