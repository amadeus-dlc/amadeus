# Application Design Questions — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
上流入力: [requirements.md](../requirements-analysis/requirements.md)  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
Brownfield入力: [architecture.md](../../../../../codekb/amadeus/architecture.md)、[component-inventory.md](../../../../../codekb/amadeus/component-inventory.md)  
回答モード: Guide me  
モード選択: 2026-08-04T11:44:29Z — ユーザー回答「1」= Guide me

ユーザー承認: 2026-08-04T11:45:30Z — Q1への直接回答「１」（audit `QUESTION_ANSWERED`）

## Q1. 既存legacy live journeyの移行方式

Issue #1717は既存を含む全live pathへ共通policyを適用すると定めていますが、既存Kimi/Kiro driverとjourneyを共通lifecycleへ移す際のコード移行方式までは定めていません。どの方式を採用しますか？

A. 既存journeyを共通`runLiveJourney`へ移行し、既存driverからtransport固有mechanicsだけをadapter内部の実装として再利用する。旧policy/lifecycle経路は残さず、単一実行経路にする  
B. 既存journey/driverを変更せず、新しい共通adapter journeyを並行追加して二重経路を維持する  
C. 既存driverを削除し、transport mechanicsを含めて各adapterを全面的に書き直す  
D. 新しい最小journeyだけを共通lifecycleへ接続し、既存journeyの移行は後続Issueへ分離する  
E. 共通adapterから既存driverをopaque subprocessとして呼び、既存policyと共通policyを両方通す  
X. Other (please specify)

[Answer]: A — 既存journeyを共通`runLiveJourney`へ移行し、既存driverからtransport固有mechanicsだけをadapter内部の実装として再利用する。旧policy/lifecycle経路は残さず、単一実行経路にする（2026-08-04T11:45:30Z、Mode: Guide me）
