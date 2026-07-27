# Requirements Analysis — 明確化質問(260726-answer-manual-binding)

上流入力(consumes 全数): business-overview.md、architecture.md(answer/guard 経路断面)、code-structure.md — codekb 260726-answer-manual-binding 断面(observed `ad1ff5de9`)

運用モード: ソロ。回答はユーザー直接裁定(AskUserQuestion)。

前提事実(RE 確定、scan-notes.md):
- 根本原因 = answer 転送の欠落(lifecycle:969-985 が manualOperation/invocationId を渡さない)× guard(:257-265)が request.answer を免除しない、の write⇔check 非対称
- 両修正案の事実根拠が RE で確定: (a) answer 経路(handlePromptAnswer 以降)は両フィールドを一切参照しない — guard 免除は防御を毀損しない / (b) 永続値から元値を完全再構成可能(invocationId = expected.event.boundary.instance、manualOperation = expected.operation — parseManualArgs の元値と一致)
- committed record に stale expectedPrompt 残存ゼロ → 遡及修復は不要

## Q1. 修正方式

A. **(b) answer 側で永続値を補填(推奨)** — runMirrorLifecycleAnswer が expected から manualOperation/invocationId を再構成して渡す。guard は不変のまま「manual boundary リクエストは常に id を携行する」という不変条件が全経路で普遍に保たれる(parse-don't-validate 整合)。将来 coordinator が answer 経路で id を参照し始めても壊れない
B. **(a) guard に answer 免除を追加** — `&& !request.answer` の最小変更。現時点では安全(answer 経路は id 不使用)だが、不変条件が「answer のときは無くてよい」へ弱まり、将来の参照追加で無音破壊のリスク
X. Other (please specify)

[Answer]: A

## 裁定の記録

- Q1 = A(answer 側で永続値補填 — invocationId = expected.event.boundary.instance / manualOperation = expected.operation。guard 不変)。裁定者: ユーザー(AskUserQuestion 直接裁定)。ソロモードのため選挙非実施
- ユーザー承認: 2026-07-27T00:25:00Z(AskUserQuestion 回答「A: answer 側で補填」受領)
