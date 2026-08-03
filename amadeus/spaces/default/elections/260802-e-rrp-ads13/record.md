# Election Record — E-RRP-ADS13

- question: 260802-record-roundtrip-pbt / application-design §13 学習選定。surface 候補1件: c1 = ratchet allowlist の将来値(U1 着地後の縮小見込み 33→32)を検出述語の意味論から機械導出せずに断定し、reviewer の Major(自己矛盾指摘)を招いた — AST 述語は型引数非依存・readJson 本体不変のため縮小しない。台帳・ゲートの将来値は述語適用の机上トレースまたは実測でのみ書く、という教訓。candidate が (a) 既存 cid(数値・引用系の既存規範群: numbers-from-command-only / mechanism-cite-verify / P2 等)の執行実例で persist 不要か (b) 既存規範が縛らない「予測値(未来の測定値)の断定」面を埋める新規追補で persist 相当かを、diary 原文・AD 成果物(decisions.md ADR-2 Consequences の是正文・components.md の Review block)・project.md の既存数値系 cid を実測して判定し投票せよ。GoA(1-8)明記、GoA 2/3/6 は留保1文。

裁定: c1 採用 — 「将来値・見込み値は述語の机上トレースか実測でのみ書く」を新規学習として persist(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): 既存の derived-value-shows-formula / numbers-from-command-output-only 系数値規範ファミリへの追補として persist し、独立 cid 新設でファミリを分裂させないこと。
- 留保(subagent-1, GoA2): 独立 cid でなく numbers-from-command-output-only / estimates-not-acceptance-criteria 系の既存数値規範への追補として persist し、適用対象を台帳・ゲートの将来値に限定して肥大を避けること。
票タイムライン: 配信 2026-08-02T17:39:08Z → 配信 2026-08-02T17:39:08Z → subagent-2 2026-08-02T17:41:00Z(受理 2026-08-02T17:41:06Z) → subagent-1 2026-08-03T00:00:00Z(受理 2026-08-02T17:41:35Z) → 開票 2026-08-02T17:41:53Z
GoA[E-RRP-ADS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
