# コード生成サマリー — pi-distribution-installation

## 変更内容

- setup `HarnessName`、`.pi` layout、reporter、fresh/update flowへPiを追加した。
- root `package.json` の `private: true` を保持し、closed Pi Package resource metadataを追加した。
- `scripts/pi-package.ts` にsingle candidate catalog、SHA-256、local/git source identity、drift検査を実装した。
- Pi N→N+1 update、retired resource、same-version no-op、target package canary testsを追加した。
- retired owned fileはactual MD5が旧manifestと一致する場合だけ削除し、modified fileを保持するよう補正した。

## 実装判断

- setup viewとPi Package viewはauthored manifest由来の同一candidate bytesを参照する。
- setup payloadにroot package metadataを含めず、target `package.json`を変更しない。
- formal git identityはcredential-free URLとfull immutable commit、local identityはclean full revisionだけを受理する。

## テスト結果

- referee: converged、tamperなし。
- setup unit/integration: 327件成功。
- Pi targeted: 27件成功。主checkout再検証: 30件成功、0件失敗。
- `bun scripts/package.ts pi --check`: 成功。
- `bun run typecheck`: 成功。

## 計画との差分

- cross-unit検証で、既存transaction coordinatorのretired owned file判定にactual digest条件が欠けていることを検出した。既決contractどおりpredicateと回帰testだけを補正し、他のtransaction algorithmは変更していない。
