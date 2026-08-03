# Code Summary — intent-autonomy-runtime

## 実装結果

U3 `intent-autonomy-runtime`（Issue #2067）を、harness-neutral な Intent-scoped autonomy Core として実装した。モード、grant、事前裁定、effect 認可、exercise reservation、park / resume、audit replay を一つの projection revision 軸で永続化し、U1 loop monitor と U2 quality repair は公開 seam から再利用した。

### Core

- `amadeus-intent-autonomy.ts`: `none` / `semi` / `full`、human-only mode / grant command、Intent-scoped grant、gate / question authorization、policy → norm → history → election → recommendation の決定順、exact effect registry、厳密な workflow result を実装した。
- `amadeus-intent-autonomy-runtime.ts`: atomic repository / coordinator、reservation-before-exercise、crash resume、drift abort、park / resume、U1 latch clear、U2 quality activation、terminal invocation failure、status projection を実装した。
- `amadeus-intent-autonomy-replay.ts`: canonical audit block codec、transaction digest 検証、audit-backed repository、cross-session replay を実装した。
- `INTENT_AUTONOMY_TRANSACTION_COMMITTED` を canonical 84件目の audit event として event registry、audit vocabulary、audit format、state-machine reference、coverage registryへ同期した。

### 境界と安全性

- legacy standing grant、headless fact、harness fact は mode / grant の人間由来 provenance を代替しない。
- walking skeleton は専用の自動承認例外を持たず、通常 gate と同じ mode / grant 規則を使う。
- `semi` の自動 gate は grant exercise を消費せず、`full` は durable reservation を effect より先に確定する。
- prohibited effect、norm conflict、missing capability、revision / digest drift は fail-closed で human-required / park / conflict / abort にする。
- `REPAIR_STALLED` の resume は U1 monitor latch clear を先行させる。Request Changes と U2 quality activation は grant を失効させない。
- U4 / U5 の責務は実装せず、terminal live completion capability は false のまま公開する。

### 投影

同一 Core bytes を Claude Code、Codex、Cursor、OpenCode、Kimi Code の現行5ハーネスへ投影した。package generator による共通 Core 投影を使い、将来の harness 追加に U3 固有分岐を要求しない。配布整合性のため Kiro / Kiro IDE の生成 tree も canonical package 出力へ同期したが、Kiro live behavior は U3 の対象外である。

## 検証結果

- 最終 focused suite: 6 files、76 tests、668 expects、0 fail。
- `bun run typecheck`: pass。
- U3 新規6ファイルへの Biome check: warning / error ともに 0。
- `bun tests/gen-coverage-registry.ts --check`: pass（579 units、84 canonical audit events、ratchet held）。
- `bun scripts/package.ts --check`: Claude / Codex / Cursor / Kimi / Kiro / Kiro IDE / OpenCode の全生成 tree が同期。
- `bun run promote:self:check`: 現行5 self-install harness が同期。
- `git diff --check`: pass。

## 全体 CI の既知 cross-unit failure

`bun run test:ci` は 764 files / 10,327 assertions を完走し、1 file / 4 assertions のみ失敗した。verbose integration 再実行も 402 files / 4,781 assertions 中、同じ1 file / 4 assertions の失敗だった。単独再実行 `bun test tests/integration/t367-callsite-guard-cli.test.ts` は 9 pass / 4 fail で再現した。

原因は U2 所有の `packages/framework/core/tools/amadeus-quality-repair-runtime.ts` に残る legacy `observe()` 2箇所（単独再実行時 line 459 / 580）を `t367-callsite-guard-cli` が検出したことにある。U3 の runtime / tests / projection はすべて green であり、cross-unit 修正を U3 commit に混在させない方針に従って本 Bolt では変更していない。親統合側で U2 を局所修正する。

Claude / AWS live substrate tests は無効な AWS credentials のため runner の既定規則で skip された。wall-clock drift は既知の重い fixture に限られ、U3 focused test には発生していない。

## 残作業

U3 の実装残はない。後続は U2 legacy `observe()` の親統合側修正、U4 の完了後レビュー判断、U5 の terminal live completion で扱う。
