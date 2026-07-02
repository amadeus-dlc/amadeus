# B002 実行メモ

## 実行方針

B001 で確定した検出スクリプトの path と入出力契約を前提に、skill 本文の auto 判定表と Decision Review 記述を更新し、promote で source と昇格先を同期する。

再開行は既存の refine と repair の行と排他的に読める文言にする。

## 対象タスク

- T001: auto 判定表へ再開行を追加し、Decision Review 記述へ検出結果の参照を追加する。
- T002: promote で昇格先を同期し、混入がないことを確認する。

## 作業順序

1. B001 の完了（eval GREEN）を確認する。
2. T001 で source skill の本文を更新する。
3. T002 で promote を実行し、promote eval を確認する。

## 実装判断

- auto 判定表の再開行は refine 行の直前に置き、BR004 の 3 条件（実装済みかつ検証済み、pr.md なし、gate 未 passed、基準 branch 由来の checkout）を条件列に明記した（T001）。
- Decision Review には、同梱スクリプトの実行例（昇格先 path と入出力の要点）を入力証拠として追加し、検出結果が得られない場合は通常の判定へ戻ることを書いた（T001）。
- promote で `scripts/` が昇格し `evals/` が混入しないことを確認した（T002）。
- レビュー指摘（Bugbot）対応: 再開行が repair より先に一致し得るため、条件に「構造補修が不要である」を追加し、構造が壊れている場合は repair の行を優先することを理由列に明記した。表の既存原則（壊れた構造の上で内容判断をしない）と整合させた。

## 未確認事項

- なし。
