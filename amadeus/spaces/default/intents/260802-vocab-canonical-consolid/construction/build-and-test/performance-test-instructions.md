# Performance Test Instructions — vocab-canonicalization

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- `code-generation-plan.md` の実行形態・完了条件と `code-summary.md` の実測値(PR #2044、head b783fe45c、検証表)を本書の前提として参照した

## 判定: 専用性能テストは生成しない(根拠付き)

- Test Strategy = Minimal(self-document スコープ)+ 承認済み NFR に性能目標が存在しない(NFR-1 決定性 / NFR-2 fail-closed / NFR-3 既存ゲート互換 / NFR-4 TDD のみ)
- cid:build-and-test:bt-proportional-selection に従い、NFR へトレースできない負荷試験を機械追加しない
- 実効性能の傍証: t414 unit 33 tests 187ms / integration 12 tests 196ms(実測)— 生成器は既存 CI の時間予算に影響しない

## 再判定の条件

- 将来、正本が数百語規模へ成長し生成が CI 予算を圧迫した場合に限り、性能 NFR の追加とセットで再判定する。
