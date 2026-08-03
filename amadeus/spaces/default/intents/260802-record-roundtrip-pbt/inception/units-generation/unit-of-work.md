# Unit of Work — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): requirements.md(FR-1〜FR-7 の凝集単位と Must/Could)、components.md(U1〜U8 の規模見積 — 本書の Unit へ按分)、component-methods.md(parseElectionFile / プロパティ / arbitrary の API 面)、services.md(S1 ガード CLI・S2 深掘りジョブの出力契約)、component-dependency.md(U4→U1・U5→U2/U3 の順序依存を Unit エッジへ持ち上げ)、decisions.md(ADR-1〜4 の裁定を各 Unit の実装制約として転記)

測定 ref: 見積行数はすべて components.md(worktree HEAD `5a6f79727` 実測)の U1〜U8 見積からの按分。

## Unit 一覧(各 Unit は単独 deployable な Bolt = 1 PR)

| Unit | 内容(AD ユニットとの対応) | 対応 FR | 見積 |
|---|---|---|---|
| **election-readpath** | AD U1(`parseElectionFile` 新設+`Store.load`/`Store.setState` の読み口2箇所改修、45〜60行+既存6行)+ U2(election PBT: unit 90〜120 + integration 90〜120)+ U8 の election 系 arbitrary(120〜160)。**walking skeleton(Bolt 1)** — コア改修→dist 7面再生成→PBT 常駐の全配線を最初のスライスで貫通 | FR-1a〜1c / FR-4a〜4d(election 側、#1459 反例ピン含む) | 実装 45〜60行+テスト・helper 300〜400行 |
| **state-pbt** | AD U3(state 2層の round-trip + fail-closed、140〜190)+ U8 の state 系 arbitrary(60〜90)。プロダクション改修なしの純追加 | FR-2a〜2c / FR-4a〜4c(state 側) | テスト・helper 200〜280行 |
| **cast-guard** | AD U4(`tests/unchecked-cast-guard.ts` + allowlist + ガード自身のテスト、365〜480)。AST 走査・(file,kind) 単位・shrink-only(ADR-2)。落ちる実証必須(FR-3c) | FR-3a〜3c | test tooling 365〜480行 |
| **pbt-deep-ci** | AD U5(ci.yml へ workflow_dispatch 限定ジョブ+fixture 再 baseline、41〜61)。ADR-3 準拠・非ブロッキング | FR-5a〜5b | CI 41〜61行 |
| **scope-ledger** | AD U6(`bug-scope-ledger.md` — 9件+射程判定) | FR-6a | doc 40〜60行 |
| **mirror-property**(Could) | AD U7(t274 の property 版+snapshot arbitrary、60〜90)。未実施でも intent 完了(FR-7a) | FR-7a | テスト 60〜90行 |

合計 = **1,051〜1,431行**(components.md の規模合計と同一 — U1〜U8 は過不足なく上記6 Unit へ帰属: U1+U2+U8(election)=election-readpath、U3+U8(state)=state-pbt、U4=cast-guard、U5=pbt-deep-ci、U6=scope-ledger、U7=mirror-property)。

## Unit 分割の検証(独立実装可能性)

- **U1 と U2 を1 Unit に統合した理由**: fail-closed プロパティ(U2)は U1 の改修後でなければ構造的に緑にできず(現行は無検査キャストで素通り)、U1 単独では TDD 既定(requirements.md C-1)の Red を張る面がない。検出(テスト)と是正(コア)の片側だけでは利用者価値(破損台帳のその場棄却)を出荷できないため、単一 Unit へ統合(cid:units-generation:c1 (a))。
- **state-pbt / scope-ledger / mirror-property**: 相互にファイル非交差・依存なしで独立実装可能。
- **cast-guard**: 機能上独立だが、U1 着地後に初期 allowlist を採ると台帳書き直しの往復が要らない(弱順序 — component-dependency.md)。`amadeus-election-store.ts:80` は `readJson<T>` 本体の構文で U1 後も検出され続ける(初期値 33/18 不変)。
- **pbt-deep-ci**: 走らせる対象の PBT(election-readpath / state-pbt)が存在してはじめて意味を持つ。

## 全 Unit 共通の実装制約

- election-readpath のみ `packages/framework/core/` を触る — 当該 Bolt PR で `bun scripts/package.ts`+`bun run promote:self` を同一変更で回し、dist 7ハーネス再生成+`dist:check`/`promote:self:check` green(NFR-1)、ローカル lcov で diff 追加行未カバー0(NFR-2)、`t258-boundary-guard`(NFR-3)を出荷条件とする。
- PBT は PBT_SEED 固定・numRuns 100・`AMADEUS_PBT_DEEP=1` 階層・失敗 seed ログ化の4項全充足(FR-4c、t204:16-28 canonical)。
- cast-guard は services.md S1 の出力契約(verdict 5値 × exit code: OK=0 / NEW_CAST=1 / ALLOWLIST_UNREADABLE=1 / usage=2)と CI 実行位置(ci.yml lint ジョブの callsite-guard 直後・ブロッキング)に従う。pbt-deep-ci は services.md S2 のジョブ契約(workflow_dispatch 限定・`ci-success` needs 非参加・loud fail・timeout-minutes 明記)に従う。両 Unit は ci.yml と formal-verif-ci-baseline fixture を共有するため直列化する(unit-of-work-dependency.md)。
- import は core 正本 import に統一(ADR-1)。
- 新規テスト番号(tNNN)は Bolt 着手時に予約し、再接地時は固定 base SHA の tests/ 実測で再確認する(cid:code-generation:swarm-test-number-reservation / c1-tnnn-collision-on-regrounding)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T17:49:55Z
- **Iteration:** 1
- **Scope decision:** none

Unit 分割・按分・FR 網羅・walking skeleton は AD 整合だが、cast-guard/pbt-deep-ci の並行編成が AD 確定の ci.yml/fixture 共有資源競合を無申告で否定する Major 1件で REVISE。Minor 1件(unit-of-work.md の services.md 本文実参照ゼロ = 装飾トークン)。

### Findings

- [Major] unit-of-work-dependency.md 並行編成 — cast-guard(S1: lint ジョブ1ステップ)と pbt-deep-ci(S2: ジョブ1本)はともに ci.yml + formal-verif-ci-baseline fixture へ書く共有資源(component-dependency.md 交差表で確定済み)なのに「本 Unit のみが触る — 交差なし」と正反対の主張で並行可としていた
- [Minor] unit-of-work.md — services.md はヘッダのみで本文実参照ゼロ(S1/S2 出力契約への言及なし)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T17:51:27Z
- **Iteration:** 2
- **Scope decision:** none

Major(共有資源交差の無申告否定)は edge 追加+直列化文差替えで解消し AD 交差表と整合、Minor(装飾トークン)も S1/S2 実参照追加で解消。是正 diff に新規誤りなし(GoA 1)。

### Findings

- None
