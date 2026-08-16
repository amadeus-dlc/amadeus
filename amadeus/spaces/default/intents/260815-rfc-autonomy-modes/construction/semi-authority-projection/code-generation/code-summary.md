# Code Summary — unit semi-authority-projection(U5)

## Commits(worktree `bolt-semi-authority-projection`、base `swarm-int-rfc0001@b69be09db`)

| sha | subject |
|---|---|
| `42ac95815` | feat(autonomy): derive the semi permission set from the milestone pair |
| `ae2943b7c` | feat(autonomy): admit advisory deferral into the autonomous effect ceiling |
| `12ae64c49` | feat(autonomy): derive the Construction projection and refuse a record that disagrees |
| `20992f3aa` | feat(autonomy): subordinate the walking-skeleton ceremony to the Skeleton Stance |
| `4f99d6bbb` | fix(log): bind the answer-path presence carve-out to the declared mode |
| `836478e2b` | chore(tests): resync the mechanism census and the model-map implementation pins |
| `a90f6d061` | test(autonomy): pin the recompose consequence and close the inherited census gap |
| `80496edd9` | test(log): pin the fail-closed side of the answer-path carve-out(election E-260816-R21-PRESENCE-BYPASS 追補) |

## 実装 summary

- `amadeus-intent-autonomy.ts`: `SEMI_ROUTINE_INTERACTIONS = ALL_INTERACTION_KINDS.filter(k => !SEMI_HUMAN_MILESTONES.includes(k))` を pure層に追加、`allowsOccurrence` 第3項を kind述語ガードへ。`advisory-deferral` を `EffectClassification` へ追加(`PROHIBITED_EFFECTS` 5種は不変)。`projectConstructionAutonomy(mode)` を唯一の投影規則として実装(`none→gated`、`semi|full→autonomous`)、`detectProjectionDivergence` が全modeで宣言と記録の乖離をloud fail(`none`×`unset`のみ例外、R-25)。WS stance従属を `interactionKind()` に配線。
- `amadeus-intent-autonomy-production.ts` / `amadeus-orchestrate.ts`: 投影の読取・書込を共通関数経由へ統一、full限定の `announceAutonomyProjectionSkew` stderr警告を撤去。
- `amadeus-advisory-choice.ts`: `ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS["defer-with-risk"] = "advisory-deferral"`(構築点は唯一)。
- `amadeus-log.ts`(+11行): `:277` の `QUESTION_ANSWERED` presence迂回判定を `isAutonomousMode(content)` から `declaredIntentAutonomyMode(content) === "full"` へ束縛(R-21)。
- `amadeus/spaces/default/specs/tla/model-map.json`: 実装ハッシュピンの resync。

## 検証(実測、最終HEAD `80496edd9`)

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 |
| `bun tests/gen-coverage-registry.ts --check` | exit 0 |
| `bun run build` | exit 0 |
| targeted suite(16 files、branch再構築後) | 227 pass / 0 fail |

ablation(base をstashしdist再構築して独立実測)による pre-existing failure(本 unit 起因ではない、改修前後で同一失敗名):
- `tests/e2e/t416-nfr-kind-pruning.test.ts` — "a library advances through both NFR stages…"
- `tests/e2e/t122-stop-hook-e2e.test.ts` — "(real engine) generic park is guarded in an unattended run…"

## Red 逐語

### Red 1 — R-3(第2ガードのfail-open)

`bun test tests/unit/t3116-semi-milestone-authority.test.ts`(`ALL_INTERACTION_KINDS`追加後、guard/derivation変更前):
```
143 |       expect(SemiAuthority.allowsOccurrence(authority as SemiAuthority, occurrence(kind))).toBe(false);
error: expect(received).toBe(expected)
Expected: false
Received: true
(fail) R-3: the second guard refuses milestones regardless of the supplied scope > a scope that allows phase-gate still does not let semi decide it
(fail) R-3: ... > a scope that allows walking-skeleton still does not let semi decide it
157 |     expect(SemiAuthority.allowsOccurrence(authority as SemiAuthority, occurrence("question", "phase-boundary"))).toBe(true);
(fail) R-3: ... > the lifecycle phase no longer decides authority on its own
(fail) R-2 ... > the routine set is derived, not restated
 16 pass / 4 fail
```
原因: `amadeus-intent-autonomy.ts` の `allowsOccurrence` 第3項が `occurrence.phase !== "phase-boundary"`(production非供給のsentinel)を見ていた。実装後: 20 pass / 0 fail。

### Red 2 — R-7/R-9/R-10(ADR-2 落ちる実証1)

`bun test tests/unit/t3116-advisory-deferral-effect.test.ts`:
```
(fail) R-7 / R-9 ... > the advisory table classifies defer-with-risk as advisory-deferral
(fail) R-7 / R-9 ... > semi authorizes the classification the advisory table assigns
(fail) R-7 / R-9 ... > a full grant authorizes the same classification   (Expected: true / Received: false)
(fail) R-10 ... > no other module assigns the classification
 5 pass / 4 fail
```
原因: `ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS["defer-with-risk"] = "quality-waiver"` により `SemiAuthority.authorizeEffect`/`authorizeDecisionEffect` で拒否。実装後: 9 pass / 0 fail。

落ちる実証2(ADR-2拒否側、注入セット): `amadeus-intent-autonomy-production.ts:867` の `classification: "workflow-reversible" as const` → `"advisory-deferral" as const` へ注入:
```
+   "amadeus-intent-autonomy-production.ts",
(fail) R-10: advisory-deferral has exactly one construction point > no other module assigns the classification
 8 pass / 1 fail
```
Revert確認: `git diff --stat <file>` 空、`grep -c '"advisory-deferral"' <file>` = 0(exit 1)。revert後再実行: 29 pass / 0 fail(advisory/effect 3ファイル)。

