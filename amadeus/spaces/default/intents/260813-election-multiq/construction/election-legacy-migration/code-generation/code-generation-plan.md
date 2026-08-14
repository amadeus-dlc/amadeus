# Code Generation Plan — election-legacy-migration

## 実行条件

- **Depth:** Standard
- **Test Strategy:** Comprehensive
- **既存実装:** `scripts/amadeus-election-migrate.ts` と `t262` / `t556` が既に plan → approve → apply → verify を提供する。再実装せず、U6 設計契約との差分だけを閉じる。
- **対象:** `scripts/amadeus-election-migrate.ts`、`tests/unit/t262-elections-migration.test.ts`、`tests/integration/t262-elections-migration.integration.test.ts`、`tests/integration/t556-election-legacy-migration.integration.test.ts`、および当該ファイルに連動する unchecked-cast allowlist。U6 以外のコード・テストは変更しない。
- **テスト設定:** 既存の Bun test 設定と `package.json` のスクリプトを継続利用し、新規設定ファイルは追加しない。
- **入力劣化:** user-stories は scope により SKIP。各 step は captured intent（#2813）と FR-COMP-1/4、S7/S9 へ追跡する。

## 実装計画

- [x] **Step 1: 既存実装と設計契約の差分確認**
  - `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`performance-design.md`、`security-design.md`、`reliability-design.md` と現行 source/test を照合する。
  - 確認済みの一致: 明示 election ID、write-free plan、plan-digest 束縛 approval、schema byte 不変、collision/dirty/conflict の move 前拒否、same-plan retry、異 plan 拒否、source evidence 非削除。
  - 確認対象のギャップ: 新多問 corpus の fidelity（FR-COMP-4）、unchecked JSON/state cast、allowlist の live count 不一致。
  - **Trace:** U6、S7、FR-COMP-1/4、BR-M1〜M9、NFR-3/4。

- [x] **Step 2: 新多問 corpus の fidelity 回帰を先行追加**
  - `t556` に、canonical v2 / 複数 question の Election を明示 ID で計画・適用し、移動前後の canonical digest と question ID 集合が一致することを追加する。
  - 意味が一致しない移行（target 改変または digest mismatch）は fail-closed のまま source/target evidence を削除しないことを同じ file で確認する。
  - 実装変更前に対象テストの Red を実測する。既存レガシーケースが既に green なら、新ケースだけを Red 対象にする。
  - **Trace:** FR-COMP-4、BR-M6/M7/M9、S7。

- [x] **Step 3: CLI verify の read-only と plan-bound apply を補強**
  - `t262` に `--verify` が write-free であること、不正 approval / 改変 plan を拒否することを追加する。既存の write-free plan と apply ケースは維持する。
  - **Trace:** BR-M1/M2、FR-COMP-2（read-only verify）、S9。

- [x] **Step 4: fail-closed parse と allowlist 収束**
  - `as ElectionState` と CLI `JSON.parse(...) as T` を unknown 境界へ戻し、U1/U3 の public contract または明示 predicate で受け入れる。
  - `tests/.unchecked-cast-allowlist.json` の `scripts/amadeus-election-migrate.ts` を live count に一致させる。shrink-only。新規 cast を増やさない。
  - **Trace:** NFR-3、BR-M3、U3 FOLLOW-UP（migration owner）。

- [x] **Step 5: U6 の検証**
  - focused unit/integration、typecheck、lint（対象 file）、source-only、unchecked-cast guard、`git diff --check` を実行し、exit code と結果を記録する。
  - Comprehensive 戦略のうち、適用 NFR に定量目標がない performance / 外部 security 境界テストは追加しない。fail-closed と dirty/collision ケースが当該リスクを検証する。
  - repository-wide `test:ci` は記録するが、U6 外の既知失敗を本 unit の BLOCKER に転嫁しない。U6 所有テストが red なら閉じない。
  - **Trace:** NFR-5、U6 Delivers、Construction Testing Standards。

- [x] **Step 6: 成果物の閉包**
  - 全チェックボックスを実結果に合わせて閉じ、`code-summary.md` と `pr-convergence-report.md` に変更・検証・未検証面を記録する。
  - Intent state と commit は変更しない。
  - **Trace:** Code Generation stage completion contract。

## 非適用項目

- API/endpoint、DB migration、frontend、IaC、deployment artifact は U6 の standalone Bun script 境界に存在しないため非適用。
- schema の破壊的 bulk rewrite、broad glob、全 Election 一括移行、cache/parallel write は設計で禁止。
- U1 codec、U2 tally policy、U3 store、U5 CLI verb、U7 TLA+、U8 skill/norm は所有外。

## トレーサビリティ

| Step | Story / Intent | Requirements |
|---|---|---|
| 1 | S7 差分確認 | FR-COMP-1/4、BR-M1〜M9 |
| 2 | S7 新旧 corpus fidelity | FR-COMP-4、BR-M6/M7/M9 |
| 3 | S9 CLI 証拠 | BR-M1/M2、FR-COMP-2 |
| 4 | S7 parse/allowlist | NFR-3、BR-M3 |
| 5 | S9 検証証拠 | NFR-5 |
| 6 | stage 閉包 | code-generation produces |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T06:31:33Z
- **Iteration:** 1
- **Scope decision:** none

U6 plan, summary, and convergence report match the passed migration contracts; remaining repository-wide CI is outside this unit.

### Findings

- FOLLOW-UP | repository-wide bun run test:ci was not re-run in this unit; NFR-5 full-gate evidence remains with U8 and Build/Test.
