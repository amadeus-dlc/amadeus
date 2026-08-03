# NFR Requirements — 質問票（0問様式、unit: convergence-budgets）

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 質問不要判定

- 判定: 質問0問。Stopの現行defaultはinteractive 2／autonomous 8、参考上限は [#1998のtakt比較コメント](https://github.com/amadeus-dlc/amadeus/issues/1998#issuecomment-5154591557) の10、recoverable spawn retryの既存実測値は2回であり、数値根拠をrepositoryと承認済みIssueから導出できる。
- retry hard cap: architect knowledgeの一般範囲3〜5の最小値3を採用し、初期default 2を維持する。これは初回attemptを含まず、自動再試行だけを数える。
- 既決境界: `requirements.md` FR-03のv1 allowlist外へ自動retryを拡張せず、approval／GitHub mutation／canonical writeを対象外にする。
- 実行裁定: `amadeus-state.md` の Construction Autonomy Mode は `autonomous`。未解決の事業・規制判断はない。

## 曖昧性分析

- 「最大2回」はrecoverable retryのdefault、「最大10回」は同一stageのstop continuation hard capとして別BudgetSubjectに分離する。
- `cap`は予約可能な処理回数であり、開始前counter=`cap-1`のcap回目を許可し、開始前counter=`cap`のcap+1要求を拒否する。
- semantic convergenceは再計画signalに限定し、deterministic capを延長・resetしない。
