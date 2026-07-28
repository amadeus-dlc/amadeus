# Security Design — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): security-requirements.md、performance-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

SR-U1-1/SR-U1-2(security-requirements.md)の実現: 委譲コマンドは `["bun", join(TOOLS_DIR, "amadeus-plugin.ts"), ...rest]` の配列リテラル構成のみ(business-logic-model.md のフロー)。TOOLS_DIR は amadeus-utility.ts 既存定数(tech-stack-decisions.md TS-U1-1)で外部入力から合成しない。env・stdin の加工なし。

## 境界確認

- reliability-requirements.md RL-U1-1 の fail-loud と両立(エラーの握りつぶしはセキュリティ上の無音経路にもなるため作らない)
- performance-requirements.md / scalability-requirements.md に反する防御機構の過剰追加なし(入力検証は plugin CLI 側の単一所有)
