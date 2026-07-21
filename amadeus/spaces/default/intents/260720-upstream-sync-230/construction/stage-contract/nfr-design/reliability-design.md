# Reliability Design — stage-contract

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。availability SLO/RTO/RPOを追加せず、schema determinism、compatibility、approval correctnessを設計する。

## Correctness matrix

| Scenario | Required behavior |
|---|---|
| 追加field absent | property非生成、既存bytes不変 |
| block/inline when | 同じtyped object、追加canonicalizationなし |
| invalid field/kind/map | 全mutation前reject、対象bytes不変 |
| kind/map未指定 | full matrixへ保守的under-prune |
| filter後required 0 | 当該Unitでvacuously covered |
| stage元required 0 | 実行証拠なし、vacuous扱いしない |
| applicable requiredあり | 全適用file実在までuncovered |
| optional artifact | directive候補、coverage exempt |

## Determinism・compatibility

parse→emit→parseのtyped value、authored order/value、追加field未使用stageのbytesを保持する。runtime graph欠落/malformed/kindなしはfull matrixへ倒し、過剰pruneによるfalse approvalを防ぐ。

directive、coverage、approval guardは同じtyped snapshotを共有する。validation errorは既存error面へ出し、新audit event、metrics、retention、fallback parserを追加しない。

## Verification design

absent/valid/wrong/empty/malformed、when 0/1/2/unknown key、produces_kinds orphan/duplicate、mixed tagged/untagged、optional、vacuous/non-vacuous、golden byteをpositive/negative fixtureで固定する。同一最終SHAのrepository gateとpatch coverageを要求する。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U01-01〜06、`security-requirements.md`のfail-closed、`performance-requirements.md`のcompile determinism、`scalability-requirements.md`のsingle snapshot、`tech-stack-decisions.md`のtest stack、`business-logic-model.md`のCoverage/Verificationへ対応する。
