# Integration Test Instructions：implicit

## 手順

steering と event-storming の e2e（mock provider）を実行する。

```sh
npm run test:e2e:ci:mock
```

初回生成（initial）と再実行（rerun）の 4 モードが含まれる。
examples snapshot の統合検証（validator、provenance、invariants、generation plan）は次で行う。

```sh
npm run test:examples
```
