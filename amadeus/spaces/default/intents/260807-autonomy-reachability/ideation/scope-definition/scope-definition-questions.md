# Scope Definition 質問票 — 260807-autonomy-reachability

上流入力(consumes 全数): intent-statement(../intent-capture/intent-statement.md を全問の前提として実読)。feasibility-assessment / constraint-register は self-feature スコープで feasibility ステージが SKIP のため未生成(設計どおりの不在 — 代替として Issue #2378 の実測とクロスレビュー収束コメントを制約源に用いた)。

## 質問と裁定

ステージ既定5問のうち、既決事項は出典を引いて執行し、判断を要する2問(D1・D2)は semi の5段梯子(`amadeus-bolt decide-question`)で無人裁定した(AUTO_DECIDED・`unreviewed` キュー、phase 境界で人間検収)。

### Q1. 価値を出す最小スコープは何か

[Answer]: 導線是正(完了条件5)単独が最小価値スライス — `--autonomy` が発見可能になった時点で宣言が使われ始める。ただし D1 裁定により 1〜5 は Must のため、最小スライスは実施順序の先頭(D2)として扱う(執行: Issue #2378 完了条件+D2 裁定から導出)

### Q2. Must / Nice-to-have の区分(D1)

[Answer]: 完了条件 1〜5 = Must、6(plugin stage 文書 drift 是正)= Should。AUTO_DECIDED `auto-decision-e7a4b6f78823226450f2dd1b7d0c4956`(selected: `must-1to5-should-6`、basis: agent-recommendation、solo-election 劣化 loud 記録、reviewState: unreviewed)

### Q3. 能力間の依存関係

[Answer]: 執行(実測から一意導出): 5(導線)→1(導線が無ければ宣言が使われず実測が成立しない)。2・3(可観測性イベント)→4(回帰計測の測定述語が新イベント形に依存 — intent-capture diary の実測: 新経路は `INTENT_AUTONOMY_TRANSACTION_COMMITTED` を発行し `AUTONOMY_MODE_SET` は不発行)。6 は独立

### Q4. 実施順序の方針(D2)

[Answer]: dependency-first。AUTO_DECIDED `sd-q2-sequencing`(selected: `dependency-first`、basis: agent-recommendation、reviewState: unreviewed)。norm 根拠: team.md priority-vs-dependency(依存の根元を最優先)+project.md cid:scope-definition:c3 先例

### Q5. 特定能力に紐づくハード期限はあるか

[Answer]: なし(執行: Issue #2378・ユーザー指示のいずれにも期限の言及なし)

## 裁定の記録

- D1・D2: semi モードの decide-question 梯子による AUTO_DECIDED(2026-08-07T11:50Z 頃、audit shard に INTENT_AUTONOMY_TRANSACTION_COMMITTED として記録)。unreviewed 分は次の節目(phase 境界)で人間検収に提示する
- 執行分(Q1・Q3・Q5)は権威ある一次証拠からの機械的一意導出であり選挙不要(cid:requirements-analysis:always-elect の執行クラス)
- ユーザー承認: 2026-08-07T11:29:58Z(HUMAN_TURN — semi モード宣言により phase 内質問の無人裁定を授権)
