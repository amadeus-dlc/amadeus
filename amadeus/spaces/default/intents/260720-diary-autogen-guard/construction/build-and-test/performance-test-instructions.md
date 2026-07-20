# Performance Test Instructions — 260720-diary-autogen-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 判定: N/A(根拠付き)

承認済み performance NFR は存在しない。変更は directive 発行1回につき文字列セグメント判定1回+(異常時のみ)record dir 列挙1回で、既存の発行コストに対し無視可能。build-and-test:c3 により専用性能テストは選定しない。

## 実施した比例検査(決定性)

同一入力(memory_path・record dir 集合)に対する分類(created/skipped-unresolved/skipped-prebirth)が決定的であることを integration テストの3分岐固定で実証(build-test-results.md)。
