# Code Summary — U4 docs-sync

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md(U4 FD)、code-generation-plan.md

実装 branch: `bolt-docs-sync`(PR #1859、マージ着地 150634197)。コミット: 8cc03c19e(docs 4ペア同期)/ 0656e4c99(scope/tier 軸へ perf 追加)/ c3e5e8568(純度評価3層の明記 — smoke null 免除/perf other の機序区別)。

## 実装内容

- 再 grep: 新規対象なし(台帳 = 設計時と一致、❌ の upstream-sync 履歴は無接触)。publishing-setup ペアは記述が現状正確のため無変更(申告済み逸脱 — BR-U4-1 の「現状正確なら churn を避ける」判断)
- 09-testing / README / 01-architecture / 11-contributing の en/ja 4ペア更新(perf tier・perf.yml・非 blocking 契約・60日 suspend・ci-success 8項不変)。件数語は count-free 化(BR-U4-3)
- レビュー2往復: scope/tier 軸整合と純度評価3層の実装準拠明記(MAX_SIZE_BY_SCOPE の null/undefined 両分岐を実読)

## NFR-1(ii) 非退行実測(PASS — ロジック3 の手順どおり)

Tests job wall-clock(ci.yml/main/push/success/attempt1/Tests 実行 run、gh api 実測):
- before(67ca151b5 の祖先、is-ancestor 検証済み): run 30612356689=507s / 30610328352=505s / 30610135355=493s → 中央値 505s
- after(post-Bolt1): run 30634430383=415s → 中央値 415s(感度: post-Bolt3 run 30662920596=449s 込みで 432.0s)
- 判定: 415 ≤ 505 → PASS(許容幅なし)。約 18% 短縮。決定的層(--ci の perf 除外)は Bolt 1 で実測済み

## 検証

--ci 675 files green / typecheck / lint / dist:check / promote:self:check 全 0。docs ガード4種(t55/t174/t199/t-test-size-drift)37 pass。en/ja H2 パリティ全ペア一致。conflict marker 0。
