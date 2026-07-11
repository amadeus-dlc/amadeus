# code-summary — Bolt FR-2 (#842) jump phase-event direction guard

- PR: https://github.com/amadeus-dlc/amadeus/pull/869
- ブランチ: `bolt/842-jump-phase-events`
- コミット: `66acb712e`

## 対象と根本原因
#842(P2/S2-CRITICAL)。`packages/framework/core/tools/amadeus-jump.ts` の phase 境界ブロックが
`direction` 非参照で PHASE_COMPLETED/PHASE_VERIFIED/PHASE_STARTED を無条件 emit していた。結果:
(1) backward jump でも phase イベントを emit(append-only 監査台帳の phase 検証意味を汚染)
(2) 複数 phase を跨ぐ forward jump が単一イベントに潰れる
(3) 無作業 phase の PHASE_SKIPPED 不在
(4) Phase Progress ロールアップが同一トランザクションで flip しない。
由来: 2026-07-06 restart で旧系譜 `.agents/amadeus/tools/` の #481(`2c2c48a39`)修正が新系譜へ移植されず喪失(origin:restart-loss)。

## 変更ファイル(正本)
- `packages/framework/core/tools/amadeus-jump.ts`
  - `amadeus-state.ts` から `markPhaseVerified` / `setPhaseProgress` / `PHASE_PROGRESS_FIELD` を import。
  - 3 ヘルパーを新設: `enumerateClosedPhases`(forward 境界越えの閉じる phase を正準順で列挙、`hasExecuted` は
    元 checkbox 状態で判定)、`applyClosedPhaseProgress`(Phase Progress flip)、`emitClosedPhaseEvents`
    (per-phase の COMPLETED + VERIFIED|SKIPPED + 単一 STARTED)。
  - `handleExecute` 内: 無条件 emit ブロックを上記ヘルパー呼び出しへ置換。backward/redo/非境界越えは
    `closedPhases` が空になり emit 0 件・Phase Progress 不変。
  - ヘルパー抽出は complexity-gate 対策も兼ねる(handleExecute の CCN が 37→47 に増える指摘を受け、抽出で
    ベースライン維持に復帰)。
- `packages/framework/core/tools/amadeus-state.ts`
  - **export 追加のみ**(既存経路の配線は不変): `PHASE_PROGRESS_FIELD`、`PhaseProgressStatus`、
    `setPhaseProgress`(一般形・未知 phase は defensive no-op)、`markPhaseVerified`(旧系譜契約の復元)。
- `tests/unit/t-jump-phase-events-seam.test.ts`(新規、dist/claude import の in-process seam)。
- dist(claude/codex/kiro/kiro-ide)+ self-install(.claude/.codex)を同一コミットで再生成。

## 契約同等性(2c2c48a39 + 8cf816138)
- (a) emit は `direction === "forward"` のみ(`closedPhases` 長さを guard に使用) (b) 正準順 per-phase 列挙
  (c) 実行済み stage 有 → VERIFIED / 無 → SKIPPED (d) 同一トランザクションで Phase Progress flip、backward は無変更。
- **再接地の適合点(scope 縮小の宣言)**: 現行系譜に phase-check-artifact ゲート
  (`verifyPhaseCheckArtifact` / `PHASE_CHECK_REQUIRED_PHASES`)の系譜が存在せず、現行 `handleAdvance` も
  同ゲート非保持。本 Bolt 契約(E-B6a 裁定 a–d)はゲートを含まないため、jump を現行 advance と対称に保つ目的で
  phase-check ゲートは復元しない。

## 共有ヘルパーの API 形(FR-3 #836 が消費)
```ts
export const PHASE_PROGRESS_FIELD: Readonly<Record<string, string>>;
export type PhaseProgressStatus = "Pending" | "Active" | "Verified" | "Skipped";
export function setPhaseProgress(content: string, phase: string, status: PhaseProgressStatus): string;
export function markPhaseVerified(content: string, phase: string): string;
```
本 Bolt は jump からのみ配線。advance/finalize/complete-workflow は FR-3(#836)が同ヘルパーで配線する。

## 落ちる実証(RED→GREEN)
- 修正を一時 revert(`git checkout HEAD -- amadeus-jump.ts` + repackage)した buggy jump で新テスト実行 →
  **3 fail / 1 pass**(forward VERIFIED/SKIPPED カウント・Phase Progress flip・backward 0 件が RED)。
- 修正復元 + repackage → **4 pass / 0 fail**。

## 閉包実測
- #842 再現(backward phase-crossing jump が PHASE_VERIFIED を emit)を verbatim 再適用する backward seam テストが
  修正後に該当イベント 0 件を実測(construction → inception)。元症状の非再現を確認。

## 同根棚卸し(修正せず列挙)
- direction-unguarded emit は jump のみ。`amadeus-state.ts` の handleAdvance(1163/1199)・handleCompleteWorkflow(1407)は
  `advanceDirectionCheck` により backward 拒否の forward-only 契約のため同型欠陥ではない。ただし両者とも
  Phase Progress flip(`markPhaseVerified`)を欠く同根 → **#836(FR-3)** スコープ。
- `2c2c48a39` の他ファイル面: state.ts export(復元、`verifyPhaseCheckArtifact` は上記理由で非復元)、
  旧 eval `dev-scripts/evals/jump-phase-guard`(現行不在 → seam テストで代替)。

## 検証(最終変更後・exit code)
| コマンド | exit |
| --- | --- |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bash tests/run-tests.sh --unit` | 0(PASS, 0 failed) |
| `bash tests/run-tests.sh --integration` | 0(PASS, 0 failed) |
| 新規 seam テスト単体 | 0(4 pass) |
| diff 追加行 lcov 未カバー | 0(local lcov 実測) |

注: `bun test tests/unit/`(並列直叩き)では 39 件が test-isolation 汚染で fail するが、公式ランナー
`tests/run-tests.sh --unit`(unit tier は serial)では 0 fail。ベースラインはクリーン。

## 逸脱
なし。E-B6a 裁定(共有ヘルパーを state.ts に export のみ、jump からのみ配線、FR-3 は非配線)と契約 a–d に準拠。
phase-check ゲート非復元は「現行系譜に系譜が無く現行 advance と対称に保つ」ための再接地判断であり、本 Bolt の
契約範囲内(逸脱ではない)。レビュー観点として明示する。
