# Tech Stack Decisions — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)。

## 決定

- TS-U4-1: smoke は bun test(既存4層ランナーの smoke 層)— 新規テストフレームワーク・ランナーを導入しない(reuse inventory)
- TS-U4-2: U1 の TS-U1-1〜5 継承

## 代替検討

e2e 層(node-pty 駆動)での実機起動テストは**棄却** — 到達ライン検証は AC-6b の手動配置実測(build-and-test 成果物)が担い、外部ハーネス CLI の実機依存を CI に持ち込むと外部仕様変動(R-2)で CI が不安定化する。smoke は生成結果の構造検査に限定するのが正。
