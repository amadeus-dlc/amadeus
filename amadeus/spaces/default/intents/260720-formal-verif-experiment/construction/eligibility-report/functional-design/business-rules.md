# Business Rules — eligibility-report

## Traceability

以下は`unit-of-work.md` のU8完成条件、`unit-of-work-story-map.md` のS-3/S-7/S-8、`requirements.md` のFR-4/FR-6/FR-7/FR-9・NFR-2/NFR-4、`components.md` のEvaluator / Renderer境界、`component-methods.md` のevaluate / report contract、`services.md` のCLI lifecycleを具体化する。

| Rule | Requirement / scenario |
| --- | --- |
| BR-01〜08 | FR-4/FR-6、S-3/S-7 |
| BR-09〜12 | FR-7、S-8 |
| BR-13〜17 | FR-9、NFR-2/NFR-4、S-8 |
| BR-18〜22 | Unit / unresolved dependency境界 |

## Input / eligibility規則

- **BR-01 Structural evidence first:** expected key / bundle / identity / chain / input / repeat agreementを先に検証する。verified expected cellの`HARNESS_ERROR_CELL`だけはhard eligibilityへ渡し、それ以外のincomplete findingは`EvaluationFailure`にする。
- **BR-02 All defects detected:** armの全measured defect cellsが`DETECTED`で一致する場合だけ検出条件を満たす。
- **BR-03 No harness error:** baselineを含む任意cellの`HARNESS_ERROR`が1件でもあればそのarmをineligibleとする。
- **BR-04 Zero false positive:** healthy baselineは全measured runで`NOT_DETECTED`を要求し、`DETECTED`をfalse positiveとしてineligibleにする。
- **BR-05 Preserve reasons:** defect miss、harness error、baseline false positiveを別reasonとして保存し、missing / corruptionをいずれにも丸めない。
- **BR-06 One eligible arm:** 一方だけeligibleならそのarmをcandidateとし、両方ineligibleなら`BOTH_INELIGIBLE`とする。

## Pareto規則

- **BR-07 Eligible pair only:** hard eligibilityをcostより先に判定し、両armがeligibleの場合だけLOC、authoring elapsed、suite medianのidentity / completenessを要求して比較する。片方または両方ineligibleならcost欠損で閉じたdecisionを妨げない。
- **BR-08 Strict dominance:** 全3軸で以下かつ1軸以上で小さいarmだけをcandidateとし、trade-offまたは完全同値は`BOTH_ELIGIBLE_NO_WINNER`とする。
- **BR-09 No synthetic score:** weighted sum、単位換算、tie-break、SHARED_LOC按分を禁止する。

## Alloy規則

- **BR-10 Miss trigger:** valid defect cellに`NOT_DETECTED`が1件以上あればAlloy triggerを発火する。
- **BR-11 Blind-spot evidence:** missしたalias / contract class / armを全数保存し、両arm共通classだけをcommon blind spotとする。
- **BR-12 Separate decision:** triggerは`SEPARATE_DECISION_REQUIRED`を記録するだけで、Alloyを自動実装・追加・比較しない。

## Report / trace規則

- **BR-13 Complete report:** defect、branch / commit、freeze、matrix、baseline、raw / aggregate cost、eligibility、Pareto、decision、Alloy、正本の翻意条件mappingをcanonical modelへ含める。
- **BR-14 Row traceability:** 各rowはcommand receipt、CI run / job、artifact / evidence bundleへ一意に辿れる。
- **BR-15 Verify before publish:** source hash / identity / continuity / row bijection検証が失敗したreportをpublishしない。
- **BR-16 Renderer purity:** rendererはEvaluator出力を表示するだけで採否ロジックを重複実装しない。
- **BR-17 Reproducibility:** 同一canonical inputとalgorithm versionは同一decision / report identityを生成する。
- **BR-17a Reversal-condition fidelity:** 6体グリリング正本identityと全条件のordinal / text hashを保持し、各条件へ非空のsupport / refute cell refsを対応させる。未対応と正本外の創作を拒否する。

## Wiring / unresolved規則

- **BR-18 Wiring-only root:** final rootはU1 dispatcher、`authoring-start` / `freeze`を所有するU1 Coordinator / provenance handler、その他全concrete handlerをdirect import / injectするだけで評価・表示を持たない。
- **BR-19 Exactly one handler:** closed command unionの各commandへexactly one handlerを要求し、欠落 / 重複 / fallbackを拒否する。
- **BR-20 Error propagation:** handlerのtyped errorとexit statusをrootで別意味へ変換しない。
- **BR-21 Unresolved propagation:** U3/U4/U5のmax-exhausted / 第三review未実施と、U7の残存Major 2件を保持しREADYへ読み替えない。
- **BR-22 No completion claim:** 最終FD人間裁定前にintegration readiness、walking-skeleton completion、report completion、code-generation可を主張しない。

## Negative scenarios

structural incomplete matrix、HARNESS-only matrix、両armeligible時のmissing cost、verdict disagreement、defect miss、HARNESS_ERROR、baseline false positive、片方 / 両方ineligible、trade-off、完全同値、weighted score、Alloy自動追加、翻意条件の未対応 / 空mapping / 創作、trace欠落 / 改竄、renderer再評価、U1 Coordinator handler欠落、handler重複、error変換、未解決依存での完成主張をred fixtureとして固定する。
