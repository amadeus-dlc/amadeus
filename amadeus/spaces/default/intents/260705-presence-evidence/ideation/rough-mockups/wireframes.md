# Wireframes — Presence Evidence（260705-presence-evidence）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 適用判断

UI は存在しない（エンジン内部の検査関数または設計文書が成果物）。ステージ条件に従い、system interaction 表現で代替する。

## System Interaction（候補 1 採用時の検査フロー）

```text
declare-docs-only --evidence "DECISION_RECORDED <stage> ..."
  └─ verifyDocsOnlyEvidence
       ├─ 形式検査（現行）
       ├─ audit 実在照合（現行）
       └─ presence 相関（追加候補）: 参照 decision の Timestamp 秒窓に HUMAN_TURN が存在するか
            └─ 不在 → error（fix: 中継承認/ディスパッチ受信時の mint を確認して再宣言）
```

不採用時はこの図の「追加候補」枝を文書（設計境界）として残す。
