# Reliability Requirements — eoc1-gate-guard

## 上流入力(consumes 全数)

`../functional-design/business-rules.md`、`../functional-design/business-logic-model.md`、codekb `technology-stack.md`、`../../../inception/requirements-analysis/requirements.md`(FR-1〜4)。

## 要件(将来条件チェックリスト — c4)

- RR-1: 読み取り I/O 失敗(EACCES 等の想定外)は fail-closed(error)— 無音 fail-open 禁止(検証劇場 Forbidden)。ENOENT のみ BR-1 pass
- RR-2: 規模増: questions は数十行規模 — 全行走査で性能上限なし(タイムアウト機構不要の根拠 = ファイルサイズ実測 2KB 級)
- RR-3: クラッシュ耐性: 検査は setCheckbox より前 — 中断しても state 無変更(アトミック性は既存 withAuditLock)
- RR-4: 別 OS: 正規表現は ASCII+全角括弧のみ(パス区切りは join 使用)— Windows/Linux 差なし
