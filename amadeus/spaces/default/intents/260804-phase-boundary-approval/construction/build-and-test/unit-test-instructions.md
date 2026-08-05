# Unit Test Instructions — fix-2143-phase-boundary-approval

上流入力(consumes): `code-generation-plan.md` の TDD slice 表(S1〜S5)。

## 対象と実行

- `bun test tests/unit/t-phase-check-gate-seam.test.ts` — FR-3: 3 phase 境界の approve gate(phase-check 不在拒否 / 著述後成功 / SKIP構成の実効終端 / 非境界の負の対照)。24ケース。
- 既存 unit スイートの非退行: `bun test tests/unit/t203-mint-presence-classify.test.ts tests/unit/t113.test.ts`(advisory prompt 経路)。

## 落ちる実証(NFR-4)

`verifyPhaseCheckArtifact` 先頭への `return;` 注入(mutation probe)で新規境界テスト10件が赤化し、負の対照のみ緑を維持することを実測済み(code-summary.md §S2)。注入は復元済み。

## 実測

2026-08-05: t-phase-check-gate-seam 24 pass / 0 fail。
