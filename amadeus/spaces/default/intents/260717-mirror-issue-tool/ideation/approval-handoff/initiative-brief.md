# Initiative Brief — amadeus-mirror ツール

上流入力(consumes 全数): intent-statement.md(intent-capture)、scope-document.md、intent-backlog.md(scope-definition)、feasibility-assessment.md、constraint-register.md(feasibility)

## Initiative Summary(イニシアチブ要約)

intent-first 起票運用(team.md cid:intent-first-mirror-issue、norm PR #1159)を支える repo ローカル CLI `scripts/amadeus-mirror.ts` を実装する。サブコマンドは create / sync / close の3つ。ミラー Issue 本文は定型3要素(概要+record リンク+状態行)のみ、同期は record → Issue の一方向、close は着地機械検査通過時のみ成功する。

## Approved Scope(承認済みスコープ)

- In: 3コマンド CLI、定型3要素テンプレート内蔵、`intent-mirror` ラベル新設(scope-document.md)
- Out: フック自動発火・framework 出荷・逆方向同期・一括ミラー化
- 成功指標: (1) 1コマンド起票 (2) 本文=定型3要素のみ (3) close=着地検査通過時のみ(intent-statement.md)

## Feasibility Verdict(実現性判定)

実現可能・高確度(feasibility-assessment.md)。外部前提(gh 認証・編集権限・状態源様式)は実測済み。主リスクは park 状態の機械可読取得(raid-log R1、design 段で確定)。

## Handoff Disposition(引き渡し)

本 intent は試運転として **ここで park** する。再開条件は (1) record PR(intent birth PR)のクロスレビュー成立とマージ (2) ユーザーの明示的再開指示 — の両方(Q1 裁定)。inception 再開時の入力は intent-backlog.md(proto-Unit 5件)。
