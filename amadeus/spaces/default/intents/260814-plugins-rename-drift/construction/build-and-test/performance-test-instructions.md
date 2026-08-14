# Performance Test Instructions — 260814-plugins-rename-drift

上流入力: `requirements.md` NFR-1、`git-drift-plugin/nfr-design/performance-design.md`、各 `code-summary.md`。

## 適用可能な NFR が存在しないという判定(根拠付き)

本 intent の性能要件は NFR-1(定性)のみで、合否を決める数値目標は要件に宣言されていない。ノルム(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 目標なきベンチマークは検証劇場)に従い、性能テストは生成しない。

- 代替検証(実施済み): スロットルの fetch-skip 経路はカウンタ/タイミングシーム(port 注入)で検証(実時間負荷試験なし)。timeout_seconds は実 fetch 所要の 1 回実測から観測レンジ内側で宣言(builder 実測 — NFR-1「レイテンシ実害なし」の検証を兼ねる)
- この判定を覆す条件: ユーザーが具体的なレイテンシ/スループット目標値を宣言した場合(requirements.md NFR-1 に明記済み)
