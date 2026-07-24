# Application Design 質問 — 260722-tla-plugin

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: ユーザー本人の HUMAN_TURN 直接回答)。ユーザー承認タイムスタンプ: 2026-07-22T12:32:22Z(Q1 再裁定回答)
> 上流入力(consumes 全数): requirements、architecture、component-inventory、team-practices(すべて読了)
> 既決(質問対象外): FR-1〜FR-6 の全裁定。設計判断の大半は requirements の裁定から一意に導出されるため、本ステージの質問は前提不成立の再裁定1問のみ

## Q1. CI の TLC 供給の具体形(feasibility Q5 の前提不成立による再裁定)

事実(設計段実測): ghcr.io/tlaplus/tlaplus は不在(registry 直接照会 DENIED)。Docker Hub の TLC イメージは個人メンテのみ(stars 0〜1、pulls 数百)。公式一次配布物は tla2tools.jar(tlaplus GitHub Releases)。eclipse-temurin は Docker 公式イメージ。

- A. 公式 temurin イメージ(digest固定)+公式 tla2tools.jar(チェックサム固定)
- B. 個人イメージを digest 固定で利用
- C. 自前 Dockerfile へ切替
- X. Other (please specify)

[Answer]: A — temurin公式+公式jar(2026-07-22T12:32:22Z。feasibility Q5 の B を一次供給元公式物の組合せへ具体化 — 再裁定として feasibility-questions.md にも追記済み)

## 回答分析(contradiction analysis)

Q1 の再裁定は Q4(Docker イメージ利用)と整合(temurin コンテナ内で TLC 実行)。他の設計判断は requirements 裁定から一意導出のため質問なし。曖昧・矛盾なし。
