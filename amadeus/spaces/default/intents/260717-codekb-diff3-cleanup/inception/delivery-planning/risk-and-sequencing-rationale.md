# Risk and Sequencing Rationale — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。

## Sequencing Decision

risk-firstを採用する。価値比較可能なBoltがB001の1件のみであるため、WSJF / Cost of Delay Divisionはスコアによる順序変更を生まず使用しない。walking-skeleton-firstも `team-practices.md` の既存brownfield bugfixには非該当である。

critical pathは `B001 -> U001-codekb-hygiene-verification-handoff`。`unit-of-work-dependency.md` の単一Unit DAGに対する唯一のtopological pathで、偏差の正当化は不要である。

## Why Risk-First

Issue #1129の価値は新機能ではなく、孤立diff3 fragmentの非再流入と証拠の正確性にある。最初に測定ref、content counts、lineage、lifecycleを閉じることで、blind reapply、ref drift、未着地の誤完了を後続の人間操作前に検出できる。

## Risk Register

| ID | Risk | Likelihood | Impact | Earliest control | Owner |
|---|---|---|---|---|---|
| R1 | mutable refが前進し件数証拠と対象がずれる | Medium | High | refとfull SHAを先に固定 | B001 / conductor |
| R2 | fix ancestryをcontent cleanのproxyにする | Medium | High | marker / H2 / ancestryを別verdict | B001 / architect |
| R3 | reviewer人数または起票者除外が縮退する | Low | High | 起票者以外2名をexplicit fieldでfail-closed | B001 / leader |
| R4 | engine doneをmain landing / Issue closeと誤表示 | Medium | High | Construction exitとexternal closeを別stateでhandoff | B001 / leader |
| R5 | CodeKBの意図されたfreshness差分を不具合と判定 | Low | Medium | whole-file diffではなくmarker / H2条件を測定 | B001 / conductor |

## Confidence and Falsification

B001のconfidence hypothesisは「同一SHAの全数走査でcleanを再現でき、external close未実施をrecordが正しく保持する」である。件数不一致、SHA欠落、reviewer不足、CI non-green、またはIssueが再計測前にclosedならこの仮説は反証され、stopとする。

## Topology Validation

`unit-of-work.md` はU001のみ、`unit-of-work-story-map.md` はFR 5 / 5・NFR 4 / 4をU001へ割当て、`components.md` は新規runtime topologyを0件とする。従ってB001のUnit包含に孤児、循環、topological deviationはない。
