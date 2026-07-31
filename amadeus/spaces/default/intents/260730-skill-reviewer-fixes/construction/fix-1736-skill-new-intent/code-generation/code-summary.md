# Code Summary — fix-1736-skill-new-intent(Bolt 1)

上流入力(consumes 全数): requirements.md(FR-1a〜1d の充足を本文で対照)。

## 結果

- コミット: `b1b89bf03` fix(skill): route new-intent confirmation through the orchestrate verb
- PR: https://github.com/amadeus-dlc/amadeus/pull/1753 — **マージ済み**(2026-07-30T13:46:51Z、スカッシュ)。#1736 は Closes キーワードで自動クローズ、着地は origin/main の正本 grep で実測確認済み。

## 変更ファイル(14)

- 正本5: packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide}/skills/amadeus/SKILL.md(FR-1a — ツール名トークンのみ変更)
- dist5+self-install3: `bun scripts/package.ts` + `bun run promote:self` 再生成(FR-1b — 手編集なし)
- 新規: tests/integration/t366-skill-new-intent-verb.test.ts(FR-1c — 27 pass、1 corpus + 13ファイル×2述語)

## 検証(exit code、builder 報告 bolt-1736-report.md より)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / t366 0(27 pass)/ t176 0(SDK 実行、85.19s)/ FR-1b AC grep 0件。PR CI 18本 pass。

## 落ちる実証

コミット後、claude 正本のみ旧文へ checkout → t366 exit 1(2 fail、失敗出力に file:line)→ 復元 → 27 pass(1セット完結、stash 不使用)。

## 逸脱

なし。promote:self が生成した scope-grid.json のキー順 churn(#1734 既知バグ)は本変更と無関係のため surgical に revert して PR から除外(builder 申告・PR 本文記載)。
