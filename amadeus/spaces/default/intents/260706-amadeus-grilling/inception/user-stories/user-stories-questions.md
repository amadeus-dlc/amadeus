# User Stories — 明確化質問

**Intent**: Amadeus Grilling 統合 / **Stage**: user-stories (2.4) / **Depth**: Standard
**前提**: requirements.md が例外的に明確(全FRに合否基準)なため、ストーリー構成の2点のみ確認する。

---

## Q1. ペルソナ構成は?

A. 2ペルソナ — 「ワークフロー実行者」(ゲート付きステージで Grill me を使う)と「スタンドアロン利用者」(ワークフロー外で /amadeus-grilling を使う)
B. 3ペルソナ — A に「外部導入チームのメンバー」(dist からインストールして使う)を加える
X. Other (please specify)

[Answer]: B — 3ペルソナ(ワークフロー実行者/スタンドアロン利用者/外部導入チームメンバー)

## Q2. ストーリーの切り方は?

A. ジャーニー準拠 — モード選択→対話(1問ずつ/推定確認/延長・打ち切り)→共通理解確認→成果物生成、の利用の流れで切る
B. 成果物準拠 — Grill me モード/スタンドアロンスキル/監査/配布、の実装単位で切る
X. Other (please specify)

[Answer]: A — ジャーニー準拠(モード選択→対話→確認→生成の流れで切る)
