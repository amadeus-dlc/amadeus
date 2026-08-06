# Security Design: convergence-toolchain(U2)

上流入力(consumes 全数): business-logic-model

nfr-requirements は本 scope で SKIP のため security-requirements / tech-stack-decisions は設計どおり不在 — セキュリティ要求は requirements.md の FR-4b(4契約)・FR-7b(override 記録)・org/construction ガードレール(Security 節)から導出する。business-logic-model のフロー(status / report / override)とエラー分類を設計対象とする。

## 脅威と対策(CLI/ファイル境界 — 常駐サービスなし)

| 脅威 | 対象フロー | 対策(設計) |
|---|---|---|
| credential 漏洩 | 全 gh 実行 | token を保持・出力しない(gh credential store へ委譲 — 4契約 (iii))。GhError(型定義は FD domain-entities.md の C6 節 — `not-runnable` / `not-authenticated` / `command-failed`+stderrDigest の判別 union)の stderr は digest 化し生文字列を型に持たない(business-logic-model のエラー分類と整合) |
| シェルインジェクション | 全 gh 実行 | argv 配列のみで起動(4契約 (ii))— シェル文字列連結の不在をテストで固定 |
| 収束偽装(手書きレポート) | report/override | レポートは ConvergenceReport 型からの機械 render のみ(A-3)。センサー(C8 — U3 所有)が様式を advisory 可視化し、§12a レビュー観点が検査 |
| 無音バイパス | override | 最新実 HUMAN_TURN の audit 実在検証なしに受理しない(BR-U2-8)。受理は audit emit と対。converged:true への override は拒否 |
| 台帳への機微混入 | ledger 生成 | コメント本文は severity/terminalRefs 抽出後に bodyDigest 化(本文を record へ残さない — 260801-otel-meta-schema の HOME パス漏洩事故の教訓と同型の防御)。前提型 `ThreadComment.terminalRefs` は FD domain-entities.md の型ブロックへ反映済み(FD i2 FOLLOW-UP の是正確認済み — 抽出は digest 化の前) |
| 外部応答の様式偽装 | GraphQL parse | parse-don't-validate — 未知様式・未知 mergeStateStatus は throw(fail-closed)。信頼境界外入力を消費する新設 regex(terminalRefs 抽出・severity 写像)は敵対入力(100KB 級目安)での線形性実測を完成条件に含める(regex-linearity-untrusted-input) |

## 認可境界

- override verb のみが認可を要する(人間裁定の受理面)。検証は「audit シャードの最新 HUMAN_TURN 実在」の読取のみで、state 書込・ゲート緩和は行わない(このターンで副作用を実施した場合に限る早期 return は設けない — cg-early-return-scope)
- status/report は read-only(gh 読取+record 書込のみ)で認可不要。前進可否の判定はしない(ガードは C10 — 検証劇場を作らない)

## 入力検証

- CLI 引数(--pr / --unit / --reason)は SAFE_ID/数値 parse を通す(parse-don't-validate)
- GraphQL 応答は ReviewThread.parse が唯一の入口。fixture(実 PR 実測)が契約の正本

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T09:00:56Z
- **Iteration:** 2
- **Scope decision:** none

依存図BLOCKERは全辺一致で閉包、terminalRefs反映は範囲外だがFOLLOW-UPで引き継ぎ

### Findings

- FOLLOW-UP | security-design.md は terminalRefs フィールドが domain-entities.md 型ブロックへ「反映済み」と断定するが、読取範囲内の business-logic-model.md 末尾Review(iteration 2、同日付)は同フィールドの型ブロック未反映を未解決FOLLOW-UPとして記録しており、現在の domain-entities.md 実体で再確認が必要
