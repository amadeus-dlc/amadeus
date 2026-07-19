# Logical Components — election-store(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## モジュール構成

| コンポーネント | 責務 | 公開 API(狭い面のみ) |
|---|---|---|
| `scripts/amadeus-election-store.ts` | U2 全体(I/O 層)— 配置の典拠は unit-of-work.md U2 行+ADR-1(U-01=B 裁定) | 型: StoreError/Ledger/ElectionStatus/ElectionState(domain-entities.md 宣言の4型)。関数: Store.create/appendBallot/materialize/load/status/appendTimeline(business-logic-model.md 操作フロー全6verb) |
| 内部(非公開) | writeStoreFile(tmp+rename)・パス構成関数 — 実装詳細として非 export(情報隠蔽) | なし(テストは公開 API 経由の integration 層) |

- スタイルは functional-domain-modeling-ts 既決(project.md Code Style): StoreError は判別ユニオン、Store はコンパニオン static 相当の I/O 関数群(functional-design:c11 — I/O 層は純関数層と異なりドメイン型のインスタンスメソッドを持たない)
- 依存方向: U2 → U1 のみ(unit-of-work-dependency.md:21 — depends_on: [election-model])。U5 が U2 を配線(:27)

## NFR 横断の設計制約

- クラッシュ耐性(reliability-requirements.md)・書込境界(security-requirements.md)・単一書込主体(scalability-requirements.md)・O(1) 追記(performance-requirements.md)は全て writeStoreFile 単一経路+選挙 ID 分離の2構造で成立し、追加モジュールを要しない(tech-stack-decisions.md の選定と一体)

## テスト配置

- integration 層(実 FS — fs-tests-integration-first)。クラッシュ注入 fixture 含む
