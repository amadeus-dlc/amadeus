# Scope Definition — 質問票

Stage: scope-definition (ideation)
Depth: Standard（目安 5-8 問、文脈適応で 5 問）
Context: `intent-statement.md`（1 Intent・hard gate 確定済み）、`feasibility-assessment.md`（実現可能・条件付き）、`constraint-register.md`（TC-1〜TC-6・OC-1〜OC-4）。#1672 に採用方針・非目標・実装順が既にあるため、ここでは In/Out 境界の確定と優先度付けを確認する。

## 判定と根拠（E-OC1 3段順序）

- Q1-Q5: 選挙不要 — ソロ運用。ユーザー本人が AskUserQuestion で直接回答（HUMAN_TURN 実測）
- leader 承認: ユーザー本人の直接回答をもって承認済み 2026-07-29T06:01:45Z

---

## Q1. In/Out 境界は #1672 の非目標どおりで確定してよいか？

Out: Collector を状態機械の正本にすること、audit 出力をネットワークへ依存させること、恒久 dual-write、Node auto-instrumentation の初期導入、全関数の無差別 Span 化、初期段階での Metrics API 全機能自前実装。

- A. 確定 — #1672 の非目標6件をそのまま Out とする
- B. 追加の Out がある
- C. 非目標の一部を In に戻したい
- X. Other (please specify)

[Answer]: A. 確定 — #1672 の非目標6件をそのまま Out とする

## Q2. Phase の優先度付け（MoSCoW）はどう置くか？

- A. Must: Phase 1-4（Provider 実証・Journal v2・Context 伝播・appendAuditEntry 廃止＝監査の正本移行の完了）、Should: Phase 6（Relay 縮退）、Could: Phase 5（Metrics／diagnostic Logs）
- B. Must: Phase 1-6 すべて（#1672 完了条件どおり全て必須）
- C. Must: Phase 1 のみ。Phase 2 以降は合格後に再優先度付け
- X. Other (please specify)

[Answer]: A. Must: Phase 1-4、Should: Phase 6、Could: Phase 5

## Q3. シーケンシング方針は？

- A. risk-first — Phase 1 walking skeleton（hard gate）で最大リスクを最初に潰し、以後は依存順（Phase 2→6）に進める（#1678 の risk-first 実証どおり）
- B. value-first — 利用者に価値が見えるものを先に
- C. dependency-first のみ — リスク順位は付けない
- X. Other (please specify)

[Answer]: A. risk-first — Phase 1 walking skeleton（hard gate）で最大リスクを最初に潰し、以後は依存順

## Q4. 最初に価値が立つスライスはどれか？

- A. Phase 1 の walking skeleton 自体 — OTel API 経由で canonical Event が audit JSONL に同期出力され、Context が維持される実証が最初の価値（撤回可否の判断材料でもある）
- B. Phase 4 完了（appendAuditEntry 廃止）まで価値は出ない
- C. Phase 3（Context 伝播）で子 process 相関が見えた時点が最初の利用者価値
- X. Other (please specify)

[Answer]: A. Phase 1 の walking skeleton 自体が最初の価値（撤回可否の判断材料でもある）

## Q5. Unit 設計への入力として、並行化の粒度方針は？

units-generation での Unit 切り方の方針（team.md: Bolt/Unit は独立に切り、相互依存が真に必要な箇所のみ直列）。

- A. Phase 内の module 単位（例: Phase 2 なら journal codec／AuditLogExporter／reader 差替え）を独立 Unit とし、Phase 間は直列依存とする
- B. Phase をそのまま Unit とする（粗粒度。並行化は最小限）
- C. units-generation ステージで具体案を見てから決める
- X. Other (please specify)

[Answer]: A. Phase 内の module 単位を独立 Unit とし、Phase 間は直列依存とする
