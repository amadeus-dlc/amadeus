# Integration Test Instructions

Unit: persist-cid-metamain（Test Strategy: Minimal）

## 対象

エンジン全体との統合は、既存の決定論的統合検証で確認する。

```sh
npm run test:it:engine-e2e   # CLI 挙動の退行なし（B002 の FR-2.3 を含む）
npm run test:all              # repo 標準検証（全 eval・lint・parity・contracts を含む）
```

## 観点

- import.meta.main ガード追加後も、engine の全 CLI 経路（orchestrate / state / sensor 群 / swarm / validate）が従来どおり動くこと。
- 新形式 cid marker が §13 の gate ritual（surface → persist）を壊さないこと（stage-protocol.md §13 の契約記載も新形式へ更新済み）。

## 結果

すべて pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
