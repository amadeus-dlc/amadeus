# code-generation plan — Bolt FR-2 (#842) jump phase-event direction guard

## 対象バグ
#842 (P2/S2-CRITICAL): `amadeus-jump.ts` の phase 境界ブロックが `direction` 非参照で
PHASE_COMPLETED/PHASE_VERIFIED/PHASE_STARTED を無条件 emit する。結果:
1. backward jump でも phase イベントを emit(append-only 監査台帳の phase 検証意味を汚染)
2. 複数 phase を跨ぐ forward jump が単一イベントに潰れる(per-phase 展開不在)
3. 無作業 phase の PHASE_SKIPPED が不在
4. Phase Progress ロールアップ(`- **<Phase>**: ...`)が同一トランザクションで flip しない

## 契約参照
- `2c2c48a39`(#481, #479 契約の jump 適用): direction ガード + `closedPhases` 正準列挙 +
  per-phase VERIFIED/SKIPPED + `markPhaseVerified`/`PHASE_PROGRESS_FIELD` の同一トランザクション flip。
- `8cf816138:.agents/amadeus/tools/amadeus-state.ts`: 旧系譜の `markPhaseVerified`/`PHASE_PROGRESS_FIELD`
  (トランザクション同座、最終 phase は complete-workflow 側で処理)。

これらは旧 `.agents/amadeus/tools/` 系譜のもので、2026-07-06 の repo restart で新系譜
`packages/framework/core/tools/` へ移植されず喪失(restart-loss)。単純 cherry-pick では当たらないため
現行コードへ差分再接地する。

## 現行コードとの適合点(re-grounding)
1. 現行 jump は `packages/framework/core/tools/amadeus-jump.ts`。`setField`/`getField`/`countCheckboxes`
   は `amadeus-lib.js` から import 済み。`markPhaseVerified`/`PHASE_PROGRESS_FIELD` は現行 `amadeus-state.ts`
   に **存在しない**(restart で喪失)ため、共有ヘルパーとして新規 export で導入する。
2. **phase-check-artifact ガード(`verifyPhaseCheckArtifact` / `PHASE_CHECK_REQUIRED_PHASES`)は
   現行系譜に存在しない**(現行 `handleAdvance` も phase-check ゲートを持たない)。#481 はこのゲートも
   含んでいたが、本 Bolt の契約(E-B6a 裁定の a–d)はゲートを含まず、jump を現行 advance と対称に保つため
   phase-check ガードは復元しない。これは意図的な scope 縮小であり code-summary に宣言する。
3. Phase Progress の field ラベルは state テンプレートの `- **Ideation**: ...` 等
   (`amadeus-utility.ts` の phaseProgressLines が生成)。`PHASE_PROGRESS_FIELD` はこの label へ写像する。

## 共有ヘルパー設計(E-B6a 裁定 B — `amadeus-state.ts` に export 追加のみ)
FR-3(#836)が advance/finalize/complete-workflow の4経路から呼べる一般形にする。本 Bolt では jump からのみ配線。

```ts
export const PHASE_PROGRESS_FIELD: Readonly<Record<string, string>> = {
  initialization: "Initialization", ideation: "Ideation", inception: "Inception",
  construction: "Construction", operation: "Operation",
};
export type PhaseProgressStatus = "Pending" | "Active" | "Verified" | "Skipped";
export function setPhaseProgress(content, phase, status): string; // 一般形(未知 phase は defensive no-op)
export function markPhaseVerified(content, phase): string;        // 旧系譜契約の復元(= setPhaseProgress(.,"Verified"))
```

- advance/finalize/complete-workflow への配線は **本 Bolt では行わない**(FR-3 #836 担当)。export 追加のみ。

## jump.ts 正本修正(surgical)
1. `amadeus-state.ts` から `markPhaseVerified`, `setPhaseProgress`, `PHASE_PROGRESS_FIELD` を import。
2. `crossesPhaseBoundary` 算出直後に、forward かつ境界越えのときだけ `closedPhases`(正準 phase 順で
   current phase から target phase の手前まで)を列挙。`hasExecuted` は **元の checkbox 状態**(`checkboxMap`)で判定。
3. audit try ブロック直前(同一トランザクション、`Last Completed Stage` setField の後)で、closedPhases を
   Phase Progress へ flip: hasExecuted → `markPhaseVerified`、否 → `setPhaseProgress(.,"Skipped")`。
4. 既存の無条件 PHASE_COMPLETED/VERIFIED/STARTED ブロックを、`direction === "forward"` ガード付きの
   per-phase ループへ置換: 各 closed phase に PHASE_COMPLETED + (VERIFIED|SKIPPED)、末尾に単一 PHASE_STARTED。
   backward は phase イベント 0 件。

## テスト(in-process seam、dist/claude import — #761 seam 先例に従う)
- (a) backward phase-crossing jump → PHASE_COMPLETED/VERIFIED/SKIPPED/STARTED 0 件、Phase Progress 不変。
- (b) 2 phase 跨ぐ forward jump(ideation→construction、inception 無作業)→ per-phase の
  VERIFIED(ideation)+SKIPPED(inception)+単一 PHASE_STARTED、Phase Progress が同一書き込みで flip。
- 落ちる実証: 修正一時 revert で (a)(b) RED を実測 → 適用で GREEN。

## 検証
typecheck / lint / dist:check / promote:self:check / complexity-gate --check / 新規+関連テスト /
gen-coverage-registry --check、push 前 lcov で diff 追加行未カバー 0。
