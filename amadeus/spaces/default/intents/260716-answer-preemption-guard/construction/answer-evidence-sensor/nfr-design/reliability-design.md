# Reliability Design — answer-evidence-sensor

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜3)、`../nfr-requirements/scalability-requirements.md`(SC-1/2)、`../nfr-requirements/reliability-requirements.md`(R-1〜3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数2段パイプライン)。

## 設計

- R-1 実現: script 内で throw しうるのは readFileSync 系のみで、それは述語が no-file→pass で吸収(ENOENT は throw 前に existsSync 判定 — 述語 :1174 実装済み)。想定外 throw は dispatcher の SCRIPT_ERROR 真理値表(decideOutcome :520)が advisory 扱いで吸収 — 二重の非ブロック保証。
- R-2 実現: gate-start 層は本 script を import しない(共有は amadeus-lib の述語+定数のみ)— 障害独立。
- R-3 実現: 入力はファイル内容と定数のみ(Date.now/乱数なし)— 決定性を構成的に保証、C-5 で2回実行一致をピン。

## 失敗様式の分離

script クラッシュ(SCRIPT_ERROR)/ 検査 fail(SENSOR_FAILED)/ 対象外 skip(SENSOR_PASSED+skipped)の3様式を dispatcher 真理値表・JSON フィールドで判別可能に保つ — 相互代用しない。
