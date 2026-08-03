# Delivery Planning Questions — Codex Duration Bounds

<!-- E-OC1 判定証跡:
判定: 全3問はユーザー判断を要するeconomic sequencing・confidence・external dependency選択。
leader 承認: 2026-08-02T04:38:05Z
[Answer] 記入はユーザー回答受領後にのみ行う。 -->

**Mode:** Guide me

## Upstream Context

`requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を入力とする。既決事項は4 Unit = 4 Bolt、実着手順 `#1602 → #1998 → #1999 → #1919`、前段着地後の後続brebase、`in-progress` は実着手中の1 Issueのみである。teamのWalking Skeleton/TDD/no-AI-merge/release手動境界を維持する。

## Q1. Bolt sequenceの経済的根拠

既決の `#1602 → #1998 → #1999 → #1919` をどのsequencing heuristicとして記録しますか？

A. Hybrid。#1602をwalking skeleton + measurement/risk-firstとし、以降は前段の実測・共有contract・作業改善を次Boltに取り込むfeedback-propagation順とする。WSJF数値は作らない（推奨）
B. Pure WSJF。各Boltのvalue/time-criticality/risk-reduction/job-sizeを仮点し、スコア順として正当化する
C. Value-first。利用者に直接見える変化が大きいBoltから先に行う
D. Pure risk-first。実装不確実性だけで順位を決め、改善波及は根拠にしない
X. Other (please specify)

[Answer]: A. Hybrid。#1602をwalking skeleton + measurement/risk-firstとし、以降は前段の実測・共有contract・作業改善を次Boltに取り込むfeedback-propagation順とする。WSJF数値は作らない。回答受領: 2026-08-02T04:36:13Z

## Q2. Boltごとのconfidence hypothesis

各Boltが何を実証するかを以下の組で固定しますか？

A. #1602=全harnessで共通ID/duration/baselineが成立、#1998=停止/retryが有界で回復可能、#1999=質問/follow-up/reviewがresume越しで有界、#1919=FIFO/active/attempt/releaseと依存別継続が成立（推奨）
B. 共4 Boltに同じ「テストが通る」だけを設定する
C. 個別hypothesisを置かず、4 Bolt後の統合dogfoodだけで評価する
X. Other (please specify)

[Answer]: A. #1602=全harnessで共通ID/duration/baselineが成立、#1998=停止/retryが有界で回復可能、#1999=質問/follow-up/reviewがresume越しで有界、#1919=FIFO/active/attempt/releaseと依存別継続が成立。回答受領: 2026-08-02T04:36:43Z

## Q3. External dependencyと人間境界

Construction進行をblockするexternal dependencyをどう扱いますか？

A. 外部API/data/team依存はなし。各BoltのGitHub review/mergeだけを人間gateとし、merge後にrebase・label付け替えを行う。live provider journeyはcapability-dependent、release/publishは本Intent外の手動操作とする（推奨）
B. 対象外の外部API/data/team承認を追加する（内容を指定）
C. 全harnessのlive model/provider journeyを各Boltのblocking external dependencyにする
D. release workflowとnpm publishを4 BoltのDefinition of Doneへ含める
X. Other (please specify)

[Answer]: A. 外部API/data/team依存はなし。各BoltのGitHub review/mergeだけを人間gateとし、merge後にrebase・label付け替えを行う。live provider journeyはcapability-dependent、release/publishは本Intent外の手動操作とする。回答受領: 2026-08-02T04:37:21Z

## Consolidated Confirmation

Q1〜Q3の統合結果に矛盾がなく、4 Boltのdelivery成果物とInception→Construction検証を生成してよいですか？

A. Confirm — Hybrid sequence、Bolt別hypothesis、GitHub mergeの人間境界で生成する（推奨）
B. Revise — 回答を修正する
X. Other (please specify)

[Answer]: A. Confirm — Hybrid sequence、Bolt別hypothesis、GitHub mergeの人間境界で生成する。回答受領: 2026-08-02T04:38:05Z
