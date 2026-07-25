# Delivery Planning 質問と回答

## 回答方針と入力

ユーザーの包括指示「質問は全部推奨でいいよ。」に基づき、すべて推奨案を採用した。判断には `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を使用した。optional inputの`stories.md`と`mockups.md`は本scopeでは存在しない。

## Q1. Sequencing heuristic

- A. walking-skeleton-first と risk-first のhybrid（推奨）
- B. value-first
- C. WSJFのみ
- D. riskを考慮しないtopological順
- X. その他

[Answer]: A（E-1466-DP-Q1、2026-07-25T06:11:55Z、包括指示に基づく推奨回答）

## Q2. WSJF scoring

- A. 数値WSJFを使わない。安全性とDAG制約を明示的に優先する（推奨）
- B. value、time criticality、risk reductionを等重みで採点する
- C. risk reductionを2倍重みにする
- X. その他

[Answer]: A（E-1466-DP-Q2、2026-07-25T06:11:55Z、包括指示に基づく推奨回答）

## Q3. Bolt granularity

- A. U1+U2をend-to-end Walking Skeleton Bolt、U3を互換性・配布Boltにする（推奨）
- B. 3 Unitを1 Boltにまとめる
- C. 1 Unitずつ3 Boltにする
- X. その他

[Answer]: A（E-1466-DP-Q3、2026-07-25T06:11:55Z、包括指示に基づく推奨回答）

## Q4. Parallel execution

- A. DAGに従って2 Boltを逐次実行する（推奨）
- B. 2 Boltを並行実行する
- X. その他

[Answer]: A（E-1466-DP-Q4、2026-07-25T06:11:55Z、包括指示に基づく推奨回答）

## Q5. External dependencies

- A. blocking external dependencyなし。GitHub PR/CIは検証・統合経路として扱う（推奨）
- B. 外部teamの事前承認を必須にする
- C. 外部authorization serviceを導入する
- X. その他

[Answer]: A（E-1466-DP-Q5、2026-07-25T06:11:55Z、包括指示に基づく推奨回答）

## Q6. Earliest risks

- A. exact-ID TOCTOU、audit atomicity、human fallback、team非回帰を最優先する（推奨）
- B. 文書生成だけを先行する
- C. harness投影だけを先行する
- X. その他

[Answer]: A（E-1466-DP-Q6、2026-07-25T06:11:55Z、包括指示に基づく推奨回答）

## Q7. Bolt 1

- A. `grant-authorization-domain`と`solo-gate-transaction`を束ね、Walking Skeletonにする（推奨）
- B. `grant-authorization-domain`だけにする
- X. その他

[Answer]: A（E-1466-DP-Q7、2026-07-25T06:11:55Z、包括指示に基づく推奨回答）

Definition of Doneは、solo lifecycle、route receipt、exact-ID lock再検証、success audit、typed fallback、非approve拒否、phase/skeleton/per-unit policyが関連unit/integration testsでgreenになること。confidence hypothesisは「監査由来grantだけで通常gateを安全に承認でき、route後失効では副作用なくhuman gateへ戻る」である。担当はamadeus-developer-agent。

## Q8. Bolt 2

- A. `harness-contract-and-regression`を単独Boltにする（推奨）
- B. Bolt 1へ統合する
- X. その他

[Answer]: A（E-1466-DP-Q8、2026-07-25T06:11:55Z、包括指示に基づく推奨回答）

Definition of Doneは、team mode非回帰、全6 harness同一意味論、help/doctor/reference整合、型・関連/全test・drift checkがgreenになること。confidence hypothesisは「canonical契約が全harnessへ同じ意味で配布され、既存team/human経路を壊さない」である。担当はamadeus-developer-agent。

## 曖昧性分析

- U1だけではend-to-endではないため、U1とU2をBolt 1へ束ねてWalking Skeletonとした。
- U3はU2へ依存するため並行実行しない。
- 最初のConstruction Boltは`team-practices.md`に従いhuman-only gateとし、standing grantで自動承認しない。
- user-stories成果物は存在しないため、`unit-of-work-story-map.md`のFR/NFR delivery scenarioを計画入力とする。
- blocking external dependencyはなく、publish/releaseは本Issueの完了条件に含めない。
