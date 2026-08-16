# Code Generation Plan — unit interactive-carveout(U4 / ADR-5 / FR-4 / Q11=A)

## 拘束

- R-1: Stop hook の対話/非対話判定は C3 の `resolveSessionInteractivity` のみを読み、hook 内に第2の判定を実装しない。
- R-4: carveout 2(pending-question)/ 3(pending-compose)の mode/grant 根拠の拒否(`isQuestionCarveoutIntent` :450、`isFullyAutonomousIntent` :485)を撤去する。carveout 1(human-wait)・4(conversational)へは新束縛を課さない(適用範囲は2/3のみ)。
- R-5 / R-6: 対話セッションでは裁定順序3到達(contested/none)または裁定順序1(人間専権)の裁定点でのみ carveout 2/3 が発火する。終端が unique(自動裁定可)では発火させない(ADR-9 発火頻度予算)。
- R-11 / R-12: carveout 1(human-wait)・4(conversational)は現行意味論を完全保存する無退行 pin を対で置く。

## TDD 順序(実施順、base `swarm-int-rfc0001@b69be09db`)

1. seam 解決: FD が「読取口は `readProductionAutonomyProjection` ただ1つ」と定めつつ具体エンベロープを U1/U3 の申し送り入力としていた点を、U1/U3 が実際に着地させた形(`readProductionWaitingStop` が `cause.outcome.kind ∈ {contested, none}` を返す)で解決 — 新規 engine call を追加しない純粋なディスク読取であることを確認してから採用。
2. `t561-interactive-carveout.integration.test.ts` を先に作成(FP-1〜FP-5、5ケース)。
3. Red 実測(9 pass / 5 fail、base `b69be09db` + テストファイルのみ)。
4. `amadeus-stop.ts` の質問/compose carveout を interactivity port + ruling-order terminal の2軸へ実装。
5. Green 実測(14 pass / 0 fail)。
6. R-11/R-12 の無退行 pin を対で確認(human-wait/conversational は改修前後で同一結果)。
7. `isQuestionCarveoutIntent` 削除に伴うテストの棚卸し: `t456-question-carveout-predicate.test.ts`(200行、対象predicate丸ごと削除)を削除し、t121/t195/t246/t481 の参照を retarget。t122 の park アサーションは U3 の park-guard 撤去で統合base時点で既に赤だったものをここで修復。

## 検証・配送

- swarm batch 3(interactive-carveout / semi-authority-projection)。
- referee: `548f09f5a integrate bolt-interactive-carveout (batch 3)` で `swarm-int-rfc0001` へ収束。
- worktree: `.amadeus/worktrees/bolt-interactive-carveout`、branch `bolt-interactive-carveout`、base `swarm-int-rfc0001@b69be09db`、HEAD `d32546f8e`。
