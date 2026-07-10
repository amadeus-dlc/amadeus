# Code Summary — u719-kiro-stale-hooks(fix #719)

> 実装: amadeus-developer-agent(worktree 隔離)。Bolt ブランチ: `bolt/719-kiro-stale-hooks`(HEAD `c6e1b504b`、conductor が push)。

## 変更ファイル(9 files、+11 / -8)

- **削除 7 件**: `packages/framework/harness/kiro/hooks/amadeus-{audit-logger,log-subagent,runtime-compile,session-end,session-start,stop,sync-statusline}.kiro.hook`(FR-1.1。`amadeus-kiro-adapter.ts` は残存)
- **`packages/framework/harness/kiro/manifest.ts`**(2 +/-): `authoredExempt` から `/^hooks\/[^/]+\.kiro\.hook$/` を除去(FR-1.2)。残り 2 regex は維持。直上コメントは残存 2 件を正確に記述しており無修正
- **`tests/smoke/t148-kiro-file-structure.test.ts`**(10 +): 再混入ガード test を 1 本追加 — source(`harness/kiro/hooks/`)と dist(`dist/kiro/.kiro/hooks/`)の両方で `.kiro.hook` 0 件を assert。source assert には #719 根拠コメント付き

## 主要な実装判断

- dist / self-install に生成差分なし — stale 7 件が元々未出荷であったことの追加実証(`bun scripts/package.ts` + `promote:self` 実行後も差分ゼロ)
- リグレッションテストは新規ファイルを作らず既存 t148 へ追加(reuse inventory、inception ガードレール準拠)
- kiro-ide は source・dist とも完全無変更(FR-3、`git diff origin/main --stat -- dist/kiro-ide/` 空で実証)

## 落ちる実証(NFR-1 / FR-1.3、すべて実測 exit code)

| # | 手順 | 結果 |
|---|---|---|
| (i) | `dist/kiro/.kiro/hooks/` へ `zz-inject-test.kiro.hook` 注入 → `bun run dist:check` | **exit 1**(`ORPHAN in dist: kiro/.kiro/hooks/zz-inject-test.kiro.hook`)— exemption 除去により ORPHAN 検出が生きた |
| (ii) | 注入除去 → `bun run dist:check` | **exit 0** 復帰 |
| (iii) | source へ `zz-red-proof.kiro.hook` 作成 → `bun test t148` | **exit 1**(新 assert が fail、10 pass / 1 fail)→ 削除で **exit 0**(11 pass / 0 fail) |

## 検証(最終変更後、実測 exit code)

| command | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0(warning 17 / info 9 は既存、error 0) |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0(277 files / 4026 assertions / 0 failed) |
| `git diff origin/main --stat -- dist/kiro-ide/` | 空(byte 不変) |

## deslop

t148 新 test の説明コメントを 6 行 → 4 行に圧縮(挙動不変)。manifest 変更は単一 regex 除去のみで slop なし。

## プランからの逸脱

なし(7 Steps すべて完了)。Step 2 の付随コメント更新は「実態とずれる場合のみ」の条件が不成立のため無修正(残存 2 regex を正確に記述済み)。
