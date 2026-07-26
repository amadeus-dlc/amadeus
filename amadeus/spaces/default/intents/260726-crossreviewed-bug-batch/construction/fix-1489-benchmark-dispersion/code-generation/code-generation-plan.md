# Code Generation Plan — fix-1489-benchmark-dispersion

上流入力(consumes 全数): requirements.md(inception/requirements-analysis。FR-1 が本 unit の正)。functional-design / nfr-design / infrastructure-design 各成果物は本スコープ(amadeus-bugfix、units-generation SKIP の degrade 構成)では生成されない — requirements.md の FR-1 受け入れ基準を直接の設計契約とする。

- 対象 Issue: #1489
- ブランチ: `fix/1489-benchmark-dispersion`(origin/main 起点、worktree 隔離 builder)
- 方式: regression-first — Issue 再現の赤テスト固定 → 最小修正 → 緑 → 検証コマンド全再実行
- 患部・受け入れ基準: requirements.md FR-1 に記載(observed `1673c4332` の file:line)
- 検証: `bun run typecheck` / `bun run lint` / 関連テスト / 配布対象外(dist 再生成不要)、両側実測(偽赤解消+検出力維持)fixture
- PR: Issue 単位、日本語タイトル・本文、Closes #1489、マージは人間承認
