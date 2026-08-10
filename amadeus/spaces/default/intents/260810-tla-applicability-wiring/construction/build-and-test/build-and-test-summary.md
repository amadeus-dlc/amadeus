# Build & Test Summary — 260810-tla-applicability-wiring

上流入力（consumes 全数）: `code-generation-plan.md`（D1〜D5・Step 1〜7 の完了条件を消費）、`code-summary.md`（実装・検証の CG 段実測を消費）

## 総括

Issue #2766 案A（接続完成）の実装は、ローカル fresh 再実行（201 pass / 0 fail、typecheck / lint / build 全 exit 0）と PR #2779 の CI 全 green（pass 13、収束 converged=true・レビュー 5 スレッド全解決）で検証済み。詳細実測は `build-test-results.md`（正本、engine directive の宣言名）。

- テスト戦略 Comprehensive の適用: unit / integration を中核とし、performance / security は承認済み NFR と実在攻撃面へ trace できる範囲のみ選定（各 instructions に選定・非生成の根拠を明記 — 検証劇場の回避）。
- TDD: 全 6 スライスで Red 実測 → 最小実装 → Green（code-summary の表）。落ちる実証は正負両側 + base-checkout 対角 + io-failure 注入。

## 申し送り（受け入れ基準外 — 無条件 PASS の境界宣言）

1. **STABLE_ID_RE 非対称**（trace verb 系は3桁固定のまま）— authoring-hold 経路は非依存で FR 非交差。§12a FOLLOW-UP、別 Issue 起票候補。
2. **配布面（ユーザーワークスペース）**: Q2=A によりスコープ外（#2267 依存、requirements スコープ外節に固定済み）。
3. **同根バグ #2784**（tla-registration の cleanup 握り潰し）と**残滓債務 #2782**（activation formal_checks の core ハードコード）は別 Issue として起票済み。
4. **formal-model-check の never-run advisory**: RA / B&T の両 checkpoint で defer-with-risk を人間裁定・記録済み（既存 2 モデルの TLC 検査は本 intent 患部と独立、fresh worktree の verdict 記録不在に由来）。
