# Scope Definition — Questions(intent 260815-rfc-autonomy-modes)

> **SETTLED 境界の宣言**: 能力目録(scope-document.md §能力目録の 15 項)は全項 SETTLED — 上流 = 承認済み RFC-0001(status: approved、Q1/Q3/Q16/Q17 裁定・付録 A 指示 1〜8)。したがって scope-boundary 2 問(minimum viable scope / must-have vs nice-to-have)は**不発**(SETTLED 境界への縮小提案は仕様変更でありユーザー専権 — stage 規定どおり省略)。operational 3 問のみ発問。
> 承認: 2026-08-15T15:40:00Z — full 梯子 AUTO_DECIDED auto-decision-8d0301ef5d2d59d9efb3497e6631cee9(3 問とも RFC の順序制約・記載事実から一意導出)。

## Q1(operational): What are the dependencies between capabilities?

- A. RFC Reference-level の順序制約をそのまま採用: (i) park guard 廃棄(D1/D5)→ semi Bolt 自律化の**先行依存**(誤順で semi が park 能力を失う) (ii) `RecommendationOutcome` 型(Q1=A)が梯子・裁定順序改修の基盤 (iii) 対話/非対話検出(Q3=A′)が D10 と非対話中断の前提 (iv) 宣言/projection 乖離 loud fail(D3/D9)は 3 面同時改修
- X. Other

[Answer]: A

## Q2(operational): What is the sequencing preference?

- A. **dependency-first** — 基盤型(Q1 ユニオン)→ 対話検出 → 非対話中断機構 → mode 別権限(semi 差し替え・full 経路)→ 可視化・config 廃止・ノルム 3 レイヤー。RFC の順序制約から一意
- B. risk-first / value-first
- X. Other

[Answer]: A — RFC が明示する先行依存が risk/value の並べ替え余地を消している。

## Q3(operational): Are there hard deadlines?

- A. なし — RFC・リカバリ計画・関連 Issue のいずれにも期限記載なし(事実確認)
- X. Other

[Answer]: A
