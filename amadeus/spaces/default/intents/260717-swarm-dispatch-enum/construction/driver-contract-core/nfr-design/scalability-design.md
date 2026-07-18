# Scalability Design — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- SCD-1(SCR-1): 共有可変状態ゼロ(モジュールスコープの const 配列のみ)— 並行呼び出し安全は構成で自明
- SCD-2(SCR-2): 決定表・検証・エラー列挙はすべて `DRIVER_VALUES`/`HARNESS_VALUES` から導出(canonical 1 定義 — construction ガードレール)。テストの期待値も同配列から生成せず**独立に列挙**する(自己参照比較の検証劇場回避 — テスト側は表を手書きし実装と突き合わせる)

## 保証機構(層別)

- 定義層: 値集合の変更が 1 箇所で閉じる
- テスト層: 期待値は実装非依存の手書き表(16 セル)
