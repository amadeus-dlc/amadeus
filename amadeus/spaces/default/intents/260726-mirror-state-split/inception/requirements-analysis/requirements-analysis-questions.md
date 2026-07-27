# Requirements Analysis — 明確化質問(260726-mirror-state-split)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md(いずれも `amadeus/spaces/default/codekb/amadeus/`、260726-mirror-state-split 断面)

運用モード: ソロ(AMADEUS_OPERATING_MODE 未設定)。回答はユーザー直接裁定。

前提事実(conductor 実測、2026-07-26):
- 読み手3箇所(`amadeus-mirror.ts:169` / `amadeus-orchestrate.ts:314` / `:3522`)を v1 ブロック権威へ統一する方向は #1547/#1534 クロスレビュー 2/2 の一致推奨+org.md Forbidden(要求なき互換シム・二重実装の禁止)に整合するため既決扱いとし質問しない
- legacy 10 record のミラー Issue(#1161/#1179/#1182/#1222/#1228/#1436/#1448/#1470/#1474/#1472)は全て CLOSED 済み(`gh issue view` 実測)。10 intent 自体もすべて完了済みで、phase boundary の auto-sync が発火する active workflow は存在しない

## Q1. legacy 10 record(v1 ブロック無し・「Mirror Issue」フィールドのみ)の扱い

読み側を v1 権威へ統一すると、legacy record は「ミラー未作成」と同義になります(codec 契約上 v1 不在 = EMPTY_MIRROR_STATE)。#1534 が求めた「復旧経路」の要否をどう確定しますか?

A. **復旧 verb は作らない(最小)** — v1 統一により legacy record は「guarded ミラーなし」へ自然降格。全ミラー Issue が CLOSED 済み・全 intent 完了済みで実運用の残務ゼロのため、復旧経路は「不要になった」として #1534 に文書化してクローズ。あわせて不到達の legacy コード(handleCreate/handleSync/handleClose/writeMirrorIssueField と legacy seed テスト)は削除して置き換える(org.md トランクベース原則)。将来 legacy intent を再開して新規ミラーが必要になったら通常の guarded create を実行する(旧 CLOSED Issue とは別 Issue になる点は既知事項として文書化)
B. **guarded adopt verb を新設** — marker 不在の legacy Issue に人間承認付きで provenance を mint し再リンク可能にする(新機能設計を伴う — amadeus-bugfix スコープを超える場合は amadeus-feature への切替をユーザー明示指示で行う規範に接続)
C. **read fallback の二重表現**(v1 優先・legacy fallback を恒久維持) — org.md Forbidden(互換シム禁止)に抵触するため非推奨
X. Other (please specify)

[Answer]: A

## 裁定の記録

- Q1 = A(復旧 verb なし・v1 統一+legacy デッドコード削除+#1534 は「復旧経路不要化」の文書化クローズ)。裁定者: ユーザー(AskUserQuestion 直接裁定、2026-07-26)。ソロモードのため選挙非実施。読み側 v1 統一自体は #1547/#1534 クロスレビュー 2/2 一致+org.md Forbidden 整合の既決扱いで質問対象外(既決照合済み)
- ユーザー承認: 2026-07-26T14:41:00Z(AskUserQuestion 回答「A: 復旧 verb なし」受領)
