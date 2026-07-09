# Review — u709-t92-skip-guard (#709)

## Review

READY

- 診断なし。差分は `tests/integration/t92.test.ts`(+17/-1)と record doc(code-summary.md 新規)のみ。本番コード(`amadeus-sensor-type-check.ts`)・`dist/`・セルフインストールは無変更で FR-709-1〜4 の「テスト専用に閉じる」NFR を満たす。
- ガードは test 44 単独に閉じている(Group N の1テストのみ改変、他 describe/test は無変更)。
- アサーション本体(`const proj = makeProj();` 〜 `}, 30000);`)は origin/main と origin/fix/... で完全に同一(diff で確認済み、`test(...)` → `test.skipIf(...)(...)` の関数呼び出し形の変化のみで本体行は無改変)。
- skip 理由文字列は明確かつ `#709` を明示: `"repo-pinned tsc not installed (bun install not run) — pinned exit-2 classification is unmeasurable; see #709"`。
- 前提条件 `existsSync(join(REPO_ROOT, "node_modules", ".bin", win?"tsc.cmd":"tsc"))` は本番センサー `resolveTscLauncher`(amadeus-sensor-type-check.ts:182-201)の判定ロジック(`node_modules/.bin/<candidateNames>` の `existsSync`、Windows は `tsc.cmd`→`tsc.exe`→`tsc` の順で探索)と整合。fixture 自体が `REPO_ROOT/node_modules` をそのまま symlink するため(t92.test.ts:1180)、`.bin/tsc` の存在確認で十分 — symlink はディレクトリ全体を張るので `.bin/tsc` の有無がそのまま実効判定になる。Windows では `tsc.exe` 探索を含まないが、resolveTscLauncher 自身も `tsc.cmd` を最優先で探すため、bun ネイティブインストールで通常生成される `.cmd` ラッパーで一致する(pnpm 特有レイアウトは本リポジトリの package manager ではない)。
- CI は `bun install --frozen-lockfile` を各ワークフロー(`.github/workflows/ci.yml:34,70`)で実行するため、CI 環境では `node_modules/.bin/tsc` が実在し `TEST44_SKIP_REASON` は常に `null` → test 44 は skip されず従来どおり厳密ピンを検証する。CI で静かに skip される経路はない。
- `test.skipIf(boolean)` は bun:test の実 API(`bun-types/test.d.ts:528-538`)と一致し、`TEST44_SKIP_REASON !== null` は真偽値。
- Evidence(code-summary.md)の red(未 install、exit 1、test 44 のみ失敗)/ skip-green(未 install、1 skip、exit 0)/ executed-green(install 済み、45 pass 0 skip、test 44 は `-t` 単体フィルタで 1 pass 3 expect 実評価)は diff の実装と bun:test の skipIf 挙動から見て整合。

## 所見（findings）

なし
