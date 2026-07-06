# Unit Test Instructions：B001 #395 方針確定

## 手順

単体評価と契約評価は次で一括実行する。

```sh
npm run test:it:all
```

このコマンドには、template、lint、public type file、TypeScript complexity、Amadeus 契約、`aidlc-state.md`、validator、Domain Map と Context Map、skill 昇格、host 配線、LLM runner、LLM provider、Index 生成、workspace 移行の評価が含まれる。
