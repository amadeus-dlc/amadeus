# Requirements Analysis 質問票 — 用語定義の正本一本化 (#2030)

上流入力(consumes 全数): intent-statement.md、business-overview.md、architecture.md、code-structure.md

- 本質問票の Q1 は `architecture.md`(患部8面マップと語彙集合の重なり実測)および `code-structure.md`(患部×区間 touch 判定)が確定した「§9 固有6語・docs/reference 固有4語」の実測に基づく。前提節の裁定済み事項は `intent-statement.md` の裁定7項+Q1-Q3 を参照。`business-overview.md` の7ハーネス配布という製品前提が、供給経路の執行判定(E-OC1 ヘッダ)の背景である。

> E-OC1 判定: 裁定済み事項(intent-capture の前提7項+Q1-Q3)と、既決 contract から一意に導かれる執行事項は質問化しない。執行事項の根拠: 供給経路 = core knowledge(`packages/framework/core/knowledge/amadeus-shared/`)は、裁定4「intent 実行時も同一定義を見る — 全ハーネスのステージ実行コンテキストへ正本と同内容を供給」を満たす唯一の候補(RE 実測: 候補A のみ dist 7面+self-install 5面へ到達、B は非出荷、C は責務不整合)であり、機械的導出として執行する(cid:requirements-analysis:always-elect の執行クラス)。[Answer] 記入はユーザー回答受領後のみ。

## Q1: 語彙集合の統一方針(§9 固有6語・docs/reference 固有4語の扱い)

RE 実測: stage-protocol §9 の17語中6語(aidlc / component / generation / module / planning / service)が正本 glossary に不在。docs/reference/04 の Terminology は §9 の subset ですらなく固有4語(Approval Gate / Inline Stage / Subagent Stage / Lead Agent)を持ち、§9 の3語(Ladder prompt / Parallel batch / Walking skeleton)を欠く。投影(機械抽出)を成立させるには語彙集合の統一が必要。

- A) **全固有語(6+4=10語)を正本へ昇格**し、単一語彙集合(57+10+吸収分)から各面の subset をマーカーで機械抽出する — 「正本以外が独立定義を持たない」目標状態に最も忠実(推奨)
- B) §9 と docs/reference の固有語は各面に残し、正本と重複する語だけを投影対象にする — 独立定義が残るため目標状態の例外節が必要(非推奨)
- C) 固有語を精査し、不要な語は削除・必要な語のみ昇格する(昇格判断は FD 段で語ごとに実施)
- X) その他(自由記述)

[Answer]: A — 全固有語(10語)を正本へ昇格し単一語彙集合から機械抽出。ユーザー承認: 2026-08-02T10:26:32Z

## 裁定の記録

AskUserQuestion(実 HUMAN_TURN)で Q1=A を受領し転記。ユーザー承認: 2026-08-02T10:26:32Z
