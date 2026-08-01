# Scope Definition 質問記録 — 260801-tla-multi-model

上流入力(consumes 全数): `scope-document.md`、`intent-backlog.md`

E-OC1 判定: 本ファイルの1問は実行方式の裁定であり、ソロモードでは仕様裁定はユーザー専権のため選挙を実施せず、AskUserQuestion によるユーザー直接裁定で回答を確定した。記入は裁定受領後(cid:code-generation:election-answer-after-ruling)。
ユーザー承認: 2026-08-01T15:20:00Z

## Q1: loader の実行対象モデル選択方式(B6)

現行は canonical 定数 `TLA_EXECUTION_MODEL_NAME = "FormalElection"` 固定(u7 裁定の暫定形)。複数モデル対応後の既定動作。

- A. 既定 = 全登録モデルを逐次実行し、オプション引数で単一モデル絞り込み可能 — CI は何も指定せず全モデル green を要求する形が自然
- B. 既定 = 引数必須でモデル明示、CI は登録モデル全件を明示列挙 — 既定実行の爆発を防ぐが、新モデル登録時に CI 側の列挙更新を忘れるリスク
- X. Other (please specify)

[Answer]: A. 既定 = 全登録モデルを逐次実行、オプション引数で単一絞り込み可能
