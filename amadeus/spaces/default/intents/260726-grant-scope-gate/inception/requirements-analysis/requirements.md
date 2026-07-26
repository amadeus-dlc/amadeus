# Requirements — 260726-grant-scope-gate(Issue #1497)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

## Intent 分析

standing delegation grant(solo mode、PR #1483 で導入)が composed スコープ(`amadeus-feature` / `amadeus-bugfix` / `amadeus-refactor` 等)の intent で機能しない。ユーザーの目的は「発行済みグラントが宣言どおりの範囲(既定 = phase boundary と walking-skeleton gate を除く通常ステージゲート)を composed スコープでも stock スコープと同型に覆うこと」の回復である。business-overview.md の本 intent 節が記録するとおり、Amadeus 自己開発は Scope Overrides により composed スコープ(`amadeus-*`)の使用が既定であり、現状はグラント機能の主要利用面が全滅している。

根本原因(RE 実測確定、architecture.md「solo standing grant 認可アーキテクチャと scope 解決の二重化」節):
`standingGrantSatisfiesGate`(`packages/framework/core/tools/amadeus-lib.ts:3985-4017`)の `inScope` が `stage.scopes`(stage frontmatter 由来、stock 10 語彙のみ)を直読する。composed スコープは `scope-grid.json` にのみ存在する設計(`amadeus-graph.ts:1350-1359` doc comment)のため、composed スコープでは全 stage が「スコープ外」と判定され:

- **症状 A**(#1497 報告): `next === null` → `crossesPhaseBoundary` 恒真 → 全ゲートが phase boundary 扱い → 既定グラント(`includes_phase_boundary=false`)が全ゲートで ineligible。ユーザー可視の実体はグラントの**無音 no-op**(route receipt 未発行、`amadeus-grant-authorization.ts:762` の directive 無変更返却 → 通常 human presence 経路へフォールバック)。
- **症状 B**(RE で発見、未報告): `firstConstruction === undefined` → `isFirstConstructionGate` 恒偽 → **walking-skeleton 除外の無音不発**。`amadeus-feature` + stance=on + opt-in グラントで first construction gate が認可される(project.md Forbidden「walking-skeleton stance 有効時に standing grant へ walking-skeleton gate を認可させない」への現在進行の違反)。

裁定(requirements-analysis-questions.md、ユーザー直接裁定 2026-07-26T05:40:51Z): Q1=A(B を含める)/ Q2=A(エンジン正規経路へ一致)/ Q3=B(per-unit 軸を本 intent で実測確認)/ Q4=A(捏造 fixture 是正を含める)。

## 機能要件(FR)

### FR-1: composed スコープでの gate 分類の回復(症状 A)

`standingGrantSatisfiesGate` のスコープ内判定を、エンジン正規経路と同一の **scope-grid 由来の解決**(`loadScopeMapping()[scope].stages[slug] === "EXECUTE"` / `subgraphForScope` 相当。architecture.md 記載の正規経路 `amadeus-lib.ts:6828-6866` / `amadeus-graph.ts:959-974`)へ差し替える。

受け入れ基準(実 `stage-graph.json` + 実 `scope-grid.json` を読むテストで検証):
- a. scope `amadeus-bugfix`、既定グラント(opt-out)で、通常ステージゲート(例: reverse-engineering、code-generation — 次 in-scope stage が同 phase に存在するゲート)が **covered=true** になる(現状 false = #1497 の RED)
- b. scope `amadeus-bugfix`、既定グラントで、真の phase boundary ゲート(次 in-scope stage が別 phase、または最終 stage)は **covered=false** のまま(偽陽性の裏側)
- c. opt-in グラント(`includes_phase_boundary=true`)では phase boundary ゲートも covered=true
- d. **stock parity**: stock スコープ(`bugfix` / `feature` 等)の現行分類(RE 再現プローブ表、code-quality-assessment.md 本 intent 節)が全組合せで不変

### FR-2: walking-skeleton 除外の回復(症状 B)

`firstConstruction` の解決も同一の scope-grid 由来解決へ差し替え、composed スコープで first construction gate の除外が機能すること。

受け入れ基準:
- a. scope `amadeus-feature`(SKELETON_ON_SCOPES 登録済み、`amadeus-lib.ts:3900`)+ stance=on(および stance 未記録)+ opt-in グラントで、first construction stage(scope-grid 実測: `functional-design`)が **covered=false**(現状 true = 症状 B の RED)
- b. stance=off を明示した場合のみ除外が解除される(既存 stock 挙動と同型)
- c. scope `amadeus-bugfix` の first construction stage は scope-grid 実測で `code-generation` — first construction の特定自体が scope-grid 由来であることをテストで固定

### FR-3: per-unit 軸の実測確認と是正(Q3=B)

`evaluateStandingGrantGateEligibility` の `per-unit-incomplete` ガード(`amadeus-lib.ts:3959-3961`)に対し、呼び出し側 `standingGrantSatisfiesGate` が `isPerUnitStage: false` / `isPerUnitFinalGate: false` をハードコードしている(`:4012-4013`)。

要求:
- a. per-unit ステージ(3.1-3.4 設計ステージ、非 autonomous code-generation)の中間反復でグラントが実際にゲートを覆いうる経路が存在するかを、実 directive フロー(`routeSoloStandingGrantDirective` は `gate !== true` で素通り)と approve 経路(`amadeus-state.ts:2470` / `:3269` / `:2985-3040`)の双方で**実測確認**する
- b. 欠陥(per-unit 中間ゲートをグラントが不当に覆う)が確定した場合、per-unit context の実配線を同一 PR で修正し、regression テストを置く
- c. 欠陥でないと確定した場合、ハードコードが安全である根拠(どの経路でも per-unit 中間ゲートが本述語に到達しない実測)をコードコメントとテストで固定する。確認結果は code-generation 成果物に実測ログとして記録する
- d. 免責のみでの充足は不可: 「確認できなかった」ことは b/c いずれの代替にもならない(cid:requirements-analysis:exemption-clause-must-not-substitute)

### FR-4: テスト fixture の実構造準拠化(Q4=A)

- a. FR-1/FR-2 の RED テストは**実 `stage-graph.json` + 実 `scope-grid.json`**(テストが読む配布面 — 既習は `tests/harness/solo-gate-fixture.ts:50` の `.codex/tools/data/` 面)を読む形で書く。修正前に赤、修正後に緑を実測する(落ちる実証)
- b. 捏造 fixture(`t-solo-standing-grant-domain.test.ts` integration `:47-59` / unit `:33-44`、`t-solo-gate-transaction-seam.test.ts:305-315` の `scopes: ["amadeus-feature"]`)を実構造準拠(stock 語彙のみの graph + grid 由来の composed 解決)へ是正する。是正後も既存テストの検証意図(directive contract / transaction 不変量)は保持する

### FR-5: フォールバック性質の保持

修正後も、グラント不一致・失効・取消の想定内 fallback は fatal error 経路(`ERROR_LOGGED`)へ流れないこと(project.md Forbidden 準拠)。`gate-out-of-scope` 時の directive 無変更返却(`amadeus-grant-authorization.ts:762`)と approve 側 `printAwaitApproval`(`amadeus-state.ts:3198-3207`、`standing-grant-no-longer-authorizes`)の性質を regression テストで固定する。

## 非機能要件(NFR)

- **NFR-1 共有述語の後方互換**: `standingGrantSatisfiesGate` は solo 経路(`amadeus-grant-authorization.ts:336`)と team mode 経路(`amadeus-state.ts:2470` / `:3269`)の共有述語。シグネチャ互換を保ち、team-mode regression テストを含める(project.md Mandated「認可に関わる変更を … team-mode regression … のテストで検証」)
- **NFR-2 データ可用性の fail-closed**: scope-grid 由来解決へ差し替えた場合、`scope-grid.json` が読めない/scope キー不在のときの挙動は「グラントを覆わない」側(fail-closed = 人間承認へフォールバック)へ倒し、fatal error 経路へは流さない(FR-5 と同軸)
- **NFR-3 配布同期**: 正本 `packages/framework/core/tools/` 編集 → `bun scripts/package.ts` + `bun run promote:self` で 11 面(code-structure.md 記載: 正本1 + self-install 4 + dist 6)を同一変更で同期。`dist:check` / `promote:self:check` green
- **NFR-4 カバレッジ**: 患部 `standingGrantSatisfiesGate` は現在 UNCOVERED(`tests/.coverage-registry.json:3509`)。in-process seam で計測可能にし、push 前に diff 追加行の未カバー 0 を lcov で実測(cid:code-generation:local-lcov-pre-push)
- **NFR-5 allowlist 行ピン**: `amadeus-lib.ts` の `tests/.coverage-patch-allowlist.json` 行ピン 4 件(`2195-2196` / `2708-2710` / `3886-3887` / `5491-5493`)について、行シフトを伴う場合は全エントリの reason と現行行内容を直読照合して同一 PR で更新(cid:code-generation:allowlist-line-pin-stale)

## 制約

- 正本は `packages/framework/core/` のみ編集。`dist/` / self-install は生成物(手編集禁止)
- `amadeus-graph.ts` は lib を import しているため、lib 側から graph 機能を使う場合は既習の lazy require 様式(`amadeus-lib.ts:6898-6902` の `firstInScopeStageOfPhase` 同型)で循環を回避
- 後方互換シム・二重実装は追加しない(org.md Forbidden)。旧 `stage.scopes` 直読は削除して置き換える
- 検証: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`

## 前提

- `scope-grid.json` は全 15 スコープ(stock 10 + composed 5)のキーを持ち、composed スコープの唯一の正本である(RE 実測、observed e12259ba7)
- グラントの `Scope: stage-gates` フィールド(`StandingGrant.parse`、`amadeus-lib.ts:3790`)はワークフロー scope とは別語彙であり、本修正の対象外
- bugfix スコープ(Minimal)につき新規テストは対象欠陥の regression + parity に限定し、org.md の Testing Posture(bugfix = リグレッションテスト追加+既存スイート green 維持)に従う

## スコープ外

- `AMADEUS_OPERATING_MODE=team` の delegate 発行プロトコル自体の変更(呼び出し元の regression 検証のみ行う)
- compose 承認フロー・scope-grid の書込経路(`promote-self.ts:104`)の変更
- グラント TTL・発行 verb(`grant-standing-delegation` / `revoke-standing-delegation`)の仕様変更

## Open questions(後続ステージへ)

- FR-3 の実測結果(欠陥か否か)は code-generation 段で確定する。欠陥だった場合の per-unit context 配線の具体設計は実測結果に依存するため、実装時判断とする(pre-approved 分岐: FR-3b/3c のいずれか)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-26T05:46:38Z
- **Iteration:** 1
- **Scope decision:** none

file:line 引用(standingGrantSatisfiesGate:3985-4017、amadeus-graph.ts:959-974/1350-1359、amadeus-lib.ts:6828-6866/6898-6902/5945-5959/3790、amadeus-grant-authorization.ts:336/739/762、amadeus-state.ts:2470/3269/2985-3040/3198-3207、allowlist行ピン4件、coverage-registry:3509、捏造fixture箇所)を全数実コードと照合し完全一致を確認した。Q1-Q4のユーザー裁定はFR-1/FR-2(症状A+B)、FR-1解決方式(scope-grid由来)、FR-3(per-unit実測、推奨Aからの明示逸脱として明記)、FR-4(捏造fixture是正)に無申告逸脱なく反映されている。FR-1/FR-2の受け入れ基準は実stage-graph+実scope-gridを読む具体的テストで検証可能、NFR群はproject.md Forbidden/Mandated(fail-closed、team-mode regression、配布同期、allowlist行ピン照合)と整合し、FR-3dの免責禁止条項もexemption-clause-must-not-substituteに沿って実質基準の代替を明示的に禁じている。bugfixスコープとして過大/過小のいずれでもない。

### Findings

- None
