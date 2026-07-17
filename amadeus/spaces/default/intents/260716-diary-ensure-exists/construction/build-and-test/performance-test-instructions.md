# Performance Test Instructions — 260716-diary-ensure-exists

## 適用判断(N/A、根拠付き)

承認済み性能 NFR なし(requirements.md に NFR なし — 上流 `code-generation-plan.md` / `code-summary.md` にも性能契約なし)。ensureStageDiary は next 1回あたり最大1ファイル生成(existsSync 早期 return)で directive 発行の遅延要因にならず、性能検査の比例選定対象外(build-and-test:c1)。

## 補足(実測特性)

ensureStageDiary の実行コストは next 1回あたり existsSync 1回(既存時)〜ファイル1生成(初回)で、`--ci` フル走行(10:25Z PASS)の wall-clock に観測可能な変化なし。
