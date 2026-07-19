# Unit Test Instructions — 260719-tally-choice-ruling

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象と実行方法

- 回帰テスト(第一級成果物): `bun test tests/unit/t234-election-model.test.ts` — E-GMEBT verbatim 回帰(winner=choice2)/GoA4 棄権除外/choice tie→hold("tie")/unknown-choice 拒否(実在しない internalNo・0・負値)の新規4+choice-blind 前提を宣言更新した既存群
- render 面: `bun test tests/unit/t238-election-record.test.ts`(winner 形 fixture)

## 合否基準

- t234 17 pass / 0 fail(落ちる実証: base 切替で 6 fail を実測済み — code-summary.md)
- GoA 成立判定((iii) discussion・(iv) block・quorum)の既存挙動グリーン維持
- E-GMEBT 実データで winner.internalNo === 2(閉包の固定点)
