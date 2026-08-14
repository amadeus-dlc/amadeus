# Requirements — 260814-park-provenance

Intent: Issue [#3016](https://github.com/amadeus-dlc/amadeus/issues/3016) — `autonomy=full` で実ユーザーの明示的な park 指示も拒否される問題の修正。scope `self-fix`、depth Minimal。

## Upstream inputs

- `codekb/amadeus/architecture.md`(本 intent の現在節 B-1〜B-6)と `codekb/amadeus/re-scans/260814-park-provenance.md` — 患部 file:line・クロスレビュー R/A 系の再実測・台帳 resync 申し送りの正本。本書の実測引用はここに由来する。
- `codekb/amadeus/business-overview.md` / `codekb/amadeus/code-structure.md` — 本 intent の RE では無変更。一般文脈のみの前提とし、本 intent 固有の事実は引かない。
- Issue #3016 クロスレビュー(2名 CONFIRMED_WITH_REFINEMENTS、収束 ESTABLISHED_WITH_REFINEMENTS)と本ステージ Q1〜Q4 の梯子裁定(questions ファイル参照)。

## Intent analysis

`Construction Autonomy Mode: autonomous` の Intent で、Stop hook 自身が案内する正規操作(park)を state tool が一律拒否し、full autonomy から安全に保留する正規経路がない。PR #3037 着地後は §11b により conductor の回避策自動適用(downgrade→park)も契約上禁止されており、劣化が固定された。目標は「無人 run は park で自滅しない」という既存不変量を保ったまま、実ユーザーの現在ターンに由来する明示的 park を受理すること。

## Functional requirements

### FR-1: fresh HUMAN_TURN による park の受理

`handlePark`(`amadeus-state.ts:1579`、ガード `:1583-1587`)を置換する: `Construction Autonomy Mode` が `autonomous` のとき、active intent の presence ledger に**未消費**の `HUMAN_TURN` が存在すれば park を受理し、`WORKFLOW_PARKED` と park marker を記録する(Q1=A: state 層の暗黙 fail-closed 判定)。
受け入れ確認: autonomous 状態 fixture + `mintHumanPresence` で植えた未消費 turn で `amadeus-state.ts park` が exit 0・`Parked` marker 書込・`WORKFLOW_PARKED` 監査行を実測。

### FR-2: unattended park の fail-closed 拒否維持

未消費 HUMAN_TURN が存在しない場合(turn 不在・全消費済み)は従来どおり拒否する。判定は fail-closed 述語(`outstandingHumanTurns` 系)で行い、`humanActedSinceGate` の active-scope fail-open 分岐(`amadeus-lib.ts:3864`)と `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` 系 env バイパスは park 判定に使わない(Q3=A)。
受け入れ確認: turn 不在 / 消費済みの2ケースで拒否(exit 1・marker 未書込)を実測。`t17.test.ts:1222-1235` の一律拒否固定は本契約(受理+拒否の両側)へ書き換える。

### FR-3: 使い回しの排除(consume-once)

park の受理は当該 HUMAN_TURN を消費する resolution として記録され、同一 turn での再 park・他の承認への転用を構造的に排除する(Q2=A: 壁時計窓なし)。
受け入れ確認: 1 turn で park 成立 → resume → 再 park が turn 不在拒否になることをテストで固定。

### FR-4: resume と grant 保持

FR-1 で park した workflow は `/amadeus --resume`(既存 Branch 2.6 経路)で再開できる。Intent autonomy grant は park を跨いで保持される(既決: 前 intent FR-PARK-3 のユーザー承認済み要件と `amadeus-stop.ts:943-946` / `docs/reference/12-state-machine.md:139` の現行意味論)。
受け入れ確認: park → resume 往復で `Intent Autonomy Mode` と grant Id 不変をテストで固定。

### FR-5: engine 層の契約テスト新設と経路一致

engine 層(orchestrate `park` → `Cannot park the workflow` / `kind:error`、現行 `:6604` 付近)の拒否・受理を固定するテストを新設する(クロスレビュー R2: 現状テスト全域不在を exit 1 で実証済み)。orchestrate / state tool / Stop hook の3経路の契約一致を検証し、`amadeus-state.ts:1573` の虚偽コメント(「Stop hook's identical guard」— hooks に当該ガード 0 hit)を実装に合わせて是正する。
受け入れ確認: engine 層テストが受理/拒否の両側を固定し、コメントが実態(hook は `parked` を全モード allow、防御は state tool 1層)を述べること。

### FR-6: docs 4面の契約同期

park 拒否契約を明文化している `docs/reference/12-state-machine.md` / `.ja.md` / `06-hooks-and-tools.md` / `.ja.md` の該当節(RE 実測: `:139` / `:139` / `:260` / `:258`)を新契約(fresh turn で受理・unattended 拒否・grant 保持)へ同一変更で更新する。
受け入れ確認: 4面の記述が新契約と一致し、英日対訳が同期していること。

## Non-functional requirements

- **NFR-1(認可不変条件)**: park の受理根拠を Intent grant に置かない(`24-intent-autonomy.md:137` — grant は認可を拡張できない。受理根拠は実 HUMAN_TURN の presence のみ)。mint が hook 専用(監査 CLI で偽造不能)である既存前提を保つ。
- **NFR-2(TDD)**: すべての挙動変更は Red 実測 → 最小実装 → Green の vertical slice で行う。
- **NFR-3(台帳 resync)**: `amadeus-state.ts` / `amadeus-orchestrate.ts` の変更に伴い、`model-map.json` の実装ハッシュピン4件は `updateModelMap --impl-only` で resync(手編集禁止)。監査イベントへ属性を追加する場合は `otel/event-registry.ts` + `audit-format.md` + docs 英日を同一変更で更新(未宣言キーは redaction で無音欠落、`t385` が検出)。`tests/.coverage-registry.json:897-905` の `WORKFLOW_PARKED` 対応を確認。
- **NFR-4(検証)**: typecheck / lint / フルスイート / coverage gate / 配布 drift 検査の現行ブロッキング集合を通す。

## Constraints

- 1 Issue = 1 Unit(unit: `park-provenance`)。PR は Bolt ごと、マージは人間承認。engine-singleton 制約により本 intent の unit はこの1つに限る。
- 後方互換レイヤー・env バイパスの追加はしない。旧ガードは置き換える。
- 並行 intent `260814-failopen-error-paths`(別エージェント)の面に触れない。

## Assumptions

- `isAutonomousMode` 述語(`amadeus-lib.ts:5167`)への open-coded サイト寄せ(クロスレビュー A4)は、ガード改修と同じ行を触る場合のみ併せて行う(要求外の広域リファクタはしない)。

## Out of scope

- `parkedDirective` 5 発行点(REPAIR_STALLED / Abort 等)のマーカー非対称の統一(Q4=A。必要なら別 Issue)。
- 判定入力の Intent 監査への全面付替(クロスレビュー A1 の規範論点。別 intent)。
- PR merge の自動化(人間専権)。#2967 / #2378 / #2914 / #1241。

## Open questions

- `WORKFLOW_PARKED` へ consume した turn の識別子属性を足すか(NFR-3 の registry 同期コスト対効果)— code-generation 設計で確定。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T11:00:06Z
- **Iteration:** 1
- **Scope decision:** none

6件のFRがMinimal帯域内でarchitecture.md B節・Issue #3016クロスレビュー・Q1〜Q4裁定と一貫してtraceし、測定可能な受け入れ確認とスコープ境界を備える。

### Findings

- FOLLOW-UP | requirements.md:5-9 のUpstream inputs節にupstream-coverageセンサーが要求するintent-statement/scope-document/team-practicesへの明示参照が見当たらない
- NIT | requirements.md:70-72 のOpen questionsとNFR-3のcoverage-registry対応確認との関係をcode-generation設計段で明示すると良い
