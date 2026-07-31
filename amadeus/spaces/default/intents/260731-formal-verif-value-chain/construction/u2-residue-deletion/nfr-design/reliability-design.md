# Reliability Design — u2-residue-deletion

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 障害モードと回復

| 障害 | 挙動 | 根拠 |
|---|---|---|
| 列挙照合の不一致(30 件でない) | 削除前に停止(fail-closed) | BR-U2-1 / business-logic-model.md I5(u1 未着地検出) |
| 削除後の残存テスト赤 | 全検証コマンドで検出 → PR revert が回復経路 | BR-U2-4 / I1 |
| 台帳 stale 残存 | coverage-patch gate が fail-closed 検出 | requirements NFR-4 / I3 |
| barrel import の書き換え漏れ | D2 (ii) の6ファイル実測目録が事前特定 — 実装時 grep で再確定 | business-logic-model.md D2 |
| 終状態未達(ディレクトリ残存 — 部分削除・空ディレクトリ) | `test -d scripts/formal-verif` exit 1 の機械 assert を PR 検証に含める(exit 0 なら赤) | business-logic-model.md I2 |
| **保存対象の誤削除**(`eligibility-report.ts`(削除対象)と `experiment/eligibility-report.md`(record 配下・ノルム出典 — 保存)の名前衝突) | 削除は `scripts/formal-verif/` 配下のフルパス限定で行い文字列一致の緩い grep で組まない+削除後に record 配下の保存対象の実在 assert | business-logic-model.md I4(BR-U2-1 の列挙照合はコード側のみで record 側を守らない — 別リスクとして明示) |

## 復活の禁止

削除の部分復活は新規要件としてユーザー裁定(BR-U2-3)— 無申告の再導入を構造的に禁止。
