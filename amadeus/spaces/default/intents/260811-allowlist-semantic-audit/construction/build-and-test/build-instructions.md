上流入力(consumes 全数): code-generation-plan.md / code-summary.md

# Build Instructions — 260811-allowlist-semantic-audit

Depth は Minimal のため、コマンドと環境変数のみを載せる。トラブルシューティング節は
Step 10 のビルドが実際に失敗した場合にのみ追加する(本 intent では失敗しなかった — 下記)。

対象は `code-summary.md` が列挙する変更ファイル(`tests/coverage-patch-gate.ts` /
`tests/allowlist-semantic-audit.ts` / 台帳 / テスト 4 本 / `tests/README.md`)であり、
`code-generation-plan.md` Step 9 が定める検証集合をそのまま実行する。

## 依存とビルド

| 手順 | コマンド |
|---|---|
| 依存インストール | `bun install --frozen-lockfile` |
| 生成物ビルド | `bun run build` |
| 型検査 | `bun run typecheck` |
| lint | `bun run lint` |

`bun run build` は `dist/` とセルフインストールツリーを再生成する。これらは source-only 境界により
未追跡のローカル生成物であり、**ビルド後に `git status --porcelain` が生成物由来の差分を出さないこと**
が検証条件である(`project.md` Mandated)。

## 環境変数

本 intent の変更が読む環境変数はない。台帳検査は `tests/coverage-patch-gate.ts` の
`--check` 経路にあり、patch gate 本体が使う `AMADEUS_PATCH_BASE_REF`(CI では
`origin/<base>`)以外の追加シームを持たない。

ローカルで `--check` を実行する場合、patch 判定はコミット済み diff と LCOV を突き合わせるため
先に `bun run coverage:ci` で `coverage/lcov.info` を生成しておく必要がある。

| 変数 | 用途 | 既定 |
|---|---|---|
| `AMADEUS_PATCH_BASE_REF` | patch 対象行の base | 未設定時は既定の merge-base 解決 |
| `TEST_TIME_FACTOR` | テスト timeout の基準値への乗算 | ローカル 1 / CI 2 |
