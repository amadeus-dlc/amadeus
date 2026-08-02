# NFR Design Questions — U3 exception

上流入力(consumes 全数): business-logic-model.md(実在 — redactStacktrace の承認シグネチャ(string 戻り)・write-time 層の適用範囲(recordException 内限定)・path マスク3分類が既決であることを照合した)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)。

## E-OC1 選挙不要判定

- 判定: **質問 0 件**。根拠種別: 既決裁定(redaction 方式・シグネチャ・適用範囲は FD レビュー(iteration 3 閉包)で確定済み。ADR-4 が addEvent 一般への適用範囲を既決)
- ユーザー承認: 2026-08-01T04:07:00Z(ユーザー指示「これをもとにintent起こしてあなたが進めて」+ FD ゲート Approve の継続実行範囲内)

## 裁定の記録

- 未決の設計判断は発生しなかった。resilience/scaling の常駐 service 向け質問は非適用(nfr-design:c1)。
