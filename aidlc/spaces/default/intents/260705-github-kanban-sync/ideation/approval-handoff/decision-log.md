# Decision Log — Ideation（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](../scope-definition/scope-document.md)

Ideation フェーズで確定した判断の一覧である。詳細な経緯は各ステージの questions ファイルと audit を参照する。

## 確定判断

| # | 判断 | ステージ | 根拠 |
|---|---|---|---|
| D1 | 主課題 = 担当状況の不明、従課題 = 承認待ち滞留の検知 | intent-capture | Q1 = E |
| D2 | kanban は Maintainer 専用の一方向鏡。正はローカル成果物 | intent-capture | Q2 = A、project.md へ learning 永続化済み |
| D3 | ホスト識別を表示項目に含める（audit shard 名由来） | intent-capture | Q3 追加要望 |
| D4 | 実装範囲は ①台帳整備 + ②手動 sync + ③hook 結線。④ Actions 補完は後続 | intent-capture / scope-definition | Q5 = A |
| D5 | Build 採用（表示は純正 Projects v2、sync だけ自作）。外部 SaaS 不採用 | market-research | build-vs-buy.md |
| D6 | 依存は gh CLI のみ。書き込みは `gh api graphql` の mutation batch | market-research | Q3 = A、learning c5 |
| D7 | このリポジトリ内限定の開発ツール。Amadeus 本体には実装しない | market-research | Maintainer 指示、learning c3 |
| D8 | 暫定機構として軽量実装（堅牢化・通知・統計を作らない） | feasibility | Maintainer 指示、learning c2 |
| D9 | board は org project + amadeus repo リンク。全 Intent 掲載 + Done 列 + auto-archive | feasibility | Q1 / Q2 |
| D10 | scope 不足は sync 側で明示検知。flush 失敗は drop 記録 + 次回回復のみ | feasibility | Q3 / Q4 |
| D11 | `intents.json` へ任意フィールド `issues: [<番号>...]` を追加（**Maintainer 承認済み**） | scope-definition | Q3 = A、DECISION_RECORDED |
| D12 | Claude セッションが P1〜P3 を直列担当。mob なし | team-formation | Q1 = A |
| D13 | 列 = phase 4 + Awaiting Approval + Done（承認待ち優先）。カード 8 フィールド + Table view 併用 | rough-mockups | Q1 / Q2、reviewer READY |
| D14 | ゲート運用: 内容質問は自己回答、ゲートはワンクリック承認、レビューは PR で人間 | team-formation 以降 | Maintainer 指示（2026-07-05） |

## 未解消（Construction 前の人間操作）

- `gh auth refresh -s project`（raid-log.md I01）
- amadeus-dlc org での project 作成権限の確認（feasibility open question）
