# Performance Test Instructions — 260717-mirror-issue-tool

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(amadeus-mirror-cli)

## 判定

N/A — performance-requirements.md(P-1/P-2)は数値性能要求を持たず、性能検査は build-and-test:c1(承認 NFR に trace しない検査を機械追加しない)により選定しない。反証可能根拠は同要求文書(単発 Bun CLI・gh 往復支配)。
## 再評価条件

将来 NFR に数値性能要求が追加された場合にのみ、その要求へ trace する検査を選定する。
