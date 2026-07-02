# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | `provenance:generate` と `provenance:check` の dev-scripts を Bun + TypeScript で追加する。 | [Issue #296](https://github.com/amadeus-dlc/amadeus/issues/296) | 採用 |
| SC-IN-002 | dev-scripts ルールに従い、先に失敗する eval を追加してから実装する。 | [Issue #296](https://github.com/amadeus-dlc/amadeus/issues/296) | 採用 |
| SC-IN-003 | `provenance:check` を `npm run test:all` の chain に組み込む。 | [Issue #296](https://github.com/amadeus-dlc/amadeus/issues/296) | 採用 |
| SC-IN-004 | `.amadeus/steering/policies.md` の provenance 記録方法を、生成スクリプト前提の記述へ更新する。 | [Issue #296](https://github.com/amadeus-dlc/amadeus/issues/296) | 採用 |
| SC-IN-005 | `.amadeus/development.md` の stage と workspace 対応記録の表を、新しい記録先に合わせて更新する。 | [Issue #296](https://github.com/amadeus-dlc/amadeus/issues/296) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | 証拠内容の意味評価（#240 evaluator の対象）。 | [Discovery Brief](../../../discoveries/20260702-evidence-record-and-evaluation.md) | 採用 |
| SC-OUT-002 | steering knowledge の契約変更（#297 の対象）。 | [Discovery Brief](../../../discoveries/20260702-evidence-record-and-evaluation.md) | 採用 |
| SC-OUT-003 | LLM による意味評価。 | [Discovery Brief](../../../discoveries/20260702-evidence-record-and-evaluation.md) | 採用 |
| SC-OUT-004 | `examples/skill-provenance.json` の置き換え。関係整理は未確定事項として Inception へ引き継ぐ。 | [Issue #296](https://github.com/amadeus-dlc/amadeus/issues/296) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | infra | `provenance:generate` と `provenance:check` の dev-scripts 追加と CI 組み込みを整備する Intent であるため。 |
| 省略 stage | なし | Requirement、Use Case、Unit、Bolt へ分解し、Construction で dev-scripts 実装、policies.md と development.md の更新、CI 組み込みを実行できる状態へ進めるため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | JSON スキーマの項目構成、既存 Intent への遡及適用範囲、validator との連携範囲を後続 Intent が参照できる粒度で定義するため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | eval の TDD（RED → GREEN）、`provenance:check` の CI 組み込み、`npm run test:all` による drift 検出の確認が必要であるため。 |

## Inception への引き継ぎ

- provenance 記録の置き場所（Intent 配下のどの path にするか）を確定する。
- JSON スキーマの項目構成（policies.md の最低記録項目との対応）を確定する。
- 既存 Intent への遡及適用の要否と範囲を確定する。
- amadeus-validator との連携範囲（記録先の存在確認を validator に含めるか）を確定する。
- User Stories は省略見込みとして扱う。相互作用主体がシステムと運用者のツーリングであり、人間アクターのユーザー価値表現が不要なため。確定は Inception で判断する。
- `examples/skill-provenance.json` との関係整理（統合するか、並立させるか）を確定する。
