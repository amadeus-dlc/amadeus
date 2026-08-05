# Code Summary — quality-repair-runtime

## 実装結果

U2 `quality-repair-runtime`（Issue #2096）を、U1 `loop-monitor-runtime` の durable delivery / Judge / latch / live authorization seam を再利用する first-party runtime として実装した。品質固有の obligation、T+1 convergence、replan-first、post-replan `repair-stalled` は専用 reducer に閉じ、generic Monitor には delivery 単位の非空 route subset constraint だけを追加した。

### Core

- `amadeus-quality-repair.ts`: trusted embedded contribution、depth 別 activation、closed evidence normalization、stable obligation / snapshot / delta / fingerprint、T+1 convergence reducer、replan receipt / review-cycle identity を実装した。
- `amadeus-quality-repair-runtime.ts`: quality event と generic Monitor event の atomic transaction、reservation-before-effect、closed attempt 0/1、reconcile-first、`REPAIR_STALLED`、suspended status、human/evidence resume、cross-session replay、live authorization 委譲を実装した。
- `amadeus-quality-repair-replay.ts`: canonical audit transaction の decode / repository / replay を実装した。
- `amadeus-loop-monitor.ts` / `amadeus-loop-monitor-runtime.ts`: compiled route の検証済み subset を予約・Judge request・適用へ伝播し、replan target を post-replan interval の anchor に更新する generic seam を追加した。
- audit event registry に `QUALITY_REPAIR_TRANSACTION_COMMITTED` を追加し、canonical payload の仕様と event count を同期した。
- `docs/reference/12-state-machine.md` と coverage registry / ratchet を U1 / U2 の新規 canonical audit event 2件へ同期した。

### 投影

同一 Core bytes を Claude Code、Codex、Cursor、OpenCode、Kimi Code の5ハーネスへ投影した。Kiro live、外部 runner / supervisor、U3〜U5、Intent grant、gate / question authorization は追加していない。

## テスト

- pure unit: contribution / activation、blocking evidence、strict progress / fixed-point / churn / regression / undetermined、replan-first / repair-stalled、Request Changes 除外を検証した。
- integration: T-1 Judge 0、初回 threshold replan、post-replan stalled、atomic resume、same-fingerprint no-op、cross-session replay、attempt 0/1 と attempt 2 不在、live authorization 再利用、canonical serialization を検証した。
- projection: 5ハーネスの quality runtime 3ファイルが Core と byte-identical であることを検証した。
- 品質ゲート: `bun run typecheck`、`bun run lint`、最終 focused 128 tests / 2,185 expects、coverage registry freshness / ratchet、audit emitter / state-machine / audit-format drift、`bun scripts/package.ts --check`、`bun run promote:self:check`、`git diff --check` を通過した。lint は既存 baseline の cognitive-complexity warning のみで error はない。
- `bun run test:ci` は全788ファイルを完走した。初回に U2 由来の event count、test size、audit taxonomy、coverage registry の同期漏れを検出し、すべて修正して上記 focused set で再検証した。古い Bolt base に由来する Pi conductor / package、complexity baseline 等の既存 drift は U2外として残した。

## 設計差分と除外

- 設計上の singleton route を generic runtime で安全に表現するため、U1 の full-set constraint を「compiled route の非空 subset」へ最小限に一般化した。quality 固有語彙は U1 Core へ追加していない。
- U1 依存コミット `89d5afe35` はこの Bolt のローカル前提であり、U2コミットには含めない。
- package / promote 実行で顕在化した、古い base に由来する `amadeus-harness-capability.ts`、`amadeus-harness.ts`、`amadeus-swarm.ts`、`amadeus-utility.ts`、Pi / Kiro 等の既存 drift は U2 の変更ではないため、U2コミット対象から明示的に除外する。

## 残作業

U2の実装残はない。後続は独立した Build and Test / 統合工程で扱う。
