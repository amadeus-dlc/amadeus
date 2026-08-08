# Reliability Design — u2-birth-declaration

上流入力(consumes 全数): business-logic-model.md(部分適用なしの不変条件)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 失敗様式と回復

| 失敗点 | 挙動 | 回復 |
|---|---|---|
| birth 失敗(intent 生成・state 初期化) | 既存の birth エラー様式 — 宣言は未消化 | birth 再実行(宣言も再指定) |
| 適用失敗(canonical 関数のエラー) | birth 成立済み・mode=none のまま loud error。ラッチ非消費(BR-U2-4) | `next --autonomy <mode>` で再宣言 |
| ask 経路(scope 未確定) | 案内つき loud 拒否 — birth も宣言も起きない | `--scope` 明示 or birth 後宣言 |
| full の儀式未完 | birth 成立・mode 未設定・儀式手順印字で停止(fail-closed) | preview → 確認 → set-autonomy full |

- failure injection: 上記4点をテストで固定(FR-1c の対角実測と併せて builder が code-summary へ記録)
- 部分適用なし: mode が「audit だけ半端に進む」中間状態を持たない — 適用は u1 の原子性契約(audit 先行・state 追従・冪等収束)へ委譲

## 一貫性

birth 直後の最初の `next` が `intent_autonomy_mode` を搬送すること(BR-U2-7 e2e)が、宣言→走行の end-to-end 一貫性の固定点。
