# コード生成サマリー — pi-harness-foundation

## 変更内容

- `packages/framework/harness/pi/` にmanifest、onboarding、skill、question annexを追加した。
- harness identity/capability、mirror/plugin projection、package/promote registryへPiを登録した。
- extensionと4つのdriver resourceをclosed catalogで宣言し、source bytes由来のSHA-256をdescriptorへ記録した。
- 正規generatorから `dist/pi` とPi向けplugin projectionを生成した。

## 実装判断

- Piのproject trustはnative gateに委ね、trust storeを変更・自動承認しない。
- driverはPi native extension loaderへ登録せず、Amadeus内部child execution resourceとして投影する。
- authored sourceと配布物のbyte parity、path/case-fold/symlink/non-regular driftをfail-closedで検査する。

## テスト結果

- foundation referee: converged、tamperなし。
- `bun scripts/package.ts pi --check`: 成功。
- Pi cross-unit tests: 26件成功、0件失敗。
- `bun run typecheck`: 成功。

## 計画との差分

- child driver補助3ファイルが初回catalogから漏れていたため、cross-unit package checkの結果を受けてclosed catalogへ追加した。
