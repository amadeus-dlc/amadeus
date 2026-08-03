# NFR Requirements — 質問票（0問様式、unit: bounded-unit-pool）

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 質問不要判定

- 判定: 質問0問。[Issue #1919](https://github.com/amadeus-dlc/amadeus/issues/1919) が現行prose上限4と `cap=2／4 Unit` の受入例を明記し、`technology-stack.md` でも並列度4が既存の実測最適点である。
- 数値裁定: active slot default／hard capは4、per-invocation overrideは1〜4の縮小のみ。Unit attemptとreconciliationはdefault 2／hard cap 3とし、#1998の共通reserveを再利用する。
- 実行裁定: `amadeus-state.md` のConstruction Autonomy Modeは`autonomous`。未解決の規制・事業判断はない。

## 曖昧性分析

- active capはqueued Unitを数えず、未release slotだけを数える。
- Unit attempt capは初回を含むtotal attempt、recoverable retry capは初回後のretry回数であり、dispatchには両budgetの残量が必要である。
- reconciliationは通常実行時間を制限せず、native effect／result／cancel照会が失敗・timeoutした回数だけを数える。
