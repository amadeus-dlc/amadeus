# Requirements — 260801-kimi-bootstrap-deadlock

Upstream inputs (consumes 全数): codekb `business-overview.md` / `architecture.md` / `code-structure.md`、本ステージ Q&A `requirements-analysis-questions.md`、Issue #1922(ESTABLISHED_WITH_REFINEMENTS、cross-review 2/2)

## Intent analysis

kimi ハーネスでアクティブ intent を持たないワークスペース(fresh worktree、初回利用)から `/amadeus` を起動できない bootstrap デッドロックを解消し、engine の auto-birth を含む全導線を回復する。ゴールは「ワークフロー有無に依存しない per-user runtime 記録(`.current-session`)が、workflow 非存在時にも正しく書かれる」こと。修正対象の挙動はフレームワーク内部の hook 順序であり、ユーザー面の新機能はない。

## Functional requirements

### FR-1: `.current-session` の書き込みを state-file ガードより前に移す

- `packages/framework/core/hooks/amadeus-session-start.ts` において、`writeCurrentSessionId(projectDir, sessionId)`(現 :117)を `if (!existsSync(stateFile)) process.exit(0)`(現 :70)の**前**に移動する。
- 同ファイル内の先例パターン(`repointHarnessIncludes` が「non-fatal かつガード前段」に置かれる構造、:55-65)に倣い、コメントで配置理由を明示する。
- 移動後も no-op 条件(`sessionId` 空)と best-effort 性(書込失敗で hook を殺さない)は不変とする。

### FR-2: ガード後段の既存挙動は維持する

- heartbeat(hooks-health `session-start.last`)、監査イベント(SESSION_STARTED 等)、`supplyResourceAttribute("session.id", …)`、resume rebind、context injection は**すべて現行位置(ガード後段)に残す**(Q3=A, Q4=A)。no-state ではこれらは従来どおり不発。

### FR-3: t10 の pin 改訂 + 回帰テスト追加(Q1=A, Q5=A)

- `tests/unit/t10-hook-session-start.test.ts` の既存 pin(:211 no-state silent exit / :222 no heartbeat)を新仕様に改訂: **no-state SessionStart でも `.current-session` が書かれる**ことを肯定側として固定しつつ、heartbeat 不発・監査 emit 不発は従来どおり確認する。
- 追加ケース: (a) no-state SessionStart で `amadeus/.amadeus-sessions/.current-session` に session_id が書かれること、(b) state file 有り(intent 有り)では従来どおり監査イベントが emit され `.current-session` も書かれること。

### FR-4: 配布面の再生成

- 生成物(`.kimi-code/hooks/`、`dist/<harness>/` 各 tree)は手編集禁止。core 修正後 `bun scripts/package.ts` で再生成し、`bun scripts/package.ts --check` / `bun run promote:self:check` の drift guard を通す。

## Non-functional requirements

- **NFR-1 後方互換**: intent 有りワークスペースの既存挙動(監査イベント、rebind、context injection)に変化なし。既存テスト(t10 改訂分を除く)、`bun run lint`、`bun run typecheck` が green。
- **NFR-2 fail-closed 維持**: caller-authorization の拒否ロジック自体には手を入れない(Q1=B 却下)。`.current-session` を書けない異常時は従来どおり拒否される。
- **NFR-3 冪等・競合安全**: 複数セッション/連続発火で `.current-session` の last-writer-wins 性は現行どおり(per-user runtime、best-effort)。

## Constraints

- 修正は `packages/framework/core/`(+ 必要なら `packages/framework/harness/`)のソースに限定。`dist/`・`.kimi-code/` は再生成物(AGENTS.md の drift-guard 規律)。
- origin/main 追従済み(observed `861688c31` = `d9f68e13c` + intent-record)。`supplyResourceAttribute` 追加分との配置整合を取ること。
- 手作業 bootstrap(本セッションの `.current-session` 手書き)は一回限りの申告済み処置であり、修正コードの一部にしない。

## Assumptions

- `.current-session` は workflow 有無に依存しない per-user runtime 記録である(amadeus-lib.ts:2144-2151 の設計コメントが根拠)。
- `writeCurrentSessionId` の writer は全 repo で session-start hook 1箇所のみ(RE 実測)。前段化で新たな競合面は生じない。
- `isTrustedMainStop`(kimi-lib :399-403)は FR-1 により無修正で自動解消される(Q2=A)。Stop 面の追加仕様変更は不要。

## Out of scope

- `isTrustedMainStop` 自体の信頼根拠の見直し(Q2=C 却下)。
- `.current-session` 直読み2箇所(caller-authorization、kimi-lib)の `readCurrentSessionId` への統合リファクタ(RE で別件と裁定)。
- caller-authorization の拒否条件の緩和(Q1=B 却下)。
- heartbeat 前段化(Q4=B 却下)、otel seam 前段化(Q3=B 却下)。
- Issue #1906(t145 state lock)およびその同根面(amadeus-bolt.ts の無ロック RMW) — 別 Issue の管轄。

## Open questions

- なし(Q1-Q5 すべて確定。Q5=B/C の結合テスト拡張はユーザーが A を選択し確定)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-01T12:30:21Z
- **Iteration:** 1
- **Scope decision:** none

All required sections present; Q&A answers (Q1-Q5 all A) faithfully reflected in FR-1..FR-4/NFR-1..3; file:line claims match RE evidence at observed HEAD; Minimal-depth proportional. No findings.

### Findings

- None
