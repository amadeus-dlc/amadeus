# Reliability Design — workspace-inspection

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。availability SLO/RTO/RPOを追加せず、classification completeness、read-only、projection determinismを設計する。

## Classification matrix

| Scenario | Result |
|---|---|
| root signal | classified Brownfield、root attribution、fallbackなし |
| parse可能submodule | classified Brownfield、submodule attribution、fallbackなし |
| no root signal + single nested | classified Brownfield、nestedRoot |
| no root signal + multiple nested | classified Brownfield、sorted candidates、nestedRootなし |
| complete read + no signal | classified Greenfield、既存bytes不変 |
| read/lstat failure、gitmodules unsafe/parse不能（root/safe signal併存を含む） | inconclusiveを優先、advisory、birth mutation 0 |

## Determinism・compatibility

同一filesystem snapshotから同一candidate order、language counts、framework order、build systemを返す。nested/submodule観測なしのclassified経路ではhuman output、detect JSON全体、state、auditをbyte-identicalにする。観測fieldは必要時だけadditiveに出す。

doctorは未初期化submoduleをadvisory表示するが単独で全体failにしない。inconclusiveは分類不能、path、remedyを明示する。scan前後tree bytesを比較し、permission failureや未初期化でもwrite 0を保証する。

## Verification design

root/candidate/metadata failure、malformed/unsafe gitmodules、safe+unsafe、root-signal+unsafe、single/multiple/depth2、language double-count、birth emitter未呼出、4 consumer同snapshot、golden bytesをpositive/negative fixtureで固定する。mixed unsafe fixtureは全てinconclusive優先・birth mutation 0とする。new retry、recovery write、event、metrics、retentionを追加しない。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U06-01〜06、`security-requirements.md`のfail-closed、`performance-requirements.md`のsingle scan、`scalability-requirements.md`のclosed capacity、`tech-stack-decisions.md`のtest stack、`business-logic-model.md`のDecision table/Verificationへ対応する。
