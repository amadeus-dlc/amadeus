# コード生成サマリ — remove-team-up

Depth: Minimal。units-generation SKIP。Intent のみからスコープ。

## 変更ファイル

- 削除: `packages/framework/core/tools/team-up.sh`、`team-up-codex-safety-wait.ts`、`team-msg.sh`
- 削除: 名前付き `tests/**/*team-up*`、`t266-team-launcher-prerequisites`、`t267-clean-env-team-mode`、safety-wait fixture、`tests/integration/t-team-msg.test.ts`
- 変更: `amadeus-utility.ts` doctor 修復、`t226`、Team Mode / messaging / Codex / glossary 対訳、`AGENTS.md` タイムアウト注記、test-time-factor allowlist
- 追加: `tests/unit/t-remove-team-up-absence.test.ts`
- 生成: `bun run build` / `promote:self`（手編集なし）

## 判断

- FR-3 は縮退ではなく削除。
- FR-7: `team-msg.sh` と `t-team-msg` を削除。mint 分類器の `[team-msg ` 接頭辞は過去ログ用に残す。
- `pr-convergence-report.md` は PR 未作成のため CLI 未実行。手書きは禁止（BR-U2-7）。pr-convergence 段で発行する。

## 検証

- `t-remove-team-up-absence` / `t226` / `t414` glossary: 54 pass
- `bun run typecheck`: 成功
- `bun run lint`: 既存警告のみ（baseline）
- `git ls-files '*tools/team-up.sh'`: 空。self-install `.claude/tools/team-up.sh` なし
