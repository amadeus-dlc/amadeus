# Reliability Design — u3-scope-promotion

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の全面deep-equalをfallback入力とする。

## 失敗と回復

- scope 定義欠落、タグ漏れ、grid 差は compile/check を非0終了させ、部分投影を成功扱いにしない
- package 処理は一時treeで完成させ、成功後に投影先へ置換する既存原子性を維持する
- 再試行は同一正本からの全 build とし、差分面だけの手修正を禁止する
- 誤った昇格は Git 履歴の通常 revert で回復し、生成物だけを復元しない

## 故障領域

compile責務、投影責務、self-scope-consistency検証を分離する。compiler共通モード欠陥は移行前root 15-key固定fixtureとのセル比較で止め、投影欠陥はcanonical出力との面間比較で止め、センサー期待の欠陥はセンサーテストで止める。fixture自身の更新はscope定義変更と同一PRで独立レビュー対象にする。per-user composed scope はstock compileの故障領域外に保つ。
