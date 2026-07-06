# Integration Test Instructions

Unit: skill-quality-repair（Test Strategy: Minimal）

## 適用判断

新設しない。

## 判断根拠

- Minimal 戦略の生成対象は unit-test-instructions.md だけである（stage-protocol §8）。
- 本 Intent の変更は skill 文書と検査スクリプトであり、unit 間・プロセス間の統合境界を新設していない。
- 通し検証は既存のエンジン sandbox e2e（`npm run test:it:engine-e2e`）が担っており、`npm run test:all` に含まれる。
