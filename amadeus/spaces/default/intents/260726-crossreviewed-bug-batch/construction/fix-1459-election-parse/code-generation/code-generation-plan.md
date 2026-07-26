# Code Generation Plan — fix-1459-election-parse

上流入力(consumes 全数): requirements.md(inception/requirements-analysis。FR-4 が本 unit の正)。functional-design / nfr-design / infrastructure-design 各成果物は本スコープ(amadeus-bugfix、units-generation SKIP の degrade 構成)では生成されない — requirements.md の FR-4 受け入れ基準を直接の設計契約とする。

- 対象 Issue: #1459
- ブランチ: `fix/1459-election-parse`(origin/main 起点、worktree 隔離 builder)
- 方式: regression-first — Issue 再現の赤テスト固定 → 最小修正 → 緑 → 検証コマンド全再実行
- 患部・受け入れ基準: requirements.md FR-4 に記載(observed `1673c4332` の file:line)
- 検証: `bun run typecheck` / `bun run lint` / 関連テスト / dist 6+self-install 4 再生成+dist:check/promote:self:check
- PR: Issue 単位、日本語タイトル・本文、Closes #1459、マージは人間承認
