# Reliability Requirements — election-model(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 障害耐性とエラー処理

- fallible API(`Election.parse`/`Ballot.parse`)は `Result<T, E>` を返し throw しない(business-logic-model.md エラー処理節 — 判別ユニオン Result 既決)。全域関数は失敗しない設計で素の値を返す
- 回復可能性の分類: parse 失敗は回復可能(呼び出し元 C6 が拒否理由を指令/exit code へ写像)。U1 内に致命的エラー経路を持たない(fs/network I/O 非保有)
- 可用性 SLO・バックアップ・DR は N/A(反証可能な根拠: U1 は永続を持たない純関数層 — 永続の耐障害性は U2 store の責務、unit-of-work 境界)

## 監査再現性

- 決定性(requirements.md NFR-3)が監査の基盤: 同一の票集合から開票・配布ビューを再生成して記録と照合できる(business-logic-model.md 決定的シャッフル節の監査再現)。business-rules.md BR-10/BR-11 がテストで固定
- 後着票・再審フラグ(classifyLate — BR-9)により開票後の到着も欠損なく記録へ写像される
