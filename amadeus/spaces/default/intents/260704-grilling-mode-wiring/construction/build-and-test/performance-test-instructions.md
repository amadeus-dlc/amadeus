# Performance Test Instructions — 260704-grilling-mode-wiring

Test Strategy が Minimal であり、NFR に性能要求（requirements.md の非機能要求 N001〜N004 に性能項目なし）が存在しないため、性能テストは対象外である。
変更範囲は `../implicit/code-generation/code-summary.md` と `../implicit/code-generation/code-generation-plan.md` を参照する。

## 対象外の判断根拠

- 変更対象は skill markdown と CI 検査スクリプトであり、実行時性能特性を持つアプリケーションコードを含まない。
- 新検査 `grilling-wiring:check` は CI 連鎖内で数秒以内に完了しており、CI 時間への影響は無視できる。

## 将来必要になった場合

CI 連鎖の実行時間が問題になった場合は、`dev-scripts/evals/` の実行時間計測を別 Issue として起票する。
