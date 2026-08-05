# Units Generation Questions — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
上流入力: [components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[services.md](../application-design/services.md)、[component-dependency.md](../application-design/component-dependency.md)、[decisions.md](../application-design/decisions.md)、[requirements.md](../requirements-analysis/requirements.md)  
回答モード: Guide me  
モード選択: 2026-08-04T12:19:35Z — ユーザー回答「1」= Guide me

ユーザー承認: 2026-08-04T12:21:11Z — Q1への直接回答「1」（audit `QUESTION_ANSWERED`）

分解計画承認: 2026-08-04T12:21:50Z — ユーザー回答「1」= Approve Plan（4 Unit）

## Q1. Kiro runtime probeのUnit境界

Kiro ACP/TUIはruntime probeの結果により、直接adapter接続または条件付き後続Issueへ分岐します。probeとその結果を閉じる作業を、どのUnit境界で扱いますか？

A. ACP UnitとTUI Unitのそれぞれにprobeを含め、各Unitが「adapter＋tests＋live green」または「sanitized evidence＋後続Issue＋registry/matrix」をend-to-endで完了する  
B. Kiro共通probe Unitを1つ作り、その後にACP UnitとTUI Unitを置く  
C. ACP probe、ACP実装、TUI probe、TUI実装を別Unitにし、probe-only Unitを先に完了する  
D. ACP/TUIを1つのKiro family Unitへまとめ、その内部でprobeと実装を扱う  
E. Kimiを含むPhase 2全体を1つの大きなUnitへまとめる  
X. Other (please specify)

[Answer]: A — ACP UnitとTUI Unitのそれぞれにprobeを含め、各Unitが「adapter＋tests＋live green」または「sanitized evidence＋後続Issue＋registry/matrix」をend-to-endで完了する（2026-08-04T12:21:11Z、Mode: Guide me）
