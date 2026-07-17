# Performance Design — answer-evidence-sensor

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜3)、`../nfr-requirements/scalability-requirements.md`(SC-1/2)、`../nfr-requirements/reliability-requirements.md`(R-1〜3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数2段パイプライン)。

## 設計

- P-1 実現: 検査は (1) basename 判定(文字列)(2) パスセグメント parse(3) 単一ファイル readFileSync+行走査(述語内)— I/O 1回・O(行数)。timeout_seconds: 5 を manifest に明記(強制メカニズム = dispatcher の既存 timeout 機構)。
- P-2 実現: matches `**/*-questions.md`(狭 glob)を manifest に固定 — 発火面の一次選別を hook 層で行い、script spawn 自体を questions 書込み時に限定。

## 保証機構(モジュール別 — 一枚岩の断定を避ける)

hook 層 = glob 選別 / dispatcher 層 = timeout 強制 / script 層 = 単一ファイル読みのみ(ループ・再帰なし)。
