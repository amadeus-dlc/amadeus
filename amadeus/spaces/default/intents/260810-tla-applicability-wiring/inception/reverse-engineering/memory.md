<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-10T00:35:00Z — scan mode を xrev differential scan と判定（cid:reverse-engineering:c1-xrev-single-issue — Issue #2766 はクロスレビュー2名成立済み・両 verdict が検証 SHA `91f37ec85` と file:line を明記）。レビュー verdict を Developer scan の一次入力とし、conductor が verbatim スポット再実測で二重化する
- 2026-08-10T00:35:00Z — 差分 base = `778567dd03b00f22cb887eec06f025557eeaaaf4`（260809-sensor-parseflags-failop の observed。`git merge-base --is-ancestor` exit 0 で祖先性実測、距離 17 コミット — cid:reverse-engineering:rescan-base-ancestry）。observed = 本 worktree HEAD `91f37ec8589cdf468599b4787e27e5125d4d16e8`（origin/main 系譜 — cid:reverse-engineering:c2-observed-mainline-commit）。クロスレビュー target SHA ≡ observed（完全一致）のため行番号再解決は構造的 no-op（cid:reverse-engineering:E-XBB-RE-S13-c2）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-10T00:40:00Z — Developer scan subagent の最終テキスト回収が Stop hook 下で構造的に不能（transcript もディスク上で未発見）のため、E-MPRRAS13 の scratch 併書形へ切替（repo 外 scratch への併書指示 + Monitor による有界同期回収）。repo 書込禁止契約は不変
- 2026-08-10T01:05:00Z — scanner 無応答（nudge 2回）を受け cid:code-generation:disk-evidence-early-takeover により conductor 引き取り実測を開始（CLI verb 列挙・evidence kinds・ADR-6 逐語・frontmatter・tNNN・#2267 状態）。TaskStop 直後に scanner の scratch 併書（26,455 bytes・完全形）の到着を Monitor が検知 — 遅延配送クラス（cid:requirements-analysis:late-verdict-diff-absorption）として scan レポートを正とし、conductor 引き取り実測は独立二重化として突合（全項目一致、相違なし）
- 2026-08-10T01:10:00Z — scan の新発見 🔴「REQUIREMENTS_HEADING_RE と実コーパスの不一致（3/134）」を conductor が独立 grep で再実測し一致を確認（grep -lE '^###[[:space:]]+(FR|NFR|AC)-[0-9]{3}([^0-9]|$)' → 3、母集合 134、regex 逐語 tla-evidence.ts:45 一致）。requirements-analysis へ持ち上げる第一級論点として記録

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
