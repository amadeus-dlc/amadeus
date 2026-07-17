# Re-scan — 260716-covci-flake(2026-07-16)

| 項目 | 値 |
|------|----|
| 手法 | 既存 CodeKB に対する diff-refresh(c1、rescan-base-ancestry) |
| base | `fb1fe079032`(直前 re-scan の observed。祖先性 exit 0・距離13で最小。main 側 5761e65ce は自 HEAD 非祖先につき除外) |
| observed | `e86c4da1d0c` |
| 区間 | 13コミット — record/audit+#1088 ミラーのみ。run-tests 面の変更ゼロ |

## フォーカス面(Issue #1085 — coverage:ci 間欠 FAIL)

- --ci は e2e 非実行(run-tests.ts:187-192)— 「e2e 2 fail」は実失敗なら機構上不成立(e3 指摘の裏取り)
- 失敗計上: .meta → aggregateTierResults(:465-479)、resultsDir は run ごと mkdtemp(:323/:327)で交差汚染経路なし
- SUMMARY に per-scope 失敗表は不在(:900-925)— スコープ帰属の出所候補は入れ子 spawn のストリーム `--- FAIL:` 行の誤計上が最有力
- 詳細は intent record の inception/reverse-engineering/scan-notes.md
