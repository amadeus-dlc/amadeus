# Build & Test Summary — 260816-open-bug-batch-7

## 結論

**PASS**(検証済み面: 3 unit の実装 + テスト + 必須 CI green。未検証面: マージ着地 — pr-convergence 段で直列収束)

## 要点

- 3 unit(nsd-provenance / pi-distribution / sensor-docs-sync)とも TDD Red→Green を実測し、PR 化(#3157 / #3158 / #3161)。各 PR の必須 CI は現 head で success(build-test-results.md の run 転記)
- CI 初回赤 3 クラス(t174 docs 行ピン / ci.yml 構造ピン / t227 seed)は全件是正済み — いずれも台帳・ピンの同期クラスで、機械的根拠つき(re-baseline の 1 行 revert 検証等)
- CodeRabbit 指摘 2 件(#3157)は実測検証のうえ 1 件却下(approve-evidence の台帳参照経路の取り違え)・1 件是正(baseline-proof の base revision + 同種 3 件の rebind)。全 PR 未解決スレッド 0
- GitHub Actions のイベント配送不発(push / reopen とも)に遭遇し、workflow_dispatch での直接起動で回復
- performance / security は適用可能な NFR 不在の判定を根拠つきで記録(検査の捏造なし)

## 申し送り(pr-convergence へ)

- record 同梱のため直列着地: nsd 着地 → pi rebase/再 mint/CI → 着地 → sen 同様
- マージは常任承認条件(必須 CI green ∧ converged: true 実測)の範囲でのみ自発実行
