# Performance Test Instructions — 260720-ballot-received-at

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 判定: N/A(根拠付き)

承認済み performance NFR は存在しない(requirements.md NFR-1〜4 は決定性・fail-closed・CI・遡及なし根拠)。変更は受理時刻の mint(選挙受理1回につき normalizeAt 1回)と比較キーの置換のみで、入力規模は選挙定義の voters に閉じる。build-and-test:c3 により専用性能テストは選定しない。

## 実施した比例検査(決定性)

NFR-1 の受理時刻 mint は受理操作の1回のみ(store 永続値が正)— verify の recompute が mint を再実行しないことを t236 の verify PASS(決定的比較)で実証済み(build-test-results.md)。
