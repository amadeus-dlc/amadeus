# Refined Mockups 質問（260705-engine-installer）

上流入力: [mockups.md](mockups.md)

CLI の出力設計は rough-mockups（gate 承認済み D8）の精緻化であり、新規判断は出力チャネルの割り当てだけである。回答は設計から転記し、新規のピア協議は行わない。

---

## Q1. 出力チャネルの割り当てはどれですか？

A. 進行・完了 = stdout、エラー・fix 案内 = stderr（パイプ処理と CI ログの分離に適合）
B. すべて stdout
C. すべて stderr
X. Other (please specify)

[Answer]: A（出典: interaction-spec.md。FR-1.1 の「stderr に出す」と整合し、eval が exit code + stderr で異常系を判別できる）

## Q2. 工程ラベルの言語はどれですか？

A. 英語の短縮ラベル（`engine`、`skills`、`symlinks`、`settings`、`smoke`）。工程名は eval が出力を検査する機械可読ラベルを兼ねるため
B. 日本語の記述ラベル（wireframes.md の「エンジン一式を配置」等をそのまま）
X. Other (please specify)

[Answer]: A（本ステージの精緻化判断。wireframes.md（rough、日本語記述）からの変更であり、根拠は (1) 工程名を eval の出力検査（FR-2 系）の機械可読ラベルとして使うこと、(2) CI ログ・パイプ処理での可搬性。利用者向けの説明文（完了通知、fix 案内の誘導先）は README（日本語）が担う。小さな構造判断として gate 承認で確定する）
