# Code Summary — unit recommendation-core(U1)

## Commits(worktree `bolt-recommendation-core`、base `main@2eb94f1e3`)

| sha | subject |
|---|---|
| `2c3e32de1` | feat(recommendation): add the unique/contested/none ruling vocabulary |
| `ef2283a93` | test(recommendation): pin the serialize/parse round trip as a property |
| `73cd3729d` | feat(autonomy): route the ladder and the gate through the ruling vocabulary |
| `8336873c0` | test(recommendation): fix the contested-frequency budget as a zero count |
| `e2258fb45` | test(autonomy): measure the AUTO_DECIDED condition on what was committed |

## 実装 summary

- `packages/framework/core/tools/amadeus-recommendation.ts`(新規、220行): `RecommendationOutcome` / `NonUniqueOutcome` / `UniqueOutcome` / `Candidate` / `RecommendationBasis` / `RulingPresentation` / `DecodeError` / `Result` の型と、コンパニオンの unique/contested/none/parse/serialize/presentationOf。
- `amadeus-intent-autonomy.ts`: `DecisionCapabilityPort.elect/recommend` の戻り型を `RecommendationOutcome` へ変更、`AutoDecisionResolution` に escalate 枝を追加、history conflict → contested 終端(R-8、`:952` の次段落下を廃止)、人間専権 seam `humanReservedDecision?`、ポート境界の妥当性検査 `portOutcomeIsValid`、ADR-11 の正規形 digest `recommendationBasisFingerprint`。
- `amadeus-intent-autonomy-production.ts`: `deriveGateRecommendation`(常に `unique(approve)`)、`electionHoldOutcome`(選挙 hold 5事由 → contested/none)、question の election/recommendation 入力配線。
- `amadeus-intent-autonomy-runtime.ts`: escalate → `human-required`(`outcome` 同梱)。
- `tests/helpers/recommendation-decision-points.ts`(新規、194行): 機構起因クラスの共有 corpus。

## 検証(実測)

| コマンド | 結果 |
|---|---|
| `bun run build` | exit 0(追跡ファイル不変) |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 |
| `bun tests/gen-coverage-registry.ts --check` | exit 0(regen 差分なし) |
| 新規5ファイル | 37 pass / 0 fail |
| 既存 t431 + t452 | 47 pass / 0 fail |
| t432 / t453 / t435 / t433 / t455 / t483 個別実行 | 各 0 fail |
| t534/t535/t537(coverage-patch-allowlist 補助) | 36 pass / 0 fail |

注: 多数の integration ファイルを1プロセスへ束ねて実行すると t483 が OTel one-workspace-per-process 不変量で落ちるが、これは束ね実行の副作用であり、単独実行では 3 pass(実測)。

## Red 逐語

### FP-3 / C1 不在(実装前)

`bun test tests/unit/t3116-recommendation-outcome.test.ts` exit 1

```
error: Cannot find module '../../packages/framework/core/tools/amadeus-recommendation.ts' from
'/Users/j5ik2o/Sources/.../tests/unit/t3116-recommendation-outcome.test.ts'
 0 pass
 1 fail
 1 error
```

### FP-1 / FP-2(梯子・ポート、実装前)

`bun run typecheck` — `t3116-recommendation-ladder.test.ts` の 22 件。中核は次の2クラス。

FP-2(候補列挙を渡す語彙が存在しない):
```
tests/unit/t3116-recommendation-ladder.test.ts(93,5): error TS2322: Type '() => RecommendationOutcome' is not
assignable to type '(occurrence: InteractionOccurrence) => { readonly optionId: string; readonly
evidenceFingerprint: string; }'.
```

FP-1(非一意の終端が構造的に存在しない):
```
tests/unit/t3116-recommendation-ladder.test.ts(129,9): error TS2367: This comparison appears to be unintentional
because the types '"invalid" | "park" | "decided"' and '"escalate"' have no overlap.
tests/unit/t3116-recommendation-ladder.test.ts(130,21): error TS2339: Property 'outcome' does not exist on type 'never'.
```

他:
```
tests/unit/t3116-recommendation-ladder.test.ts(15,3): error TS2305: Module '...amadeus-intent-autonomy.ts' has no
exported member 'recommendationBasisFingerprint'.
tests/unit/t3116-recommendation-ladder.test.ts(24,3): error TS2305: Module '...-production.ts' has no exported
member 'deriveGateRecommendation'.
tests/unit/t3116-recommendation-ladder.test.ts(25,3): error TS2305: 同 'electionHoldOutcome'.
tests/unit/t3116-recommendation-ladder.test.ts(226,7): error TS2353: Object literal may only specify known
properties, and 'humanReservedDecision' does not exist in type 'Partial<ResolveAutoDecisionInput>'.
```

### 落ちる実証(注入 → 赤 → revert、残渣ゼロ機械確認)

1. R-5 round-trip PBT: `serialize` の contested 分岐に `rationale.trim()` を注入 → `Property failed after 8 tests` / `Shrunk 55 time(s)`。revert 後 `git status --short packages/` 空、16 pass。
2. R-16 contested-0 fixture: 梯子の norm 段に contested 終端を注入 → 4 tests 中 3 fail。revert 後 `grep -c "injected-defect"` = 0、4 pass。
3. R-7 escalate→未コミット: runtime の escalate 枝を gate 決定へ差し替え → 3 tests 中 2 fail。revert 後 `git status --short packages/` 空、3 pass。

## 申し送り

- 逸脱: none。
- ADR-11 の fingerprint 算出規則は本 unit のソースに実装せず、code-generation への申し送り入力として構造検査のみで担保(R-6)。
