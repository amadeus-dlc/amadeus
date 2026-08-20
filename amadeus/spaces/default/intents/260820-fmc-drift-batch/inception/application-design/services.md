# Services — 260820-fmc-drift-batch

上流入力: `requirements.md`、codekb `architecture.md`(260820 節)、codekb `component-inventory.md`(CLI 面)。`stories` / `team-practices` は不在(設計どおり)。

## 新設サービスなし

本 intent はデプロイ可能なサービス・新規 CLI・新規プロセスを一切追加しない(AD Q3=A: 腕は既存判定 pipeline 内の段。RA Q2=A: 境界 opt-in 宣言面も新設しない)。既存の CLI サービス面の変化は次の3点のみ:

| CLI 面 | 変化 | 通信/呼出契約 |
|---|---|---|
| `tla-authoring.ts`(applicability / registration verb 群) | `advisory hold` / `subjects declare` verb の消滅(C4)。applicability 判定の出力に腕チェック結果が加わる(C1)。registration の revise-model が置換を受理(C2) | 同期 CLI(bun 直接実行)。呼出側は engine の advisory 機構と stage 本文 — advisory 宣言の除去により engine からの authoring-hold 評価呼出も消滅(engine 側コード無変更) |
| `tla-applicability.ts` | 判定 pipeline に armCheck / coverageCheck 段(C1) | 同期・関数内。receipt 契約(#3262)不変 |
| model-map 消費群(loader / sensor / TLC runner) | 境界1定義化により plugin implPath を受理(C3) | ファイル読取(model-map.json)。スキーマ不変(境界集合のみ拡大) |

## オーケストレーション

変更なし — engine の forwarding loop・advisory 機構・sensor 発火(PostToolUse)はすべて既存のまま。plugin.json の `advisories[]` から authoring-hold 1エントリが消えることで engine の評価対象が1つ減る(宣言駆動、engine 側の分岐変更なし)。

## ライフサイクル/スケーリング

該当なし(常駐プロセスなし。TLC 実行は既存の run-model-check 経路のまま)。
