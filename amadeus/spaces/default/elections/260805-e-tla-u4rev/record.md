# Election Record — E-TLA-U4REV

- question: PR #2287(U4 registration-committer)への Cursor Bugbot High 指摘の扱い: composeRegisteredMap は FD business-logic-model.md 手順3 の承認済み意味論どおり「snapshot に draft を append した全体を validator 検証(name 重複は validator-rejected で loud 拒否)」を実装している。一方 FD 手順1a は route=revise-model を受理するため、既存 model-map.json に同名エントリがある revise-model draft は構造的に commit 不能(常に validator-rejected)。requirements FR-010 は replace 意味論を規定せず、FR-012 の E2E は「新規 authoring または改訂」のどちらかで足りる。この設計上の緊張をどう扱うか。

裁定: A: 現状受理 + 後続 Issue(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): 後続 Issue は PR #2287 のマージ前に起票し、FD business-logic-model.md 手順1a(revise-model 受理)と手順3(append + name 重複は validator-rejected)の緊張を Issue 本文へ file:line で明記すること — 起票を後回しにすると設計ギャップが無記録のまま消える。
- 留保(subagent-2, GoA2): 後続 Issue は「Bugbot スレッドを閉じるための形式的起票」にせず、replace-by-name 意味論の仕様裁定(FR-010 が replace を規定するか否か)をユーザー裁定事項として本文に明記した enhancement とすること。Bugbot 返信には loud 拒否・map 破壊なしの機序と Issue 番号の双方を書き、機能ギャップの実在自体は否認しない。自案非採用時の受容度: 案B=6。
票タイムライン: 配信 2026-08-05T13:18:56Z → 配信 2026-08-05T13:18:56Z → subagent-1 2026-08-05T13:20:50Z → subagent-2 2026-08-05T00:00:00Z(受理 2026-08-05T13:21:17Z) → 開票 2026-08-05T13:21:57Z
GoA[E-TLA-U4REV]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
