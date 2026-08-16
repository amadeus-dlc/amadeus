# Code Generation Plan — unit semi-authority-projection(U5)

## 拘束

- R-1〜R-3 / FR-5: semi が人間へ回す interaction kind は `phase-gate` と `walking-skeleton` のみ。許可集合は milestone 2種の補集合として導出する(手書き列挙を残さない、`allowsOccurrence` 第3項は `occurrence.phase` ではなく kind 述語で判定)。
- R-7〜R-10 / ADR-2: `advisory-deferral` 分類を新設し、構築点は `ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS` の `defer-with-risk` ただ1つ。blocking sensor/ノルム/カバレッジ系の延期は構成上この分類を名乗れない。
- R-12〜R-14 / FR-6: 投影規則は `projectConstructionAutonomy(mode)` 1関数のみ、宣言と投影の乖離は全modeでloud fail(full限定のstderrのみ現行`announceAutonomyProjectionSkew`を撤去)。例外は `none`×`unset` の対のみ(R-25)。
- R-17/R-17a / ADR-10: walking-skeleton kindの発火はSkeleton Stanceに従属する。ゲートは共通下流の `interactionKind()` に置き、2つの供給点(`amadeus-state.ts:3711`、`amadeus-orchestrate.ts:2820-2821`)は変更不要。
- R-21〜R-23: 投影意味変更の副作用(`amadeus-log.ts:278` presence迂回、`amadeus-state.ts:4135` gate revision復元スキップ)は本 unit の owned files 外であり、投影変更の出荷はこの是正が同一変更列に載ることを条件とする(owned files の再割当はconductorの裁定)。

## TDD 順序(実施順、base `swarm-int-rfc0001@b69be09db`)

1. R-1〜R-3(milestone derivation): `t3116-semi-milestone-authority.test.ts` → Red(16 pass/4 fail、`occurrence.phase !== "phase-boundary"` sentinel が production非供給のため発火しない)→ 補集合導出 + kind述語ガード実装 → Green(20 pass)。
2. R-7〜R-10(advisory deferral): `t3116-advisory-deferral-effect.test.ts` → Red(5 pass/4 fail、`defer-with-risk`が`quality-waiver`扱いで拒否)→ `advisory-deferral`分類新設 → Green(9 pass)。falling proof 2(ADR-2拒否側): 構築点を注入で複製 → Red(8 pass/1 fail、R-10違反検出)→ revert確認(`git diff --stat`空、grep -c=0)→ 29 pass。
3. R-12〜R-14(FR-6投影): `t3116-construction-autonomy-projection.test.ts` → Red(`projectConstructionAutonomy` export不在)→ 実装 → 挙動半分はt495の書き換えで pin(readAutonomyMode throwing、旧アサーションと真逆)→ Green(unit 20 pass、t495 11 pass)。
4. R-17/R-17a(WS stance): `t3116-walking-skeleton-stance.integration.test.ts` → Red(4 pass/4 fail、両供給経路で同時に赤 — R-17aが要求する性質)→ `firesWalkingSkeletonGate`+`skeletonGateFiresFor`+`interactionKind`配線 → Green(10 pass)。
5. R-21(presence迂回是正、election由来の追補): `t3116-semi-answer-presence.test.ts` → Red(3 pass/2 fail)→ `amadeus-log.ts:277` を `declaredIntentAutonomyMode(content) === "full"` へ束縛 → Green(5 pass)。election E-260816-R21-PRESENCE-BYPASS の裁定Aを受け、reservation1(直接フィールド読取・絶対値fail-closed)・reservation2(単一呼出箇所維持)を実装後に conformance check として実測(下記参照)。

## 検証・配送

- swarm batch 3(interactive-carveout / semi-authority-projection)。
- referee: `17c472b20 integrate bolt-semi-authority-projection (batch 3) — take the new semi projection semantics in t481` で `swarm-int-rfc0001` へ収束。
- worktree: `.amadeus/worktrees/bolt-semi-authority-projection`、branch `bolt-semi-authority-projection`、base `b69be09db`。branchは一度 `git add -A` が未追跡 conductor record ファイル2件(`amadeus-state.md`+audit shard)を巻き込んだため commit-by-commit で再構築(最終HEAD `a90f6d061`、7コミット)。election裁定後のR-21 conformance追補(コミット `80496edd9`)を含め最終HEADは `80496edd9`。
