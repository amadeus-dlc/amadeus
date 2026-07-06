# Build and Test Results

Unit: guide-intro
実施日: 2026-07-06（UTC）
実施環境: engineer5 worktree（branch: eng5/issue-533-guide-intro、基点 origin/main = 3366cd69 = PR #563 merge 後）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| repo 標準検証 | `npm run test:all` | 初回 exit 1（rename-leftovers 検査 (e) が 00 章の aidlc 言及 2 行を検出）→ #526 出典の付記（英日）で解消 → 再実行 pass（exit 0、ok 636 件） |
| record 構造検証 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-guide-intro` | pass |
| 日本語残存（4 英語版） | `grep -P '[ぁ-んァ-ヶ一-龠]'` | 0 件 |
| H2 対一致（4 対） | 見出し数比較 | 全対一致（4 / 6 / 5 / 7） |
| リンク解決の機械検査（NFR-5、アンカー込み） | scratchpad の一時スクリプト（新設 8 + 追記 3 対） | checked=156 broken=0 |
| 実測駆動（NFR-1） | 掲載全 block の byte 照合（stage reviewer が独立再照合） | 全一致 |
| 丸コピー禁止（NFR-2） | stage reviewer が上流 3 章を取得し文単位突き合わせ | 逐語一致 0 件（合格） |
| 初見読者レビュー（NFR-4） | reviewer（Codex / GPT-5.5） | High 4 + Low 3 → 全件対応で合格 |
| parity 対象外確認 | `npm run parity:check` | exit 0、docs/guide 言及 0 件 |

## 特記事項

- rename-leftovers の初回 fail は、上流命名（aidlc prefix）を説明する正当な言及が検出されたもの。検出器の allow 設計（rename 経緯の記述だけ許す）に沿って #526 出典を付記する修正で解消した（allowlist.json は変更していない = C-1 維持）。
- 実測環境（隔離 workspace guide-ws/my-app）は独立 git リポジトリで、本番 amadeus/ に触れていない。
