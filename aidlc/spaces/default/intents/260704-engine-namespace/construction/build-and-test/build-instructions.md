# Build Instructions — 260704-engine-namespace

対象は改名されたエンジンファイル（Bun + TypeScript）と skill・docs の参照更新であり、コンパイル成果物を生成するビルドは存在しない。
ビルド相当の検証は型検査と lint である。
変更内容は code-generation の成果物（`../implicit/code-generation/code-generation-plan.md` と `../implicit/code-generation/code-summary.md`）を参照する。

## 依存関係の準備

```sh
npm install
```

Node.js、Bun、npm、mise が必要である。環境変数や設定ファイルの追加準備は不要である。

## ビルド相当の検証コマンド

```sh
npm run typecheck
npm run lint:check
```

## 検証成功の確認

- `typecheck` がエラー 0 で終了する（改名後の import 連鎖が解決できることの確認を兼ねる）。
- `lint:check` が違反 0 で終了する。

## トラブルシューティング

- 旧パス（`.agents/aidlc/tools/aidlc-*.ts`）を参照するローカル設定やエイリアスが残っている場合は、`.agents/amadeus/tools/amadeus-*.ts` へ更新する。
- hook が旧パスを指してエラーになる場合は `.claude/settings.json` の hook 参照が本 branch の内容であることを確認する。
