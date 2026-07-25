# NFR Design Questions: harness-contract-and-regression

## Q1. 全ハーネスの意味論をどこで一元化するか

- A. canonical coreとmanifest駆動generatorを正本にする（推奨）
- B. harnessごとに個別実装する

**回答:** A

**Evidence:** E-OC1。既存generator/drift checkを使い、同じdirective・state・audit fixtureをmanifest全件へ適用する。

## Q2. stable session identityがないharnessをどう扱うか

- A. native adapter完成までtargeted continuationをfail-closedにする（推奨）
- B. PIDや共有markerへfallbackする

**回答:** A

**Evidence:** E-OC2。Kiro IDEとOpenCodeに推測fallbackを設けず、受け入れ条件8のblocking prerequisiteとする。

## Q3. 検証量をどう維持するか

- A. 設計成果物はMinimal、Test StrategyはComprehensiveを維持する（推奨）
- B. テストもMinimalへ下げる

**回答:** A

**Evidence:** E-OC3。ユーザー指定と受け入れ条件7〜9により、focused/full/type/driftを省略しない。
