# Integration Test Instructions：B001 #395 方針確定

## 手順

mock provider の e2e は次で実行する。

```sh
npm run test:e2e:ci:mock
```

examples snapshot の統合検証は次で実行する。

```sh
npm run test:examples
```

差分の空白検査は次で実行する。

```sh
npm run diff:check
```