### Red 3 — R-12/R-13(FR-6投影)

`bun test tests/unit/t3116-construction-autonomy-projection.test.ts`:
```
SyntaxError: Export named 'projectConstructionAutonomy' not found in module .../amadeus-intent-autonomy.ts
 0 pass / 1 fail
```
関数実装後、挙動半分はt495の書き換え済みブロック(`readAutonomyMode` throwing)でpin — 改修前は逆の契約を逐語 pin していた(`expect(r.value).toBeNull(); expect(r.stderr).toContain("#2483")`)。実装後: unit 20 pass / 0 fail、t495 11 pass / 0 fail。

### Red 4 — R-17(FR-10、WS stance)— 両供給経路

`bun test tests/integration/t3116-walking-skeleton-stance.integration.test.ts`(`firesWalkingSkeletonGate`+`skeletonGateFiresFor`追加後、`interactionKind`配線前):
```
Expected: "semi-authority" / Received: "SCOPE_OUT"
(fail) R-17 ... > engine path: a degrade scope's first Construction stage is decidable by semi
Expected: "decided" / Received: "not-authorized"
(fail) R-17 ... > state path: the same stage commits a gate decision instead of refusing
 4 pass / 4 fail
```
両供給点が同一runで赤(R-17aが要求する性質)。実装後: 10 pass / 0 fail。

### Red 5 — R-21(answer-path presence carve-out)

`bun test tests/unit/t3116-semi-answer-presence.test.ts`:
```
Expected: not 0
(fail) R-21 ... > semi REFUSES an answer with no human turn, even though it projects to autonomous
Expected: not 0
(fail) R-21 ... > an autonomous projection with no declared mode does NOT exempt the answer
 3 pass / 2 fail
```
原因: `amadeus-log.ts` が `isAutonomousMode(content)` で投影を読んでいた。実装後: 5 pass / 0 fail、t188は新ファイル込みで27→27 pass / 0 fail 無変化。

Test-harness trap: helper `declare()` が TS ambient-declaration keywordとして呼出箇所で無音消去され、fixture書込が実行されず最初のRed測定が偽陽性のpassだった。`declareModes` へ改名して解消。

Worktree trap: `git stash -u` がworktree間でstash stackを共有し、未追跡 `amadeus/` record tree(`memory/project.md`+`intents.json`)と衝突。`amadeus/`をHEADへリセットして復旧、以後stashは使わず、ablationはstashed baseでdist再構築する方式に切替。

## Election E-260816-R21-PRESENCE-BYPASS — conformance check(裁定A、2-0)

Reservation 1(直接フィールド読取、絶対/空はfail-closed): 実装どおり充足。`amadeus-log.ts:277` は `declaredIntentAutonomyMode(content) === "full"` を読み、named pattern(`getField(stateContent, INTENT_AUTONOMY_MODE_FIELD)?.trim()` を `none|semi|full` へ narrow、それ以外は null → `!== "full"` → guard維持)そのもの。

Reservation 2(単一呼出箇所、関数維持): base/HEADの `git grep -n isAutonomousMode` 差分で確認。消えた行は `amadeus-log.ts:21`(import)と`:278`(呼出)のみ。存置(未変更): `amadeus-lib.ts:5186`(定義)、`amadeus-state.ts:42`/`:4166`、`harness/kiro/hooks/amadeus-kiro-adapter.ts:42`/`:406`、`harness/kiro-ide/hooks/amadeus-kiro-adapter.ts:48`/`:153`。

追加テスト(コミット `80496edd9`): "a mode the predicate cannot read keeps the guard, whatever the projection says"(mode row 欠落/空白/domain外の3行を`Construction Autonomy Mode: autonomous` と組合せ)。

Falling proof(注入セット): `amadeus-log.ts` を `isAutonomousMode(content)` + import へ差し戻し、dist再構築:
```
Expected: not 0
(fail) ... > semi REFUSES an answer with no human turn, even though it projects to autonomous
(fail) ... > a mode the predicate cannot read keeps the guard, whatever the projection says
(fail) ... > an autonomous projection with no declared mode does NOT exempt the answer
 3 pass / 3 fail
```
Revert確認: `git diff --stat packages/framework/core/tools/amadeus-log.ts` 空、`grep -c isAutonomousMode` = 0。Revert+再構築後: 28 pass / 0 fail(新ファイル+t188)。typecheck/lint/registry-check すべて exit 0。

## 申し送り

- 逸脱として NOT実装(P3、報告のみ): **R-22(ゲート改訂復元)**。`amadeus-state.ts:4166` は `autonomous: isAutonomousMode(content)` を `recoverGateRevision` へ渡し、`amadeus-lib.ts:8932` は `{ kind: "not-needed", reason: "autonomous" }` を返す。semiが現在 `autonomous` へ投影する結果、semiの `[R]` revise loop がゲート改訂復元を失う — これはR-22が禁じる退行そのもの。`amadeus-state.ts` はU3 ownedで、本unitへの割当は `amadeus-log.ts` のみだったため、ここでは是正しなかった。R-21と同種の対応(宣言されたIntent modeを読む)が必要で、R-23によれば投影変更と同一変更列へ載せる必要がある。
- ブランチ再構築の経緯: 最初のコミットが未追跡conductor record 2ファイルを `git add -A` で巻き込んだため、`b69be09db` から commit-by-commit で再構築。`git diff backup HEAD` で record 2ファイルのみの差分(1137 deletions)を確認、ディスク上は元のまま未追跡。
