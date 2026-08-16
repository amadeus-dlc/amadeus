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

- 逸脱: none(R-6 の解釈は下記のとおり選挙 + ユーザー裁定で確定)。
- **R-6 の解釈と構造検査(§12a iteration-1 BLOCKER の是正、E-260816-R6-FINGERPRINT 1-1 tie → ユーザー裁定 B、2026-08-16 実 HUMAN_TURN)**: R-6「算出規則を本 unit に置かない」の『本 unit』は **C1(語彙モジュール `amadeus-recommendation.ts`、表現のみ)** を指す。根拠: decisions.md:62(ADR-11 は算出を code-generation **ステージ**への申し送りと規定)、business-logic-model.md:3(U1 = C1 + C2 で、C2 = 梯子・ゲート実配線 = `amadeus-intent-autonomy.ts` / `-production.ts`)、domain-entities.md:93-96(「導出ロジック本体は C2 / C4 / C5 側」「C1 は表現のみを持つ」「型はフィールドを運ぶだけ」)、unit-of-work.md:24(CG への明示申し送り「…正規形 digest で算出すること」)。したがって `recommendationBasisFingerprint`(`amadeus-intent-autonomy.ts:1004`、導出段 C2)は設計意図の実現であり逸脱ではない。旧記載「本 unit のソースに実装せず」は C1/C2 を区別しない不正確な申告だったため本行へ訂正した。
- **構造検査(実測、tree `795775e5` = origin/main)**: `grep -n "createHash\|autonomyDigest" packages/framework/core/tools/amadeus-recommendation.ts` → 一致 0 件・exit 1(grep の exit 1 = エラーなし不一致)。同ファイルの fingerprint 関連は書式述語 `SHA256` の 3 箇所のみ — R-6 の「型定義と検証述語のみ」を満たす。
- **owned files の縮小(§12a iteration-1 FOLLOW-UP)**: unit-of-work.md:7 の U1 owned files にある `amadeus-bolt.ts`(decide-question 区画)は本 unit のコミットでは変更していない。梯子の実配線が `amadeus-intent-autonomy-production.ts` の `commitProductionQuestionDecision` 側で完結し(business-logic-model.md §1.3 と整合)、bolt 側の追加変更が不要になったため。スコープ縮小であり機能欠落ではない(FR-1/FR-4 の検証は上記 落ちる実証 1〜3 でカバー)。
- **R-17(metrics 観測項目)の帰属(§12a iteration-1 FOLLOW-UP)**: contested 発火数・裁定点クラスの metrics-snapshot 観測項目は本 unit の CG スコープ外 — 集計出力面は U8 completion-report(C9、workflow 完了時の auto-decision summary)が所有し、本 unit は AUTO_DECIDED 監査列(集計の一次入力)までを提供する。
