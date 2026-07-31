# Security Test Instructions — 260731-perf-ci-separation

上流入力(consumes 全数): code-generation-plan.md(U1〜U4 の実行計画 — 検証項目の出所)、code-summary.md(U1〜U4 の実装・検証実測 — 本書の対照元。いずれも construction/<unit>/code-generation/ 配下の4面)。比例選定(cid:build-and-test:c3): 本 intent の変更面(tests/・.github/workflows/・docs/)は secrets・認可・外部入力の攻撃面を追加しない。

## 実施済み検証

- perf.yml の権限最小化(contents:read 既定・persist-credentials:false・新規 secrets ゼロ — U2 code-summary.md)
- 依存追加ゼロ(bun.lock 無変更 — lint/dist:check green で機械確認)
- DAST・依存スキャンの新設は対象外(承認済み NFR に該当なし)
