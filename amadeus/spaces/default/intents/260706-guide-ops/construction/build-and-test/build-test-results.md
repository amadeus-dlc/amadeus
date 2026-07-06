# Build and Test Results

Unit: guide-ops
実施日: 2026-07-06（UTC）
実施環境: engineer5 worktree（branch: eng5/issue-568-guide-ops、基点 origin/main = 620beb5e = PR #578 merge 後）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| repo 標準検証 | `npm run test:all` | pass（exit 0、ok 695 件） |
| record 構造検証 | AmadeusValidator（. 260706-guide-ops） | pass |
| 日本語残存（3 英語版） | `grep -P '[ぁ-んァ-ヶ一-龠]'` | 0 件 |
| H2 対一致（3 対 + index 対） | 見出し数比較 | 全対一致（6 / 5 / 6 / 4） |
| リンク解決（NFR-5、アンカー込み） | scratchpad の一時 checker（新章 6 ファイルへ拡張） | checked=198 broken=0 |
| help 掲載の無改変（NFR-1） | 5 block を help-output.txt と照合（subagent + stage reviewer 独立） | 完全一致 |
| 丸コピー禁止（NFR-2） | stage reviewer が上流 3 章を取得し突き合わせ（要約経由の制約明記） | 逐語一致 0 件（高確度判定） |
| 初見読者レビュー（NFR-4） | reviewer（Codex / GPT-5.5） | High 4 + Low 2 → 全件対応で合格 |

## 特記事項

- 変更は新設 6 ファイル + index 対（3 行移動 + 導入文 1 行の整合修正 = 申告済み）に閉じる（C-1。stage reviewer が git diff で確認）。
- 副産物: stage-protocol.md §5 と SKILL.md の persona 規定矛盾を発見し Issue #582 として起票済み（BR-8）。
- #576 の意味的接触（overview の Operation 記述更新）は engineer3 と申し送り済み — 00 章の 1 文が merge 後の follow-up 対象（本 Intent のファイルとは非接触）。
