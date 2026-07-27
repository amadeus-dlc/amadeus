# Code Summary — fix-1569-install-doc (260727-install-doc-mismatch)

上流入力(consumes 全数): requirements.md(FR-1〜FR-5 / NFR-1〜3 の実装結果を本書に記録)。設計ステージ成果物は scope SKIP により不在(degrade 正常系)— 実装は requirements.md と codekb 現在断面からスコープし、各変更は Issue #1569 へ遡及する(plan 参照)。

- 実装ブランチ: `fix/1569-install-doc-mismatch`(worktree `../fix-1569-install-doc`、origin/main = bafeccca8 起点)
- コミット: `770feddee` fix(plugin): align INSTALL.md copy target with CLI discovery root (#1569) / `b7f1d996b` chore(dist): regenerate harness distributions and self-install for #1569
- 実装者: amadeus-developer-agent(subagent)。conductor 裏取り再実行: `bun run dist:check` exit 0、t307 9 pass(2026-07-27 実測)

## 変更ファイル

| ファイル | 内容 | FR |
|---|---|---|
| `packages/framework/core/tools/amadeus-plugin.ts:277` | `export const PLUGIN_SOURCE_DIR_NAME = ".amadeus-plugin-src"` 新設、`pluginSourceRootOf`(:285)が参照 | FR-2 |
| `scripts/plugin-projection.ts:64,594-597` | 定数 import+installDoc copy 行のコピー先を `.amadeus-plugin-src/<name>/`(project root 相対)へ | FR-1, FR-2 |
| `tests/integration/t307-install-artifacts-classes.integration.test.ts:14,84-107` | 定数 import+リグレッションアサート3件(codex=folder-drop-auto / opencode=manual-only / claude=copy 行なし維持) | FR-5 |
| `docs/guide/19-plugins.md:183-186` / `19-plugins.ja.md:175-178` | EN/JA 対訳同期修正 | FR-4 |
| dist 6面 INSTALL.md + dist/self-install の amadeus-plugin.ts 投影12ファイル | 再生成(手編集なし)。claude 面 INSTALL.md 不変 | FR-3 |

## 実装判断

- 定数命名は近傍 idiom `export const PLUGIN_MANIFEST` に合わせ `PLUGIN_SOURCE_DIR_NAME`(Open question 1 の解決)。
- `harnessDir` 引数は installDoc 内で `manualComposeCommand` に継続使用のため整理不要と実測確定(Open question 2 の解決 — 計画の条件「未使用なら」に非該当)。
- 修正後 `scripts/plugin-projection.ts` に `.amadeus-plugin-src` の独立リテラル 0(定数参照のみ、grep 機械確認)。

## 落ちる実証(FR-5)

注入面 = 正本 `scripts/plugin-projection.ts`(t307 が正本を import することを注入前に実測)。旧文言へ一時復帰 → t307 が 7 pass / 2 fail(codex・opencode の新アサートが期待どおり赤)→ 即 revert → 9 pass / 0 fail。コミットへの残存なし。

## 検証(全 exit code 実測)

typecheck 0 / lint 0(既存 310 warnings、自変更ファイル指摘なし)/ dist:check 0 / promote:self:check 0 / plugin 系 17 テストファイル 128 テスト全 pass / `bash tests/run-tests.sh --ci` 全606ファイル PASS(Failed files: 0)。lcov: 追加実行行すべて hits > 0(amadeus-plugin.ts:277=59, :285=46 / plugin-projection.ts:594-597=22/342/4/8)— diff 追加行の未カバー 0(NFR-3)。

**NFR-1(挙動不変)の直接確認**: 定数値は旧 private リテラルと同一文字列 `".amadeus-plugin-src"`(`amadeus-plugin.ts:277` 実測)であり、`pluginSourceRootOf` は `join(hostRoot, PLUGIN_SOURCE_DIR_NAME)`(`:285` 実測)— 引数・結合順とも旧実装と同形のため解決値はバイト同一。discovery 実挙動は `.amadeus-plugin-src` 配置で discovery を実証する既存統合テスト t299/t302/t328/t338 の全 pass(full CI 内)で回帰確認済み(conductor 追記 2026-07-27、§12a iteration 1 Minor 是正)。

## 逸脱・申告事項

- **無し(要件逸脱ゼロ)**。ただし追加是正1件を申告: full CI 初回で t258-boundary-guard(出荷 core/tools が repo-only `scripts/` を参照しない境界契約)が、Step 1 で追加した定数コメント内の `scripts/plugin-projection.ts` トークンにより赤 → allowlist 追加ではなくコメント reword で是正(既決契約への機械的準拠、ガード趣旨に沿う)。reword 後 dist/self-install 再生成、full CI PASS。
- worktree の `bun install`(257 packages、lockfile 変化なし)はコミット対象外。
