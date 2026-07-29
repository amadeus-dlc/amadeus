# Reliability Design — U5: context-propagation

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の伝播正確性（BR-3）と fail-open（BR-5/BR-6）の要件に対する設計。

## 伝播正確性の設計

- 親 process は subprocess 起動前に `injectToSubprocess(env)` で Context を注入し、子は起動時に抽出して自身の root span の parent とする。注入を「起動前の必須ステップ」として spawn 様式に組み込み、注入忘れの経路を作らない（business-logic-model.md § 子 process への伝播）
- 対象経路（hook・subagent・sensor・CLI 子 process）すべてが同じ inject/extract 関数を使い、経路ごとの独自伝播実装を持たない
- 3 段（親→子→孫）で trace ID 一致・parent span ID 連鎖を integration テストで固定し、孤立 trace を欠陥として検出する（BR-3）

## fail-open の設計

- Context 抽出失敗時、子 process は新規 root trace を開始するが、その事実を diagnostic Log に必ず残す。silent な切断を禁止し、テストで Log 発生をアサートする（BR-5）
- `restoreIntentContext()` が record を見つけられない場合は新規 anchor を生成して永続化し、混在期間の後方互換を保つ（BR-6）。record 破損時も同じ経路に落とす
- carrier 処理は telemetry 経路に閉じ、伝播失敗が canonical Event／Journal 書込み（fatal latch 対象）へ例外・latch として波及しないことを型とテストで固定する

## 永続化／復元の信頼性

- cross-process 復元テスト（`persistIntentContext` で書いた Context を別 process の `restoreIntentContext` で remote parent 接続）を `--ci` 層で検証する（FR-TRC-4、U1 検証の本番経路適用）
- 永続化 write は telemetry 扱いとし、失敗は fail-open（fatal latch を set しない）。ただし失敗は diagnostic Log に記録する
