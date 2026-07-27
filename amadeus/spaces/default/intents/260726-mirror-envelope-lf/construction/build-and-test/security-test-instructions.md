# Security Test Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(fix-1498-envelope-lf)

## 比例選定の方針

実在境界へ trace できる範囲のみ生成する。

## 対象と根拠

gateway は引数配列のみで起動・token は gh credential store 委譲(既存契約、本修正で不変)。パーサの fail-closed(pageCount≠1 拒否・malformed 拒否)は t272 で被覆。依存追加ゼロ(PR diff で package.json 変更なし)につき依存監査は別判定・不実施。
