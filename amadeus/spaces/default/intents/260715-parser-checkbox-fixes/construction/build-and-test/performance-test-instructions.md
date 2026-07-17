# Performance Test Instructions — parser-checkbox-fixes

**N/A(根拠付き)**: 本 intent は CLI 内部の検証分岐追加(#1013)と写像置換(#1015)で、性能 NFR は requirements に不在・実行頻度はゲート操作時のみ・アルゴリズム計算量も不変(O(行数))。build-and-test:c1/c3(戦略名だけで検査を機械追加しない・承認 NFR への trace がある場合のみ比例選定)により性能検査は非適用。単発実行成功を SLO へ昇格させない(observability-setup:c3)。
