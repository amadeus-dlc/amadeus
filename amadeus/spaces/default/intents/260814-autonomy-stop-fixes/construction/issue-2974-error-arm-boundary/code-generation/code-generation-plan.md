# Code Generation Plan — issue-2974-error-arm-boundary

Unit: Issue [#2974](https://github.com/amadeus-dlc/amadeus/issues/2974) — `error` directive 受領時の逐語停止契約の正本化と approval boundary の明文化(FR-ERR-1 / FR-BND-1 / FR-BND-2、NFR-1〜3)。

Scoped from: `requirements.md`(user-stories は scope SKIP のため FR へ直接トレース)+ codekb 実測(`re-scans/260814-autonomy-stop-fixes.md`)。units-generation SKIP の degrade 経路(1 Issue = 1 Unit)。

Traceability(step → FR): S2-S3 → FR-ERR-1 / S4-S5 → FR-BND-1, FR-BND-2 / S6-S7 → NFR-2, NFR-3。

- [ ] Step 1: Bolt worktree 準備 — `main` 起点の専用 worktree + branch(`bolt-2974-error-arm-boundary`)を作成し、`bun install` と `bun run build` を実行(source-only 境界の定型手順)
- [ ] Step 2: RED — drift ガードテスト新設 `tests/unit/` — core 正本の error アーム条項(逐語出力 / 停止 / 回復・リトライ・取り繕い禁止 / 新規質問発明の禁止)を定義し、8 ハーネス表層(claude / codex / cursor / opencode / kimi / kiro / kiro-ide / pi)の forwarding loop `error` アームが全条項を含むことを検査。現状 3 系統 drift(短縮形2・逐語指示なし1)で赤の実測 = 落ちる実証
- [ ] Step 3: GREEN — core 正本(`packages/framework/core/amadeus-common/protocols/stage-protocol.md` 既存様式に合わせた節)へ error アーム受け手条項を1定義として追加し、8 表層の文言を完全形へ同期。旧文言は置き換え(互換シムなし)
- [ ] Step 4: RED — 契約文面テスト新設 — (a) `docs/reference/24-intent-autonomy.md` に approval boundary 定義節(remote write 列挙 + 梯子経由 + merge 人間専権)が存在すること、(b) `plugins/pr-convergence/stages/pr-convergence.md` Guardrail が「梯子へ諮る」形へ改訂され `never merge` を保持すること、(c) `stage-protocol.md` に remote write 可否判断の decide-question 梯子経由が明記されること。現状不在で赤の実測
- [ ] Step 5: GREEN — 上記3文書を改訂(Q4=C ユーザー裁定どおり: remote write は毎回 decide-question 梯子で裁定・human-required のみ人間へ・merge は不変)。`24-intent-autonomy.ja.md` 対訳も同一変更で同期。`stage-protocol.md:139-141` の Bolt failure halt には触れない
- [ ] Step 6: `bun run build` で全ハーネス配布面を再生成し、配送先ツリーの実述語で 8 面同期を再実測。追跡ファイル不変を確認
- [ ] Step 7: 検証 — `bun run typecheck` / `bun run lint` / 関連テスト(新設 2 本 + 既存の harness parity 系)→ フルスイート 1 回(テストファイル新設のため conductor 横断ゲート)/ `coverage-patch-quick` advisory

Test strategy: Comprehensive(self-fix 既定: 対象バグへのリグレッションテスト必須 + 既存スイート green 維持)。本 unit の「実行可能な振る舞い」は新設 drift ガード・文面検査そのものであり、TDD(Red 実測 → 最小実装 → Green)を S2→S3、S4→S5 の vertical slice で適用する。

申し送り(RA レビュー FOLLOW-UP 反映): FR-BND-2 の受け入れはプロトコル文面検査のみで閉じず、S4 の機械検査(テスト)を必須とする。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:44:57Z
- **Iteration:** 1
- **Scope decision:** none

plan/summary は FR-ERR-1・FR-BND-1・FR-BND-2 へ過不足なくトレースし、RA レビュー FOLLOW-UP(FR-BND-2 のテスト必須化)も plan/summary の両方に明記・実装されており、pr-convergence-report は本 unit と PR #3037 に束縛されている。

### Findings

- FOLLOW-UP | code-summary.md:20 の正本文引用は git grep hit 数(9件)を添えており実測転記の形式に沿うが、9件という数値の対象集合(検索範囲・除外条件)が明記されていないため、再現性確保のため次回は検索述語(対象ディレクトリ・除外パス)も併記すること
- NIT | pr-convergence-report.md:13 の bolt フィールドが intent レベルの Bolt スラッグ(autonomy-stop-fixes)であり Bolt worktree のブランチ名(bolt-2974-error-arm-boundary)と異なる。契約上は正しい可能性が高いが、レビュー時に紛らわしいため plan/summary 側で Bolt スラッグと worktree ブランチ名の対応を一行明記すると読み手の負担が減る
