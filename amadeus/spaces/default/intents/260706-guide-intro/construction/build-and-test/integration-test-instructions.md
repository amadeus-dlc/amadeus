# Integration Test Instructions

Unit: guide-intro（Test Strategy: Minimal）

## 検証対象と手順

文書新設が repo 全体の契約（typecheck / lint / contracts / parity / wiring / evals / engine-e2e / diff）と矛盾しないことを、repo 標準検証で確認する。

```sh
npm run test:all
```

## 結果

初回 fail 1 件（rename-leftovers の検査 (e) が 00 章の `aidlc` 言及 2 行を検出）→ 検出器の allow 設計（rename 経緯の記述だけ許す）に整合する修正（#526 出典の付記、英日）で解消し、再実行 pass（exit 0）。詳細は [build-test-results.md](build-test-results.md) を参照する。
