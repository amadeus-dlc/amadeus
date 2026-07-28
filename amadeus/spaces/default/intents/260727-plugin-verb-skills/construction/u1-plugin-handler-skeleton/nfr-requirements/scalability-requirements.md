# Scalability Requirements — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md(横断チェックリスト)、technology-stack.md

## SC-U1-1: 該当なし(根拠付き N/A)

U1 は単発 CLI 委譲であり、規模変数は plugin 数のみ(requirements.md 横断チェックリスト: 想定一桁、ページング不要)。水平スケール・キャッシュ等の常駐サービス機構は適用しない(business-rules.md BR-U1-3 の薄い dispatch 原則とも整合 — 状態を持たない)(nfr-design:c1 — business-logic-model.md の一本道と technology-stack.md の CLI 境界に、スケール面の強制メカニズムが存在しない)。

## 再評価条件

plugin 数が status/doctor の出力可読性を損なう規模(目視で数十)になった時点で別 intent として再評価する。
