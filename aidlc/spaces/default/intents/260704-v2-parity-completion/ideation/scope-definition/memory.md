# Memory: scope-definition

## Interpretations

- 「最小価値」を、機能の広さではなく最大リスクの検証可能性で定義した（エンジン縦切り）。
- Issue #396 の 7 論点は、5 論点が既に方向確定（grillings 分解吸収、memory.md はエンジン採用で v2 準拠、audit shard は per-clone 形式へ、codekb 鮮度と real e2e は backlog）、残 2 論点（モジュールファイル、intents.md）が本ステージで廃止確定、と整理した。
- backlog の項目は proto-Unit として書き、上流 utility skill の深い検証と文書全面改稿を Should、運用規約系を Could に置いた。

## Deviations

- なし。3 問とも推奨案が採用された。

## Tradeoffs

- モジュールファイルと intents.md の廃止は、Intake の合流判定と人間向け一覧の入口を intents.json と intent-statement.md へ移すコストと引き換えに、独自契約の維持コストを消す。
- risk-first は、目に見える成果（新 skill 追加）が後ろへ寄る代わりに、二度手間を避ける。

## Open questions

- IndexGenerate.ts（intents.md 生成）の退役タイミング（GD009 の実装順序。validator の Index 検査カテゴリの扱いを含む）。
- backlog #1（上流 agents、rules、scopes、knowledge のコピー範囲）は縦切り Bolt の動作確認結果で決まる。
