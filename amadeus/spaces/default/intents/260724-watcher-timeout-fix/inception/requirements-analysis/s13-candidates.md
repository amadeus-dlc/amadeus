# §13 学習候補(requirements-analysis, 260724-watcher-timeout-fix)

## 提案: 0件

## 検討した候補と不採用理由

- **選挙 record path を実在確認せず断定転記した→product-lead レビューで捕捉→是正**: この欠陥形状は既存 cid:requirements-analysis:mechanism-cite-verify-at-draft(機構引用は実在確認してから書く)・cid:requirements-analysis:agmsg-git-evidence-split(git検証可能な事実とagmsg出典の事実を分離)で完全にカバーされている。新規ノルムには当たらず、既存ノルムの適用漏れ(私の実行時ミス)をレビューが正しく捕捉した好例。
- **票数・GoAの verbatim 照合と留保転記漏れ(E-WTFRA2 e5)の是正**: 既存 cid:requirements-analysis:reservation-transcription-count-check(件数照合+per-voter 逐語照合)でカバー済み。product-lead reviewer がこの照合手法を正しく適用して検出した。
- **敗案(D=seam先行追加)の妥当部分(落ちる実証)を勝案(C)へ畳み込む複数票留保の実例**: GoA スケール運用(留保転記)で既に扱える。新規性は低い。

## 実測根拠

- product-lead レビュー: iteration 1 REVISE(C1)→ 是正 → iteration 2 READY(選挙裁定・票数・GoA・留保・file:line すべて leader worktree record.md 直読で一致確認)。
- 選挙 record: leader worktree の `260724-e-wtfra1/record.md`・`260724-e-wtfra2/record.md` を直読照合済み。
