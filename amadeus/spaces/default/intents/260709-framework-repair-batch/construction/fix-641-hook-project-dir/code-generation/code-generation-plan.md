# Code Generation Plan — fix-641-hook-project-dir

> Bolt: `fix-641-hook-project-dir` / Issue: [#641](https://github.com/amadeus-dlc/amadeus/issues/641) / 要件: FR-641(requirements.md)
> 対象正本: `packages/framework/core/tools/amadeus-lib.ts` の `resolveProjectDirFromHook()`。複製先は生成・昇格で同期。

## 設計方針(実測済みコードに基づく)

現状の4段フォールバック(amadeus-lib.ts:240-259): (1) `CLAUDE_PROJECT_DIR` env → (2) script-path 逆算(`<project>/<harness>/hooks/` から導出) → (3) cwd に既知 harness dir があれば cwd → (4) cwd。worktree セッションではフックファイルが launch dir(main)側にあるため (2) が main に収束し、engine(cwd=worktree)が書く record dir と分岐、human-presence gate が誤拒否する(#641)。修理(Q4=A、FR-641):

- 新ルング「マーカー付き cwd 優先」を (1) と (2) の間に挿入する: `process.cwd()` またはその祖先ディレクトリに amadeus ワークスペースマーカー(`amadeus/` ディレクトリ **かつ** 既知 harness dir 配下の `tools/`(例 `.claude/tools/`)の組)が存在する場合、そのディレクトリを採用する
- env チェックの最優先、およびマーカー不在時の既存フォールバック(script-path 逆算 → cwd probe → cwd)は変更しない(FR-641 が明示)

## Steps

- [ ] Step 1: 回帰テスト(赤)を先に書く — worktree 構成 fixture(`<main>/` に amadeus/ + .claude/tools/ + .claude/hooks/、`<main>/.claude/worktrees/<name>/` に amadeus/ + .claude/tools/)を一時ディレクトリに作り、cwd=worktree・importMetaUrl=main 側 hooks のスクリプトパス・env 未設定の条件で `resolveProjectDirFromHook()` が worktree を返すことを検証する。修正前は main に収束して不一致(赤)であることを実測記録する(NFR-4)
- [ ] Step 2: `packages/framework/core/tools/amadeus-lib.ts` にマーカー探索(cwd から祖先方向へ、ファイルシステムルートまで)を実装し、env の直後・script-path 逆算の前に挿入する
- [ ] Step 3: 既存フォールバックの非退行を確認 — 非 worktree(通常セッション)fixture で従来と同じ解決結果になることをテストで固定する(env 優先・script-path 逆算・cwd probe の各経路)
- [ ] Step 4: `bun scripts/package.ts` + `bun run promote:self` で複製先同期、`git diff` で確認
- [ ] Step 5: 検証コマンド一式: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`

## 制約

- hooks は`resolveProjectDirFromHook` の消費者(amadeus-mint-presence.ts 等11フック)側の変更をしない — 解決関数内の修理に閉じる(bugfix スコープの外科的変更)
- 互換シム禁止(NFR-3): マーカー優先は正しい新挙動への置き換えであり、旧挙動の温存分岐を追加しない
- 正本→生成物の同期を同一コミットに含める(NFR-1)
