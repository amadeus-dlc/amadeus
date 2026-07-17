# RAID Log — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`。前 intent(260716-installer-new-harnesses)RAID の現存再実測(c2): 引き継ぎ対象の open Issue なし — npm publish PENDING は release ライフサイクル事項で本 intent 非関連(2026-07-16 実測)。

## Risks

| # | リスク | 緩和 |
|---|---|---|
| R-1 | HUMAN_TURN 相当イベントが plugins に存在しない可能性(docs 一覧に該当なし — 実測済み) | 公開ソース直読で確定 → 不在なら該当面を根拠付き未対応維持(C-1 が許容)。presence 系は delegate 運用で既に代替可能 |
| R-2 | payload 語彙の版間変動(opencode は活発に開発中) | 配線面を最小に保つ+VERSION 記録+機能単位表に検証時点を明記 |
| R-3 | tool.execute.after の tool 名語彙が amadeus の期待(Write/Edit 等)と不一致 | external-seam-vocab-measurement: 正規化写像+写像不能時の降格ルールを design に含める(Cursor 工程0と同手法) |

## Assumptions

- A-1: opencode の plugins 自動ロード(docs 明文)は dist 配布の `.opencode/plugins/` にも適用される(仮説 — RE で配布レイアウト整合を確認)

## Issues

- なし(0件 — 起票済み関連 Issue は #1049 本体のみ)

## Dependencies

- D-1: @opencode-ai/plugin 公開ソースへの到達性(npm/GitHub — RE 段で実照会)
