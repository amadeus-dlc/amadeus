# Scope Definition Questions — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
上流入力: [intent-statement.md](../intent-capture/intent-statement.md)  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
回答モード: Guide me

ユーザー承認: 2026-08-04T08:51:33Z — Q1への直接回答「1」（audit `QUESTION_ANSWERED`）

## Q1. スコープ・優先順位・順序の継承

先行IntentとIssue #1717のPhase 2境界を、変更なく継承しますか？

A. 継承する。MustはKimi print driverの共通policy/lifecycle接続・adapter/contract test・opt-in live journey、およびKiro CLI ACP/TUIの直接接続または条件付き後続Issue link。共通安全contractを前提にKimiとKiroを独立proto-Unitとして扱い、Kiroの不確実性を早期実測する。特定期限は設けない  
B. Kimi CodeだけをMustとし、Kiro CLIをWon'tへ変更する  
C. Kiro CLIの直接接続を必須とし、後続Issueへの分離を認めない  
D. Kiro IDEのGUI/CDPもMustへ追加する  
E. CursorとOpenCodeもMustへ追加し、Phase 3まで同じIntentで扱う  
X. Other (please specify)

[Answer]: A — 先行IntentとIssue #1717のPhase 2境界を変更なく継承する（2026-08-04T08:51:33Z、Mode: Guide me）
