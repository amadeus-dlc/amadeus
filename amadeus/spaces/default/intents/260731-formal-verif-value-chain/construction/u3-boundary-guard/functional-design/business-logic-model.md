# Business Logic Model — u3-boundary-guard

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u3 は plugin 配布物の境界ガード t377 を新設する Unit(unit-of-work.md の u3、components.md C6、FR-A6/NFR-5)。story-map の「配布物が repo-only 依存を持たないことの機械保証」に対応。

## 検査述語のモデル

### G1: 検査対象集合(4面 — FR-A2 AC と同一)

`plugins/`(正本)+`dist/plugins/`(8 変種)+`.claude/plugins/`(compose 済み)+`.claude/.amadeus-plugin-src/`(staging)の全ファイル。components.md C6 のとおり既存 t258 の SCAN_ROOTS(tests/lib/boundary-guard.ts:53-66 — plugins/ 系を含まない実測)に依存せず t377 単独で AC 全面を保証する。

### G2: 禁止パターン

`scripts/` への参照(repo-only パス)。判定は出現単位(行単位除外フィルタ grep -v は使わない — grep-occurrence-level-exclusion)。初期の許容リストは空(t258 既習様式に倣い許容リスト機構は持つが、正当な `scripts/` 参照は配布物に存在しないため空で開始 — citation-semantics-check: t258 の許容リスト方式との意図的相違はない)。

### G3: verdict

違反 0 件 → green(exit 0)。違反あり → 各違反を `<file>:<line>: <matched line>` で列挙して赤(fail-closed)。検査は決定的(LLM 不使用)。

## 不変条件

- **I1(u1 前提)**: u3 は u1 の着地後に green になる(u1 未着地では stage 本文の `scripts/formal-verif` 参照が現存し赤 — これは正しい検出であり u3 のバグではない。edge block の depends_on どおり)。
- **I2(両側実測)**: 落ちる実証(注入→赤→revert の1セット — falling-proof-injection-one-set、注入はテストが実際に読む面へ — injection-surface-verify)+corpus sweep(u1 着地後の正当な配布物全数で赤くならないこと — corpus-sweep-for-new-guards)の両側を AC とする(NFR-5)。
- **I3(検査の自立)**: t377 は integration 層(実 FS を読むため — fs-tests-integration-first)。

## テスト設計

- t377-plugin-boundary-guard.integration.test.ts(採番予約済み — decisions.md)
- ケース: (1) 4面の実配布物 sweep で違反 0(happy)(2) fixture への `scripts/` 注入で赤(落ちる実証を恒久テスト化 — transient でなく fixture ベース)(3) 許容リストの空維持 assert(語彙衝突の vacuity guard: 検査述語が `scripts/` を含む説明散文で空文化しないこと — vocabulary-collision-vacuity-guard)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T12:52:11Z
- **Iteration:** 1
- **Scope decision:** none

iteration 1 READY(GoA 1-2)。4面検査・両側実測・許容リスト空・u1 依存整合を実測確認、G2 述語の偽陽性 0 件を現配布物 sweep で裏取り。Minor 1(簡体字混入)は即時是正済み。UTC 2026-07-31T12:51:06Z

### Findings

- Minor: business-logic-model.md:15 の簡体字混入(空开始)— 是正済み
