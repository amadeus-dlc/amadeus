# Code Summary — jump-phase-guard（Issue #481）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-jump.ts` | forward 境界越えを per-phase 処理化: 閉じる各 phase を正準順で列挙（R000）し、[x] あり → phase-check 事前ガード + PHASE_VERIFIED + Phase Progress Verified（R001/R002）、[x] なし → PHASE_SKIPPED + Skipped（R003）。backward は phase イベントを一切 emit せず Verified を保持（R004）。PHASE_STARTED は target phase に 1 回 | R000〜R004 |
| `.agents/amadeus/tools/amadeus-state.ts` | `markPhaseVerified` / `verifyPhaseCheckArtifact` / `PHASE_PROGRESS_FIELD` を export（実装は不変更、jump からの再利用のため） | R001 / R002 |
| `dev-scripts/data/parity-map.json` | engineFileExceptions へ `tools/aidlc-jump.ts` を宣言 | N3 |
| `dev-scripts/evals/jump-phase-guard/check.ts` | 新規 eval（15 検査、隔離 workspace 実 CLI） | N1 |
| `package.json` | `test:it:jump-phase-guard` を `test:it:all` へ結線 | N2 |

## 検証

- RED（修正前 10 失敗）→ GREEN（15 検査 ok）を確認。
- `--stage` / `--phase` 単発 runner は同一の `jump execute` 経路のため本修正で保護される（R005。eval (b) が execute を直接駆動して検証）。
- 退行なし: hooks-state-bugfix eval pass、`npm run test:all` exit 0（parity:check ok を含む）。
