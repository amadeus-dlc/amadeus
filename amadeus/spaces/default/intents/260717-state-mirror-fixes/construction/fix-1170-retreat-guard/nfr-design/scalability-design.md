# Scalability Design — fix-1170-retreat-guard(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(SC-1/SC-2 の実現)

- SC-1(並行書き手の直列化): withAuditLock の相互排除ドメイン(projectDir+intent+space キー)に参加 — 並行 set-status・engine RMW のすべてが同一キューに直列化される。並行度上限は設けず、待ちは P-1 の有界リトライで bound(scalability-requirements.md SC-1)
- SC-2(state サイズ線形性): parseCheckboxes の全行走査1回のみ追加 — 既存 engine RMW(同関数を消費)と同特性

## 非目標

分散 state・プロセス間キューの導入はしない(scalability-requirements.md の N/A 宣言を設計でも維持)。
