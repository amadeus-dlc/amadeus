# Scope 文書（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)

## In-scope

1. **段階 ①: 台帳整備** — `intents.json` の各 entry に任意フィールド `issues: [<番号>...]` を追加し、既存 entry を遡及補完する。**Maintainer 承認済み**（scope-definition-questions.md Q3、decision 記録済み）。無い場合は空扱いとし、既存の読み手（エンジン、validator、既存スクリプト）に影響しない追加的変更とする。
2. **段階 ②: 手動 sync** — `dev-scripts/kanban-sync.ts`。全 Intent（default space）の `intents.json` と `aidlc-state.md` をスキャンし、org project（amadeus repo にリンク）へ冪等反映する。この時点で board が埋まった状態を人間が確認する。
3. **段階 ③: hook 結線** — PostToolUse でのローカルキュー書き込みと Stop / SessionEnd での flush。リポジトリローカルの hook 設定として結線する。

段階ごとに別 PR とする。

## Out-of-scope

| 項目 | 理由 | 扱い |
|---|---|---|
| ④ GitHub Actions による merge 後の整合回復 | PAT / GitHub App 管理が必要になり、暫定機構の軽量方針（C07）に反する | 後続 Intent |
| statusline への同期遅延表示 | 鮮度フィールドで遅延を可視化できる | 必要になったら後続 |
| 双方向 sync（board 編集のローカル反映） | 正はローカル（C01）。鏡は一方向を維持 | 恒久的に対象外 |
| 他 workspace / 他 repo の Intent 掲載 | 当面 default space だけで価値が成立する | 後続判断 |

## MoSCoW

| 区分 | 項目 |
|---|---|
| Must | カードと列表示、カードフィールド（担当エージェント、ホスト、worktree、scope、Issue）、Issue / PR リンク、鮮度表示、冪等 sync、hook 結線 |
| Should | completed の auto-archive 設定 |
| Won't（暫定機構のため） | 確認時間短縮の計測、通知系、統計、リトライ戦略の作り込み |

## 価値ストリーム

`aidlc-state.md` / `intents.json` の更新（エージェント作業）→ hook がキュー書き込み → flush が board へ冪等反映 → Maintainer が board で並行状況と承認待ちを一覧 → ゲート承認・並行可否判断が速くなる。
