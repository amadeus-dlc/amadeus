# Scalability Design — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- SCD-D1(SCR-D1): 写像表(`business-logic-model.md`)の行追加だけで新 harness の docs 面が閉じる構成を維持 — 表以外の暗黙対象を作らない
- SCD-D2(SCR-D2): 件数断定コメントの新設ゼロ(count-free 優先)— 受け入れは変更 docs への数量表現 grep(「N ファイル」「N 箇所」形)で 0 件

## 保証機構(層別)

- 様式層(SCD-D1): 写像表 = 対象面の単一台帳(BR-D6 の走査範囲と同一)
- 検査層(SCD-D2): 変更 docs への数量表現 grep(`[0-9]+ ?(ファイル|箇所)` 形。受け入れ = 0 件)
