# ビルド手順 — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `construction/u1-watcher-actas-guard/code-generation/code-generation-plan.md`、`construction/u1-watcher-actas-guard/code-generation/code-summary.md`、`construction/u2-worktree-parallel/code-generation/code-generation-plan.md`、`construction/u2-worktree-parallel/code-generation/code-summary.md`

（両ユニットの `code-generation-plan.md` が宣言する正本・配布面の対応関係と、`code-summary.md` が記録する 11 コピー同期の実績から導出した。）

## 本プロジェクトのビルドとは何か

コンパイル成果物を作る工程は無い。TypeScript は Bun が直接実行し、シェルスクリプトはそのまま走る。ここでの「ビルド」は**正本から配布面を再生成して一致させること**を指す。

## 対象

本 intent が触る正本は `packages/framework/core/tools/team-up.sh` の1ファイル。これが 11 コピー（`dist/` の 6 ハーネス + セルフインストール 4 + 正本）へ投影される。

## 手順

```bash
bun scripts/package.ts        # dist/<harness>/ を再生成
bun run promote:self          # セルフインストールツリーへ反映
bun run dist:check            # 正本と dist の一致を検査
bun run promote:self:check    # 正本とセルフインストール面の一致を検査
```

`dist/` とセルフインストールツリーを直接編集しないこと（`project.md` Forbidden）。正本を直して再生成する。

## 検査

`dist:check` と `promote:self:check` はどちらもドリフトガードであり、不一致があれば非ゼロで落ちる。CI でも同じコマンドが走るため、ローカルで通らないものは CI でも通らない。
