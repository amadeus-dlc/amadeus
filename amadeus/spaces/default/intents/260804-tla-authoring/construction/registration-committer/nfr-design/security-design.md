# NFR Design: セキュリティ設計 — U4 registration-committer

上流入力(consumes 全数): 本 unit の解決済み consumes は `business-logic-model.md`(U4 functional-design、READY 確定)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent(設計どおりの欠落 — 内容を発明しない)。

## 守る資産と登録の真正性

U4 が守る資産は **登録(可視化点)の真正性と原子性** — 「model-map に載っている = 全前提 current の検証済み evidence が存在する」という読み手の単一不変条件(FR-010)。認証基盤・暗号は要件に存在しない(cid:nfr-design:c1)。

| 資産 / 脅威 | 対策(`business-logic-model.md` の確定設計の NFR 面) |
|---|---|
| 前提を欠いた登録(判定・coverage・proof・レビュー・承認の迂回) | 6 前提の全数検査 + `preconditions-failed` の全数集約(BR-U4-08 系)。CoverageProof / ProofEvidence / VerifiedBundle はブランド型のみ受理 — 未検証値の混入を型で遮断 |
| 承認偽装での登録 | HumanApprovalRef の provenance を登録直前に**再照合**(U2 生成時照合と独立の二重照合 — BR-U4-11。登録は不可逆の可視化点のため) |
| 自己レビューでの登録 | reviewer ≠ modelAuthor(いずれか空文字も拒否 — BR-U4-10) |
| stale evidence での登録 | compareIdentity の current 以外を拒否(BR-U4-09) |
| 部分更新の観測・map 破壊 | 書込前に map 全体を拡張 validator で検証 → temp + atomic rename。失敗時は旧 map 無傷(BR-U4-01/02/12) |
| 並行書込の lost update | rename 直前再読込 + bytes 比較で concurrent-modification 拒否(BR-U4-13)。PR 直列マージが第二の防衛線 |
| 既存 2 モデルの契約破壊 | schemaVersion 2 据え置き + optional key 追加(Q1 裁定)。既存エントリのバイト不変を AC-008 回帰で固定(BR-U4-06/17) |
| 必須 bundle 参照のバイパス(参照なしの新規登録) | authoring 経由の登録 draft は evidenceBundle 参照必須 — 参照なしの新規登録を commit の前段検査で拒否(BR-U4-05。optional は既存互換のためであり新規経路の省略を許さない) |

## 入力検証(システム境界)

- CLI 入力(draft / preconditions JSON)は未検証候補として parse し、手順 1 の全数検査を通過した値のみが承認済み型になる(parse-don't-validate — `domain-entities.md` の検証前後セマンティクス)。
- evidenceBundle.digest は `sha256:<hex64>` 形式検証 + VerifiedBundle との一致検査(手順 2)。
- validator 拡張は `exactObject` の意味論不変のまま key 集合のみ追加(未知 key の拒否は維持 — 恣意的フィールド混入の遮断)。

## 権限・攻撃面

- 新規のネットワーク経路・秘密情報はゼロ。書込は `specs/tla/model-map.json` の atomic replace ただ一つ(evidence store へは書かない — BR-U4-04)。
- 誤登録の回復は履歴 rewrite でなく通常 PR の revert(ADR-3 可逆性節 — `memory/project.md` の version-controlled 回復規律に一致)。
- CLI 起動は argv のみで shell 展開なし。

## 上流トレーサビリティ

- `construction/registration-committer/functional-design/business-logic-model.md`(commit アルゴリズム・validator 拡張)、`business-rules.md`(BR-U4 群)、`domain-entities.md`(2 層 failure・候補/承認済み型)
- `inception/requirements-analysis/requirements.md`(FR-009、FR-010、FR-013、NFR-002、NFR-003)
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T23:12:29Z
- **Iteration:** 1
- **Scope decision:** none

security-design と logical-components は BR-U4-01〜18(iteration 3 READY確定)の全引用が実在し、module境界・validator拡張の閉じ込め・unit境界とも整合しブロッカーなし

### Findings

- NIT | security-design.md §守る資産と登録の真正性 — BR-U4-05(evidenceBundle参照必須、新規経路の省略不可)が脅威表に含まれていない。BR-U4-04/06/08〜13/17は網羅されており実質的欠落ではないが、新規登録時の必須参照バイパスも登録の真正性を脅かす脅威の一つであり表に足すとより網羅的になる
