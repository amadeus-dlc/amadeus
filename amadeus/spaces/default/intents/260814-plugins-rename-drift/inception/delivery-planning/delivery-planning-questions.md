# Delivery Planning 質問(260814-plugins-rename-drift)

> 戦略質問の大半は上流で確定済み: シーケンシング = dependency-first(scope-definition Q2=A、ユーザー指示 #2996 → #2997)、Bolt 粒度 = Bolt ごとに 1 PR のノルム(cid:units-generation:c1「PR 粒度は Bolt ごとを既定」)と 1 Issue = 1 Unit 原則から 1 Unit = 1 Bolt、外部依存 = なし(GitHub Actions / gh CLI のみ — AI 完結)。残る裁定は 2 問(予算 8 問中 2 問)。semi 梯子で裁定(cid:scope-definition:c1-semi-ladder-routing)。

## Q1. Bolt 編成と順序

A. 3 Bolt 直列: B1 = U1 rename(walking-skeleton ゲート維持 — project.md Mandated「self-feature なら既存コード変更でも最初の Construction Bolt に walking-skeleton gate を維持」)→ B2 = U2 settings-core → B3 = U3 git-drift。順序根拠: ユーザー指示(#2996 先行)+ U3→U2 依存 + `amadeus/config.json` 共有ファイル(U1/U3)の直列化(units-generation レビュー FOLLOW-UP の解消 — B1 が先にマージされ、B3 は最新 main 起点で activation.names へ追記するため編集競合が構造的に消える)。(推奨)
B. B2/B1 並行など別編成
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## Q2. WSJF スコアリングの採否

A. 不採用 — Bolt 3 本・順序は依存とユーザー指示で一意に確定しており、スコアリングは意思決定に寄与しない(risk-and-sequencing-rationale.md に依存ベースの根拠を記録)。(推奨)
B. WSJF を採用する
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## 承認証跡

- semi 梯子裁定(承認): 2026-08-14T08:42:00Z — Q1=A `auto-decision-7d2a57405ac45b82df5864b1e78ac0e9` / Q2=A `auto-decision-f59de26c84a3fdaf389c063b43890198`(decider=agent-recommendation、unreviewed キュー入り。INTENT_AUTONOMY_TRANSACTION_COMMITTED が一次記録)
