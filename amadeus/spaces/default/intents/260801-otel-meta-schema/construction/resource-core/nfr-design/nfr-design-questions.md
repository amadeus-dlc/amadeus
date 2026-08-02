# NFR Design Questions — U1 resource-core

上流入力(consumes 全数): business-logic-model.md(実在 — 質問空間の確認は同ファイルの遅延評価 memo・二層 redaction・fail-open/fail-closed 面区別が既決であることの照合で行った)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)。

## E-OC1 選挙不要判定

- 判定: **質問 0 件**。根拠種別: 既決裁定(NFR-1〜4 は requirements.md で承認済み、resilience/scaling の方式選択は nfr-design:c1 — CLI/library では常駐 service 向けパターンを適用せず決定的 file 境界+fail-closed 契約へ置換 — の既決ノルムで一意)
- ユーザー承認: 2026-08-01T04:07:00Z(ユーザー指示「これをもとにintent起こしてあなたが進めて」+ FD ゲート Approve の継続実行範囲内)

## 裁定の記録

- 未決の設計判断は発生しなかった。キャッシュ・水平スケーリング・circuit breaker 等の常駐 service 向け質問は本 unit(短命プロセスの library 層)に非適用(nfr-design:c1)。
