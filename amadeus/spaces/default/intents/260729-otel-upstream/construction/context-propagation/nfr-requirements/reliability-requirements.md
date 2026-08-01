# Reliability Requirements — U5: context-propagation

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 伝播正確性（BR-3）

| 項目 | 目標 | 検証 |
|---|---|---|
| 3 段チェーン | 親→子→孫 process で trace ID が一致し、parent span ID が正しく連鎖する。孤立 trace を生む経路は欠陥（BR-3） | 3 段 subprocess の integration テストで ID 連鎖をアサート |
| 接続網羅性 | hook／subagent（worktree Bolt）／sensor／CLI 子 process の全経路が同じ Trace に接続される（FR-TRC-5） | 各経路の emit が同一 trace ID を持つことをテストで固定 |
| 永続化／復元 | `persistIntentContext` で書いた Context を別 process の `restoreIntentContext` で復元し、remote parent 接続できる（FR-TRC-4） | cross-process 復元テスト（U1 検証の本番経路適用） |

## 失敗時の振る舞い（fail-open、BR-5／BR-6）

- Context 抽出失敗時: 子 process は新規 root trace を開始してよいが、その事実を diagnostic Log に残す。workflow は止めない（FR-EVT-6 の fail-open と整合）
- `restoreIntentContext()` が record を見つけられない場合: 新規 anchor を生成して永続化し、混在期間の後方互換を保つ（BR-6）
- 抽出失敗・record 不在を silent にしない: いずれも diagnostic Log 出力を必須とし、テストで Log 発生をアサートする
- 伝播失敗が canonical Event／Journal 書込み（fatal latch 対象）へ波及しないこと: carrier は telemetry 経路に閉じる
