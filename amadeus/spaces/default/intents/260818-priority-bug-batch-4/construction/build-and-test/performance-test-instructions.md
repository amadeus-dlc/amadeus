# Performance Test Instructions — 260818-priority-bug-batch-4

## 判定: 適用可能な NFR が存在しない

`requirements.md` の非機能要件は 3 項目(台帳 resync / 検証順序 remote-first / 配送は per-unit PR の直列着地)のみで、**合否を決める数値目標を宣言する性能要件は存在しない**。2 unit はいずれも engine の directive 搬送と outcome 台帳の記録面の修正であり、実行時性能の契約面を持たない。

ノルム `cid:build-and-test:c2-no-test-theatre-for-absent-nfr` に従い、体裁のための性能検査は生成しない。目標なきベンチマークは検証劇場である。

## 根拠と判定を覆す条件

- 根拠: `<record>/inception/requirements-analysis/requirements.md` § Non-Functional Requirements の実読(性能閾値の宣言なし)。上流の `code-generation-plan.md` / `code-summary.md` にも性能受け入れ基準の step は存在しない
- 本判定を覆す条件: 数値目標つきの性能 NFR が要件へ追加された場合。その際は実時間の負荷試験ではなく、同じ制御経路を通る短縮可能なタイミングシームとカウンタ検証で構成する(`cid:build-and-test:bt-timeout-verification-shape`)
