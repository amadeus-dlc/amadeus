# Rough Mockups 質問（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

本 Intent は UI を持たない CLI ツールであり、ステージ条件に従い wireframe は CLI 入出力設計で代替した。回答は上流と wireframes.md の設計から転記し、新規のピア協議は行わない。

---

## Q1. CLI の出力方針はどれですか？

A. 工程を番号付きで逐次表示し、失敗時は失敗工程・原因・回復方法（冪等再実行）を stderr に出す
B. 無出力（exit code のみ）
C. 詳細ログを常時全量出力
X. Other (please specify)

[Answer]: A（出典: wireframes.md。利用者が「どこまで進んだか」「失敗時にどうするか」を判断できる最小の表示。C は Right-Sizing に反する）

## Q2. 対話プロンプト（確認 y/n など）を設けますか？

A. 設けない（非対話。1 コマンド完結の受け入れ条件 1 と、eval からの自動実行に適合）
B. 上書き時のみ確認する
X. Other (please specify)

[Answer]: A（出典: 受け入れ条件 1「1 コマンドで実行できる」と grilling 確定 5「上書き更新型」。破壊防止は不可侵領域（aidlc/）と hooks 限定マージの設計で担保する）
