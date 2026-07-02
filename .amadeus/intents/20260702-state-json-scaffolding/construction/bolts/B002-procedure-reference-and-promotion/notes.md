# B002 実行メモ

## 実行方針

参照の追加先は、state 更新を実際に記述する 5 つの skill（intent-capture、inception、functional-design、bolt-preparation、construction traceability-finalization）と、同梱元の amadeus-validator に限定する。
公開入口 skill（amadeus-ideation、amadeus-construction）は内部 skill に state 更新を委譲しているため、参照は内部 skill 側だけに置く。

参照は昇格先 path を指す 1 行程度の記述にし、手書きの代わりに雛形生成を既定の動きとして読めるようにする（BR005、UC003）。

## 対象タスク

- T001: state 更新手順を持つ phase skill へスクリプトの利用参照を追加する。
- T002: amadeus-validator の SKILL.md にスクリプト同梱の案内を追加する。
- T003: 変更した skill の昇格先を promote で同期する。

## 作業順序

1. B001 のスクリプト実装（引数体系の確定）を待って着手する（Bolt 依存: B001）。
2. T001 で 5 つの skill へ参照を追加する。
3. T002 で amadeus-validator に案内を追加する。
4. T003 で promote 同期と確認を行う。

## 実装判断

- 参照は各 skill の state 更新手順の該当行へ、遷移種別と昇格先 path を含む 1 文として追記した（T001）。functional-design の参照には、validator 確認のチェックポイントが最初の Bolt 準備完了後にあることを併記した（B001 の発見に対応）。
- `amadeus-inception` は `## state.json` 節の冒頭に inception-start と inception-complete の両方を案内した。
- `amadeus-validator` の SKILL.md には「同梱スクリプト」節を新設し、遷移種別の一覧、既存値保持の規則、検証チェックポイントを案内した（T002）。
- 6 skill を promote で同期し、`npm run test:it:promote-skill` の pass を確認した（T003）。

## 未確認事項

- 変更 PR の説明は、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従う。
