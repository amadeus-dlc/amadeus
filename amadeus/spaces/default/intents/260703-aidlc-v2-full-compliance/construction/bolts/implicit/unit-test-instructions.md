# Unit Test Instructions：implicit

## 手順

検証入口ごとの実行は次で行う。

```sh
npm run test:it:aidlc-state        # aidlc-state.md parse 契約
npm run test:it:amadeus-validator  # workspace と Intent record の検証
npm run test:it:index-generate     # intents.md 生成の決定論性と整合
npm run test:it:migrate-workspace  # 一括移行の結果と validator pass
npm run test:it:amadeus-templates  # skill templates の契約
```

一括実行は次で行う。

```sh
npm run test:it:all
```
