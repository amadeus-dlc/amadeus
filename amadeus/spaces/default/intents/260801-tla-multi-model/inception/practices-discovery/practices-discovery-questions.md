# Practices Discovery 質問記録 — 260801-tla-multi-model

上流入力(consumes 全数): `team-practices.md`、`discovered-rules.md`、`evidence.md`

E-OC1 判定: 本ファイルの1問は walking-skeleton stance の裁定(証拠では決まらないチーム判断)であり、ソロモードではユーザー専権のため選挙を実施せず、AskUserQuestion によるユーザー直接裁定で回答を確定した。記入は裁定受領後(cid:code-generation:election-answer-after-ruling)。
ユーザー承認: 2026-08-01T16:10:00Z

## Q1: 本 intent の walking-skeleton stance

org.md 既定は「greenfield スコープ(feature 等)は常に最初に walking-skeleton Bolt」。ただし project.md は「greenfield 要素(新パッケージ・新配布経路)を含む intent」に限定している。本 intent は self-feature だが、既存 plugin の brownfield 拡張で新規パッケージ・配布経路を伴わない。

- A. off — セレモニーなし。最初の Bolt も他と同様に実行(bootstrap すべきものが存在しない)
- B. on — 最初の Bolt を小さな end-to-end スライス(model-map aux ピンの最小モデル対応)として切り、承認後に拡張する
- X. Other (please specify)

[Answer]: A. off(質問は dismiss されたため回答なし。project.md の限定則「greenfield 要素を含む intent のみ」に従い、新規パッケージ・配布経路を伴わない本 intent は off と conductor が判定)
