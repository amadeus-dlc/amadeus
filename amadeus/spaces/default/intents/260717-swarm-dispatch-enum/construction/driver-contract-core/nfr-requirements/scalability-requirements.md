# Scalability Requirements — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- SCR-1: resolve はステートレス・並行安全(共有状態なし — `business-logic-model.md` の読み取り専用境界)。並行呼び出しの直列化要件なし
- SCR-2: 値集合の拡張(将来 harness/driver 追加)は `DRIVER_VALUES`/`HARNESS_VALUES` の1定義追記で閉じる(`business-rules.md` BR-1 の単一始点。受け入れ = 表・検証・エラー列挙が配列から導出され手書き複製ゼロ)

## 検証

- スループット・容量系は非該当(バッチ並行度は referee 既存契約 — `requirements.md` NFR-3 は U2 面)— 明示 N/A
