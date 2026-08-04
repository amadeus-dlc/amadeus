# Requirements Analysis Questions — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
上流入力: [intent-statement.md](../../ideation/intent-capture/intent-statement.md)、[scope-document.md](../../ideation/scope-definition/scope-document.md)  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
Brownfield入力: [business-overview.md](../../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../../codekb/amadeus/code-structure.md)  
回答モード: Guide me  
モード選択: 2026-08-04T09:25:07Z — ユーザー回答「1」= Guide me

ユーザー承認: 2026-08-04T09:33:35Z — Q1への直接回答「1」（audit `QUESTION_ANSWERED`）

## Q1. Kiro CLIを直接接続した場合のlive完了証拠

Issue #1717と承認済みScopeは、Kiro CLIのACP/TUIをそれぞれ「直接接続」または「条件付き後続Issue」の二択で完了させると定めています。一方、直接接続したtransportごとにlocal opt-in live greenまで必須とするかは明記されていません。どの証拠をPhase 2の完了条件としますか？

A. 直接接続したACP/TUIの各transportで、adapter integration test・共通contract test・local opt-in live journey 1本のgreenを必須とする。直接接続できないtransportは条件付き後続Issueへ接続する  
B. ACP/TUIの両adapterがintegration/contract testを通れば、local opt-in live journeyはKiro CLI全体で代表1本のみとする  
C. Kiro CLIは実測とdeterministic testだけでよく、local opt-in live greenはPhase 2の完了条件にしない  
D. ACPのみlocal opt-in live greenを必須とし、TUIはintegration/contract testまたは後続Issueで完了できる  
E. TUIのみlocal opt-in live greenを必須とし、ACPはintegration/contract testまたは後続Issueで完了できる  
X. Other (please specify)

[Answer]: A — 直接接続したACP/TUIの各transportで、adapter integration test・共通contract test・local opt-in live journey 1本のgreenを必須とする。直接接続できないtransportは条件付き後続Issueへ接続する（2026-08-04T09:33:35Z、Mode: Guide me）
