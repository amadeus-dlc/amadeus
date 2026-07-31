# Scalability Design — U4 docs-sync

上流入力(consumes 全数): business-logic-model.md(U4 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-6/NFR-1(ii) と FD の台帳ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## スケール軸

対象 docs の増加は dual-key grep(business-logic-model.md ロジック1 の鮮度再確認)が自動検出 — 台帳の手動維持をしない(観測から再導出。cid:code-generation:observe-dont-ledger-under-parallelism の文書面適用)。

## 非採用

docs 生成自動化・件数ガード新設はスコープ外(FR-6 の範囲のみ)。
