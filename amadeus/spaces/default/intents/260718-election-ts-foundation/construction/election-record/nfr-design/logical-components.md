# Logical Components — election-record(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、domain-entities.md

## モジュール構成

| コンポーネント | 責務 | 公開 API(狭い面のみ) |
|---|---|---|
| `scripts/amadeus-election-record.ts` | U3 全体(render+verify)— 配置の典拠は unit-of-work.md U3 行+ADR-1(U-01=B 裁定) | 型: **GoaFreq/GoaLineCode/VerifyFinding/VerifyResult/TimelineEvent**(domain-entities.md 宣言の5型全数 — reviewer Major 是正: 旧記載 RecordDocument は新規発明につき撤回)。関数: render 系(コンパニオン)+verifyReservations/verifySelf |
| 内部(非公開) | GoA 行フォーマッタ・タイムライン整列 — 実装詳細として非 export(情報隠蔽) | なし(テストは公開 API+実 parseGoaLine round-trip 経由) |

- スタイルは functional-domain-modeling-ts 既決(project.md Code Style): GoaLineCode はブランド型+スマートコンストラクタ、検査結果は判別ユニオン Result(functional-design:c11 の役割分担 — parse/build はコンパニオン static 相当)
- 依存方向: U3 → U1 のみ(unit-of-work-dependency.md:23 — depends_on: [election-model])。U5 が U3 を配線する(:27)

## NFR 横断の設計制約

- 性能(performance-requirements.md O(n))・入力検証(security-requirements.md fail-closed)・ステートレス(scalability-requirements.md)・互換(reliability-requirements.md NFR-4)の4要件は全て上表の単一モジュール内で成立し、モジュール追加を要しない(tech-stack-decisions.md の選定と一体)

## テスト配置

- unit 層(fs 非依存 — 実 parseGoaLine import も fs を触らない。tech-stack-decisions.md のテスト行と一致)。BR-R1〜R6 は全て公開 API 経由
