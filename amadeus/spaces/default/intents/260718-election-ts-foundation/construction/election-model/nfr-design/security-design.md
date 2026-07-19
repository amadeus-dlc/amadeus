# Security Design — election-model(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、domain-entities.md

## fail-closed 境界の設計

security-requirements.md の入力検証要件を型で実現する:

- `Ballot.parse(raw, election): Result<Ballot, BallotError>` — 正準名は domain-entities.md:18 の `BallotError`(component-methods.md:12 とも一致 — reviewer Critical 是正: 旧起草の BallotRejection は新規発明につき撤回)。5クラスの拒否理由を判別ユニオンで返す(business-logic-model.md 票検証フローの型化)。検証済みであることを Ballot 型が運ぶ(parse-don't-validate — 未検証データが tally へ到達する経路を型で遮断)
- GoA は branded 整数型 `Goa`(1-8)のスマートコンストラクタのみで構築(goa-out-of-range を構築時点で拒否 — verification-numeric-parse の型面実装)

## blind 性の型設計

- `DistributionView` は `{ electionId; voter; ordered: Array<{ displayNo; internalNo; label }> }`(domain-entities.md:12 の実定義を転記)のみのフィールド構成 — 推奨・先行票・他者状況に相当するフィールドを型宣言に持たない(security-requirements.md の構造的 blind。BR-2 のキー全数 assert が消費者)
