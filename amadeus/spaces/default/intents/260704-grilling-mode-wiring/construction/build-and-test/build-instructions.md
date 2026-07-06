# Build Instructions — 260704-grilling-mode-wiring

対象は skill markdown と dev-scripts（Bun + TypeScript）であり、コンパイル成果物を生成するビルドは存在しない。
ビルド相当の検証は型検査と lint である。
変更内容は code-generation の成果物（`../implicit/code-generation/code-generation-plan.md` と `../implicit/code-generation/code-summary.md`）を参照する。

## 依存関係の準備

```sh
npm install
```

Bun、Node.js、npm が必要である（`aidlc/spaces/default/memory/project.md` の必須ツールに準拠）。
環境変数や設定ファイルの追加準備は不要である。

## ビルド相当の検証コマンド

```sh
npm run typecheck
npm run lint:check
```

## 検証成功の確認

- `typecheck` がエラー 0 で終了する。
- `lint:check` が違反 0 で終了する。

## トラブルシューティング

- `bun: command not found` の場合は mise で Bun を導入する（`mise trust` → `mise install`）。
- 型エラーが `dev-scripts/grilling-wiring.ts` に出る場合は、本 Intent の変更範囲なので修正対象である。それ以外のファイルの型エラーは無関係の回帰として記録する。
