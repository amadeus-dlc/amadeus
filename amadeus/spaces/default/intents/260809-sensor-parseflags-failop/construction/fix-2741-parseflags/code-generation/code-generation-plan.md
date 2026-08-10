# Code Generation Plan — fix-2741-parseflags

上流入力(consumes 全数): requirements.md(FR-1〜7 の正本として逐語準拠)。business-logic-model.md / business-rules.md / domain-entities.md / performance-design.md / security-design.md / deployment-architecture.md は self-fix スコープの SKIP により不在(consumes_absent expected: true — 設計面は requirements.md と Issue #2741 のクロスレビュー実測が代替する)。unit-of-work.md も units-generation SKIP により不在(expected: true)。

## 実装ステップ(受け入れ基準は requirements.md の逐語 — 縮小しない)

1. **FR-1**: strict flag-parse ヘルパーを1箇所で定義し export(両アーム = 値なし末尾 / 次トークンがフラグ、を loud 拒否。house idiom 文言 `expects a value, got end of arguments.` / `expects a value, got another flag: "…"`)。unit テストで両アーム拒否+正当列受理を固定。複製 0 を grep で確認
2. **FR-6(Red 先行)**: 対象7ファイル(depth-budget / question-budget / nfr-budget / scope-sizing / answer-evidence / required-sections / pr-convergence-report-format)への2アーム負例テストを in-process seam(`fail` export、t519:275-306 様式)で先に書き、修正前コードで赤を実測(TDD Red ログ)
3. **FR-2〜FR-4**: 各センサーの `parseFlags` を FR-1 ヘルパー消費へ置換 → Red が緑化。「値なしフラグ」vs「完全省略」の出力バイト非同一(前者 exit 1)を per-sensor で assert。RS-C(required-sections 完全偽 green)封鎖を固定
4. **FR-3**: scope-sizing は `valueAt` の既存挙動(フラグ値化防止)と等価以上を保ったままヘルパーへ。t519:305 green 維持
5. **FR-5**: t488:695-703 の名前+assert を新契約へ明示改訂+t519:264 の stderr 実文言化(改訂は当該2本 — 裁定 cg-2741-q5-t519-conflict による FR-5 明示改訂に追随)。t488:688-693 / t514:645 の完全省略ピンは不変
6. **FR-7(negative)**: upstream-coverage / dispatcher / linter / type-check の diff 0 行を機械確認
7. **検証**: typecheck / lint / build+porcelain(全ハーネス dist 投影)/ `run-tests.sh --ci` / patch gate(allowlist 追加なし)。Q3 付随: required-sections の bootstrap 遡及を `git log --diff-filter=A` で実測し記録
8. **配送**: Bolt PR 発行(`Refs #2741, #2748, #2661`)→ 収束スキル `github:j5ik2o-gh-pr-converge-loop` 実発動 → 収束後に conductor が pr-convergence-report.md を生成 → §12a → approve(c2-ssp-plugin-overlay-review-order の順序)

## 委任・分担

- 実装 = amadeus-builder-agent(worktree 隔離、FR 全文焼き込み済み — c1-parallel-degrade-batch の分離運用)。record 書込・engine 操作は builder 禁止
- record 成果物(本 plan / code-summary / pr-convergence-report)と §12a・ゲートは conductor 所有

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-09T16:15:16Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜7 は plan/summary で逐語対応し実測エビデンス完備。唯一の逸脱(FR-5 2本化)は裁定ID付き申告で requirements 改訂履歴と整合。converged 記録も一致。READY。

### Findings

- FOLLOW-UP | code-generation-plan.md:11 — Step 5 の『改訂は当該1本のみ』が FR-5 の2本化に未追随(summary/requirements は整合済み・実害なし)— plan を事後同期
- FOLLOW-UP | code-generation-plan.md:14 — Refs #2748/#2661 の妥当性を conductor が裏取り(#2748=本 intent のミラー Issue、#2661=親トラッキング — 双方正当と conductor 確認済み)
- NIT | code-summary.md:10 — 28→31 pass の差分(+3)が無注記 — 次回は一言添える
