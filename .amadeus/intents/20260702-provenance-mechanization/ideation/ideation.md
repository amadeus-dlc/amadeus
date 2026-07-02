# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | dev-scripts ルール（Bun + TypeScript、先に失敗する eval を追加してから実装する TDD）に従って `provenance:generate` と `provenance:check` を追加できる。`dev-scripts/promote-skill.ts` や Issue #309 の検出スクリプトと同じ配置方式を使える。build workspace と target workspace の path、commit、利用ツールの md5 は git コマンドとファイルハッシュで実測できる。 |
| 運用 | feasible | 現在は手書き Markdown で記録しているため、もっともらしく間違った値（md5、commit）が validator を pass する状態になっている。生成スクリプトの出力をそのままコミットする運用に変えれば、人間が値を手書きしなくなる。 |
| セキュリティ | feasible | スクリプトは workspace 内の path、commit、md5 の実測と記録だけで完結し、秘密情報や認証情報を扱わない。 |
| 依存 | feasible | Intent [20260701-self-development-cycle-stage-workspace](../../20260701-self-development-cycle-stage-workspace.md) の U002 Unit Design Brief が残した「evidence を JSON として標準化する必要が出た場合」という再確認条件がこの Intent で発火する。JSON スキーマは `.amadeus/steering/policies.md` の最低記録項目に対応させる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | provenance 記録の置き場所、JSON スキーマの項目構成、既存 Intent への遡及適用範囲、validator との連携範囲を判断する。 |
| Agent | 実行者 | `provenance:generate` を実行し、実測した記録をそのままコミットする。 |
| CI | 検出者 | `provenance:check` を `npm run test:all` の chain で実行し、記録と実測のずれ（md5 不一致、commit 不一致、参照先欠落）を検出する。 |
| Reviewer | 参照者 | dev-scripts 追加と policies.md、development.md 更新の PR 説明から、変更種別ごとの完了条件を確認する。 |
| Evaluator | 品質評価者 | provenance 記録の機械可読形式が確定した後、証拠内容の意味評価（#240）の入力にする候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | `provenance:generate` の実行から Intent 配下への JSON 記録出力、`provenance:check` の実行、drift（md5 不一致など）の検出と fail までの流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- provenance 記録の置き場所（Intent 配下のどの path にするか）は Inception で判断する。
- JSON スキーマの項目構成（policies.md の最低記録項目との対応）は Inception で判断する。
- 既存 Intent への遡及適用の要否と範囲は Inception で判断する。
- amadeus-validator との連携範囲（記録先の存在確認を validator に含めるか）は Inception で判断する。
- `examples/skill-provenance.json` との関係整理（統合するか、並立させるか）は Inception で判断する。

## 学習候補

- 手書きの md5 と commit はもっともらしく間違った値でも validator を pass するため、実測して生成する手段を同梱するほうが、検証の信頼性が上がる。
- 生成の機械化と検証の機械化を2段階に分けると、記録形式の確定を検証ロジックの確定より先に進められる。
- スクリプトの配置は実行時参照の要否で決まる。Issue #309 の検出スクリプトや Issue #311 の StateScaffold は skill の実行時に参照するため skill 同梱（`skills/amadeus-*/scripts/`）だが、provenance の生成と検証は repo の自己開発運用に属するため dev-scripts に置く（Issue #296 の実施候補）。
