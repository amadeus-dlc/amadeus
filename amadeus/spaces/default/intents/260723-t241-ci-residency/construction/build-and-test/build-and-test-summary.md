# Build and Test Summary — 260723-t241-ci-residency

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1294-t241-residency/code-generation/)。

## 戦略サマリ

bugfix スコープに対し二層で検証した:

1. **欠陥閉包の直接検証**: t241 が PR CI 経路(`--ci`)で実際に実行されることを実行痕跡(START/PASS/DONE 行の verbatim)で確認 — Issue #1294 の欠陥(表明×実行実態の乖離)の閉包そのもの
2. **再発ガード+既存スイート回帰**: t257(CI-resident マーカー保持テストの --ci 層所在 assert、落ちる実証済み)+フル CI(smoke/unit/integration/e2e 4層)+型・lint・配布物ドリフトガード

performance/security の専用テストは cid:build-and-test:c1/c3 により N/A(根拠は各 instructions — NFR-4 は CI 実測 +12s < 申告閾値 +60s で充足)。

## 品質ゲート判定

- 全検証コマンド green(build-test-results.md)
- §12a: architecture-reviewer READY(GoA 2 → conductor 実測4件で条件充足)
- PR #1401: e5 レビュー READY(GoA 2、落ちる実証の独立再現)+ CI 全 green → **ユーザー承認のうえマージ着地済み**(main で t241 の integration 実在を leader が grep 確認、#1294 クローズ済み)

## DevSecOps 観点(support: devsecops)

新規依存ゼロ・本番コード変更ゼロ・シークレット不接触。必須 scan(lint/typecheck/drift)は省略なく全 green。t257 の走査境界は tests/ 配下に限定(e5 レビュー留保の契約明確化 — integration-test-instructions に明記)。
