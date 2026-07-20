# Performance Test Instructions — 260719-goa-multiseg-ecode

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 判定: N/A(根拠付き)

承認済み performance NFR は存在しない(requirements.md の NFR は never-estimates 維持・配布同期・CI ゲートの3点で、性能目標なし)。変更は行単位 parse の regex 受理拡大であり、消費者は count/parse のバッチ走査のみ(code-summary.md)。build-and-test:c3(実在境界へ trace できる場合のみ比例選定)により専用性能テストは選定しない。

## 実施した比例検査(regex 線形性)

受理拡大が退行を生まない sanity として、敵対入力での線形性を実測済み(security-test-instructions.md の ReDoS 検査と同一実測 — 100KB 入力で GOA_HEAD_RE 3.4ms / PM_CID_RE 5.3ms、指数爆発なし)。
