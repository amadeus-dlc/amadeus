# Reliability Requirements — U1 tla-externalize

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 障害時の振る舞い

- モデル、設定、登録簿の不在・空・読取不能・不正形式は deterministic なエラーへ分類し、部分成功として扱わない。
- 外部化後のモデル bytes は旧埋め込み版と identity 同値であることを integration test で固定する。
- `generateFrozenTlaModel` と `createFrozenTlaModelReceipt` の公開契約を維持し、既存実験資産の呼出しを壊さない。

## 回復性と可逆性

- U1 は永続サービスを持たないため可用性 SLO、バックアップ、災害復旧は非該当。失敗時はプロセスを非0終了し、Git 管理された正しいファイルへ修正して再実行する。
- 埋め込み定数を二重保持しない。回復はフォールバックではなく Git 履歴からの復元と identity 再検証で行う。
- 同一入力に対する読込、identity、登録簿構文の verdict は実行順序やホスト時刻に依存せず決定的であること。
