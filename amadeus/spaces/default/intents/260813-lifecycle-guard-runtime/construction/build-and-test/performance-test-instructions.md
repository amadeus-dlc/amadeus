# Performance Test Instructions — 260813-lifecycle-guard-runtime

## 判定: 適用可能な性能 NFR が存在しない

requirements.md 非機能要件の実文: 「実時間の性能目標を宣言する承認済み NFR は存在しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — ベンチマークは作らない)」。合否を決める数値目標が要件に宣言されていないため、性能テストは生成しない — 目標なきベンチマークは検証劇場であり、本書はその判定の明示記録である(黙示の欠落ではない)。

`code-generation-plan.md` / `code-summary.md` にも性能検証ステップは存在せず、生成コードは同期・ローカルのガード評価のみで外部 I/O を追加しない。

## この判定を覆す条件

- 遷移レイテンシの実測退行が Issue として起票された場合(requirements.md 非機能要件節に同旨を記録済み)。その際は cid:build-and-test:bt-timeout-verification-shape に従い、実時間負荷試験ではなく短縮可能なタイミングシームとカウンタ検証で構成する。
