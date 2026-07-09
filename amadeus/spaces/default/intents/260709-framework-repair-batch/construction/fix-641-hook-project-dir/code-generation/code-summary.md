# Code Summary — fix-641-hook-project-dir

> Bolt: `fix-641-hook-project-dir` / Issue: [#641](https://github.com/amadeus-dlc/amadeus/issues/641)
> Branch: `bolt/fix-641-hook-project-dir`(base: origin/main `f27bcb9e2`)/ commit `7a20ee8c8`(未push、PR未作成)
> Worktree: `/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.claude/worktrees/agent-a5bb6c2f39960db6a`

## 変更ファイル

- `packages/framework/core/tools/amadeus-lib.ts`(正本)— `hasWorkspaceMarker`/`findWorkspaceMarkerAncestor` ヘルパー新設、`resolveProjectDirFromHook` の env チェック直後・script-path 逆算の前に新ルング挿入
- 生成複製6ファイル(`.claude/`・`.codex/`・`dist/{claude,codex,kiro,kiro-ide}/`、package.ts + promote:self で同期)
- `tests/unit/t202-hook-project-dir-worktree-marker.test.ts`(新設)— 赤先行回帰 + 非退行スイート(5ケース)
- `tests/unit/t07-hook-audit-logger.test.ts` — `fire()` spawn ヘルパーに `cwd: p` を固定(下記逸脱3)
- `tests/unit/gen-coverage-registry.test.ts` + `tests/.coverage-registry.json` + `tests/.coverage-ratchet.json` — 新テストのカバレッジ台帳登録(プロジェクト自身のジェネレータで再生成)

## 赤先行実証(NFR-4)

worktree fixture ケースが修正前に赤(main を返す/worktree 期待)を実測 → 修正後 t202 5/5 pass。他4ケース(env 優先・script-path 逆算・cwd probe 等の非退行)は修正前から pass = 既存経路の非退行を固定。

## 検証結果(実測 exit code)

- `bun run typecheck` → 0 / `bun run lint` → 0(警告は既存・touched files ゼロ)
- `bun run dist:check` → 0 / `bun run promote:self:check` → 0
- `bash tests/run-tests.sh --ci` → 1 — t92.test.ts の1アサーションのみ。**ベースライン検証済み**(自変更を stash して同一失敗をバイト一致で再現)。正体は #657 で、PR #679 が修理済み(未マージ)。#679 マージ後に本ブランチの CI は全緑になる見込み

## 計画からの逸脱

1. テスト命名は既存規約に従い `t202-hook-project-dir-worktree-marker.test.ts`(t201 の次番)
2. 新テスト追加に伴うカバレッジ台帳(ratchet)の機械的再生成 — 既存 CI ガードの要求で、意図的逸脱ではない
3. `t07-hook-audit-logger.test.ts` の `fire()` が cwd 未指定で実フックを spawn しており、テストランナー自身の dev-repo cwd(実マーカー保持)が新ルングに拾われて1件退行 → `cwd: p` を固定。Claude Code の実際のフック起動(cwd = project/worktree root)と一致する現実的な是正であり、fixture 側の意図した解決は不変

## 制約遵守

hook consumer 11ファイルは無変更(解決関数内に閉じた外科的修正)。互換シム・opt-out トグルなし。
