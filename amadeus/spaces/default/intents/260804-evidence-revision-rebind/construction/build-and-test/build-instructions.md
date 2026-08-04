# ビルド手順

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

## 対象と前提

`code-generation-plan.md` の Step 8・9 と `code-summary.md` の作成・変更ファイル一覧を入力とし、`evidence-revision-rebind` の TypeScript、GitHub Actions workflow、no-silent-drop 派生証跡を検証する。engine directive の `{unit-name}` は実在する Unit ディレクトリ `evidence-revision-rebind` に解決して参照する。

検証基準は再接地後の `origin/main` `ed89cbbb98f04430085d3582f53bed5f90f1b253` とする。正本は `packages/framework/core/`、`packages/framework/harness/`、`scripts/`、`tests/` であり、`dist/` と self-install 面は未追跡の生成物として扱う。

## 実行手順

1. `git fetch origin refs/heads/main:refs/remotes/origin/main` と `git rebase origin/main` で最終 base へ再接地する。
2. `bun run build` で manifest が発見する全ハーネスの `dist/` と self-install 面を再生成する。
3. `bun run source-only:check` で生成物が追跡境界を越えていないことを確認する。
4. rebase で到達不能になった adoption evidence を `bun scripts/no-silent-drop-evidence.ts rebind --target-revision <clean-HEAD>` で再バインドし、派生3ファイルだけを evidence-only commit にする。
5. `bun run typecheck`、`bun run lint`、`bun tests/complexity-gate.ts --check`、`bun run distribution:check`、`bun run coverage:ci` を実行する。
6. focused test、no-silent-drop gate、plugin conformance、隔離2回ビルドの再現性を個別に確認する。

## 合格条件

- build、型検査、lint、複雑度、distribution、source-only、隔離再現性、full coverage suite がすべて非0終了なしで完了する。
- build 前後で追跡対象の生成物差分を追加しない。
- adoption evidence の変更は許可された3ファイルだけで、validator は `ok=true`、`t413` は `10 pass / 0 fail`、reconcile は `REBIND_NOOP` へ収束する。
- 失敗を既存不具合や環境要因へ分類する場合は、未改変 base との失敗集合差分を証拠にする。自己比較は根拠にしない。
