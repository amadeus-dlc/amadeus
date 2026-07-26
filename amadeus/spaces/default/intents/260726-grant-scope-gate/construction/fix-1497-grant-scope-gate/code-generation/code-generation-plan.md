# Code Generation Plan — fix-1497-grant-scope-gate

上流入力(consumes 全数): requirements.md

## 実装方針

正本 `packages/framework/core/tools/amadeus-lib.ts` の `standingGrantSatisfiesGate` のスコープ内判定を、stage frontmatter 直読(`stage.scopes`)から scope-grid 由来の解決(`loadScopeMapping()[scope].stages[slug] === "EXECUTE"`)へ置き換える。旧経路は削除して置換する(後方互換シムなし)。

- 実測前提(本 worktree observed): `.codex/tools/data/scope-grid.json` の 14 スコープ全数について、stock 10 スコープは grid EXECUTE と frontmatter `scopes` 包含が**全 32 stage で完全一致(差分 0)**。composed 4 スコープ(`amadeus-feature` 18 / `amadeus-bugfix` 7 / `amadeus-refactor` 8 / `amadeus` 18 stage)は frontmatter に一切現れない。よって grid 由来解決は stock parity(FR-1d)を構造的に保ちつつ composed を回復する。
- 実測前提: first construction stage は `amadeus-feature` = `functional-design`、`amadeus-bugfix` = `code-generation`(grid の EXECUTE 列から導出)。
- fail-closed(NFR-2 / FR-5): `loadScopeMapping()` が throw する、または scope キーが不在の場合は `null` を返し、述語は `false`(= グラントは覆わない = 人間承認へフォールバック)を返す。fatal error 経路(`ERROR_LOGGED`)へは流さない。
- シグネチャ不変(NFR-1): solo 経路(`amadeus-grant-authorization.ts:336`)と team 経路(`amadeus-state.ts:2470` / `:3269`)の共有述語であるため引数・戻り値は変えない。
- 説明コメントはモジュールスコープ(関数宣言直上)へ置く(cid:code-generation:bun-inbody-comment-da0)。

## FR 別の変更点

| FR | 変更 |
|---|---|
| FR-1 | `standingGrantSatisfiesGate` の `inScope` を grid 由来へ差し替え。`crossesPhaseBoundary` は同じ `next` 探索ロジックのまま新しい `inScope` を使う |
| FR-2 | 同じ `inScope` を `firstConstruction` 探索にも適用(単一定義の共有)。walking-skeleton 除外が composed スコープで発火する |
| FR-3 | per-unit 軸の実測確認。directive 経路(`emitPerUnitRunStage` の `gate=false` + `emit()` 直接発行)と approve 経路(route receipt 必須 / `validateSlugInState(..., "awaiting-approval")`)の双方を実読し、欠陥なしなら根拠をコメント+テストで固定(FR-3c) |
| FR-4 | 新規 RED テストは実 `stage-graph.json` + 実 `scope-grid.json` を読む。捏造 fixture 3 箇所の `scopes: ["amadeus-feature"]` を stock 語彙へ是正し、composed 解決は grid 由来の env seam へ移す |
| FR-5 | `gate-out-of-scope` fallback が throw しないこと、fail-closed が `false` を返すことをテストで固定 |

## テスト設計

新規 `tests/integration/t-standing-grant-composed-scope.test.ts`(実 FS を読むため integration 層 — cid:code-generation:fs-tests-integration-first)。

- 実データ面: `.codex/tools/data/stage-graph.json` / `.codex/tools/data/scope-grid.json` / `.codex/scopes`(composed スコープの `.md` を含む唯一の完全面。`dist/claude/.claude/scopes` は stock 10 のみ)を `AMADEUS_STAGE_GRAPH` / `AMADEUS_SCOPE_GRID` / `AMADEUS_SCOPES_DIR` で注入する。
- FR-1a/b/c、FR-2a/b/c、FR-1d(stock parity は旧実装を参照実装としてテスト内に再実装し、stock 10 スコープ × 全 stage × grant 2 種 × stance 3 種の全組合せで新旧一致を assert)。
- FR-3: `evaluateStandingGrantGateEligibility` の per-unit 軸等価性(final gate 文脈では `(false,false)` と `(true,true)` が同値)と、既存 `t-solo-gate-transaction-seam.test.ts` の per-unit gate:false 非ルーティングを根拠として固定。
- FR-5/NFR-2: scopes dir 不在時に throw せず `false`。
- NFR-1: `AMADEUS_OPERATING_MODE=team` でも同一 verdict(mode 非依存の共有述語)。

既存 fixture 是正: `tests/unit/t-solo-standing-grant-domain.test.ts` / `tests/integration/t-solo-standing-grant-domain.test.ts` / `tests/integration/t-solo-gate-transaction-seam.test.ts`。

## 検証計画

1. RED 実測(修正前に新テストが赤)→ 実装 → GREEN 実測。
2. `bun run typecheck` / `bun run lint` を個別実行し exit code を記録。
3. `bun scripts/package.ts` → `bun run promote:self` → `bun run dist:check` / `bun run promote:self:check`。
4. `bash tests/run-tests.sh --ci`。
5. lcov で diff 追加行の未カバー 0 を確認、`tests/.coverage-patch-allowlist.json` の `amadeus-lib.ts` 行ピン 4 件を行シフト後に直読照合(NFR-5)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T06:26:37Z
- **Iteration:** 1
- **Scope decision:** none

packages/framework/core/tools/amadeus-lib.ts の scopeStageActions()/standingGrantSatisfiesGate() を実読し、code-summary.md の全 file:line 引用(:3980, :3985, :4016, :4023, :4024, :4027、amadeus-orchestrate.ts:2697/2713/2720、amadeus-grant-authorization.ts:742/762、amadeus-state.ts:2443-2470/2919/2982-2987/3265-3272)を実コードと突合し完全一致を確認した。自分で再実行したコマンド: bun test tests/integration/t-standing-grant-composed-scope.test.ts(exit 0, 17 pass/26 expect)、bun test tests/unit/t-solo-standing-grant-domain.test.ts tests/integration/t-solo-standing-grant-domain.test.ts tests/integration/t-solo-gate-transaction-seam.test.ts(exit 0, 79 pass)、bun test tests/integration/t-standing-grant.test.ts(exit 0, 48 pass)、bun run typecheck(exit 0)、bun run lint(exit 0, 307 warn/19 info=既存ベースライン一致)、bun run dist:check(exit 0)、bun run promote:self:check(exit 0)、bash tests/run-tests.sh --ci(exit 0, 560 files / 7796 assertions / 0 fail)。FR-2 の walking-skeleton 除外を直接 probe 実行しテスト期待値と一致。dist/self-install 11面は git diff で同一内容。allowlist 4行ピン(2195-2196/2708-2710/3886-3887/5525-5527)は全て現行行内容と reason 一致。無申告逸脱・互換シム・AI slop 検出なし。FR-3 の「欠陥なし」結論は両経路の file:line 実在確認済みで妥当。

### Findings

- None
