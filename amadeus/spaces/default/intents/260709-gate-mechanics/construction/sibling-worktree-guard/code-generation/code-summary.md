# Code Summary — sibling-worktree-guard(#670)

> ビルダー: amadeus-developer-agent(worktree `.claude/worktrees/bolt-670-sibling-guard`、ブランチ `bolt/670-sibling-worktree`、origin/main ベース)。コミット: `35b6b93f58434ea653d5bf5e1bdfe3b34018b47c`。

## 変更ファイル

- `packages/framework/core/tools/amadeus-worktree.ts` — 正本。`assertNotSiblingWorktree` を `resolveWorktreeAnchor` に置換し、`handleCreate` / `handleMerge` / `handleDiscard` の3呼び出しを更新(FR-2.1/2.2/2.3/2.5)
- `.claude/tools/` `.codex/tools/`(promote:self)+ `dist/{claude,codex,kiro,kiro-ide}`(package.ts)— 同一コミットで再生成(NFR-2)
- `tests/e2e/t06.test.ts` — 新契約 T1〜T6 へ全面書き換え(NFR-5 の契約反転)
- `tests/harness/fixtures.ts` — `seedWorkspaceShell` export(sibling record シード用の既存ヘルパー再利用)
- `tests/.coverage-registry.json` — 再生成(t06 が merge/discard の covering file に追加。ratchet 変化なし)

## 主要実装決定

- main checkout から実行時はバイト同一の従来挙動(canonicalise パスを出力へ漏らさない)— 既存 e2e fixture 回帰ゼロ
- sibling worktree から実行時は git 操作 cwd と wtPath を main checkout(`dirname(git-common-dir)`)へアンカー
- 真のネスト(`<main>/.amadeus/worktrees/bolt-*` 内からの実行)は pre-audit で拒否維持、エラー文面は新文面へ置換(互換シムなし)
- 監査シャードの所属(pd)は不変

## テストカバレッジ / 落ちる実証(AC-2d)

- 修正前(旧実装 + 新 t06): exit=1、fail 4(T1 sibling create / T3 真ネスト新文面 / T4 sibling merge / T5 sibling discard)、pass 2(T2 main 回帰 / T6 list 不変)
- 修正後: exit=0、6 pass / 0 fail
- 真ネスト拒否(T3)は修正後も「拒否=緑」で維持(過剰緩和なし)

## 検証(最終変更後の実測 exit code)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0(エラー0、既存警告のみ) |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0(271 files / 3954 assertions / 0 failed) |

補足: CI 初回に coverage registry の stale 検出1件 → `bun tests/gen-coverage-registry.ts` で再生成後 PASS(t06 の covers claim 追加に伴う正常な再生成)。

## レビュー是正履歴

- **iter2(claude-engineer-4 NOT-READY、head cb4c8106c)**: read/write の anchor 非対称 — write 経路は main checkout へ anchor するのに `handleList` の boltsDir は raw pd 基準のままで、「sibling から create → 同 sibling から list」が空配列になる blocker(レビュアーが独立再現)。是正: 純 helper `resolveMainCheckout`(read-only、拒否なし)を抽出して write/read が共有、handleList の boltsDir を write と同じ `worktreeBaseDir` 規則で解決(P7 roof・非 git は pd 基準で不変)、list へ true-nest 拒否は持ち込まず Bolt worktree 内 list 成功を T7 で明示 assert、T6 を「sibling/main 双方の list が同一 slug/path/branch を返す」内容 assert に強化。落ちる実証: 是正前 T6/T7 赤(空配列)→ 是正後 7 pass。origin/main rebase 済み(競合なし)。

## 計画からの逸脱

1. t06 fixture に state file シード追加(t02 と同じ既知手法 — active-intent カーソル解決のため)
2. `seedWorkspaceShell` の export + coverage registry 再生成(既存 private ヘルパーの再利用。本番コードへのテスト分岐ではない)
3. dist 再生成を緑実証の前に前倒し(e2e が dist 側バイナリを spawn する構造のため。同一コミット同梱は計画どおり)
