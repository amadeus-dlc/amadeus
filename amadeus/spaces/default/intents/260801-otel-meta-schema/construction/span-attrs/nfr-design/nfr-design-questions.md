# NFR Design Questions — U2 span-attrs

上流入力(consumes 全数): business-logic-model.md(実在 — resolver 6キー・両キー省略の fail-open・merge 優先度(resolver 出力 < 明示 setAttributes)が既決であることを照合した)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)。

## E-OC1 選挙不要判定

- 判定: **質問 0 件**。根拠種別: 既決裁定(resolver 語彙は #1868 §2、FR-SUB-4 供給経路は FD 実測で不在確定=省略動作、いずれも FD レビュー READY で確定済み)
- ユーザー承認: 2026-08-01T04:07:00Z(ユーザー指示「これをもとにintent起こしてあなたが進めて」+ FD ゲート Approve の継続実行範囲内)

## 裁定の記録

- 未決の設計判断は発生しなかった。常駐 service 向け質問は非適用(nfr-design:c1)。
