# Performance Test Instructions — 260814-autonomy-stop-fixes

## 判定: 適用可能な performance NFR が存在しない

上流入力の実測: `inception/requirements-analysis/requirements.md` の NFR は NFR-1(grant 不変条件)/ NFR-2(TDD)/ NFR-3(既存ブロッキング検証集合)のみで、合否を決める数値目標を持つ performance 要件は宣言されていない。`code-generation-plan.md` / `code-summary.md` にも性能面の変更はない(変更は契約文書・ハーネス表層・integration テスト1本、production 追加行 0)。

Test Strategy は Comprehensive だが、承認済み NFR と実在境界へ trace できない性能検査は生成しない(目標なきベンチマークは検証劇場 — `cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。

## この判定を覆す条件

将来、error アーム/boundary 契約の検査が CI 実行時間の数値目標を持つ NFR として宣言された場合、または本 intent のスコープに実行時性能へ影響する実装が追加された場合に限り、性能検査を設計する。
