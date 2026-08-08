# Code Summary — u3-question-route-observability

上流入力(consumes 全数): code-generation-plan.md(FR-3 逐語と再予約 t486/t487)、functional-design/business-rules.md(BR-U3-1〜6 の充足判定)、functional-design/domain-entities.md(導出属性設計との整合確認)。

## 着地内容

- builder コミット `2277bbf9f`(worktree 隔離 builder、base `a5f297c2b`)→ conductor ブランチへ cherry-pick `479dcdde6`(mechanism-ratchet 台帳の挿入衝突1件を union 解消 — builder base の t485 行は conductor 断面に不在のため t486 行のみ採用、マーカー残存 0 を機械確認、coverage-registry は conductor 断面で再生成)
- `amadeus-log.ts`(+107): `QuestionResolutionRoute` 型 / `resolveQuestionRoute`(`auto-decision-` 形式検査 — 唯一の新規検査)/ `questionAnswerRouteRows`(INTENT_AUTONOMY_TRANSACTION_COMMITTED の復号による mode の after-the-fact 導出、pre-u3 行は `unknown`)/ `findBypassedQuestionAnswers`(human × semi/full の迂回述語)/ handleAnswer への導出属性配線 / `export main`(in-process seam)
- `otel/event-registry.ts`: QUESTION_ANSWERED へ `optionalAttributes: ["Resolution Route", "Decision Id"]`(redaction safeKeys が registry 導出のため必須同期)
- `knowledge/amadeus-shared/audit-format.md:150` の Optional 列更新
- 観測専用 catch(:204 — undecodable 行は直前 mode 維持)の no-silent-drop grant(`01KZF9NRBGKJZKY9TGJAJYQ45G`)

## TDD 実測

builder 報告どおり Slice A〜I で Red→Green を反復(詳細は builder 最終報告 — 落ちる実証2面: 純関数の Route 書換で検出 1→0、実 shard fixture の human→ladder 書換で検出 1→0)。

## 検証実測

- builder 側: typecheck 0 / lint 0 / 24ファイル 340 pass 0 fail(path 実在 24/24 機械確認)/ build 後追跡不変
- conductor 側取込後: 対象テスト 53 pass 0 fail → full CI **RESULT: PASS** / typecheck 0 / lint 0 / `amadeus-log.ts` の fidelity diff = 0 行
- 逸脱申告1件(受理): 元割当 worktree がターン間の自動クリーンで消滅したため、同一 base からセッションツリー配下にネストした worktree を新設して実装(隔離は維持、conductor 記録面への書込なし)

## 独立レビュー(swarm referee 代替 — read-only reviewer)

- Verdict: **READY** / Findings: None(reviewer-u3、2026-08-08 — BR-U3-1〜6 整合・guard 挙動不変・後方互換・落ちる実証の両側実在を確認)

## 採番の申し送り

t486 は並行 in-flight ブランチ2系統(別 intent)にも同番号の別ファイルが存在する。本ブランチの PR 再接地時に cid:code-generation:c1-tnnn-collision-on-regrounding の固定 base SHA 実測で再確認し、衝突が実体化していれば自側を改番する。
