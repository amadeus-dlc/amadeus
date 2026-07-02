# G001: provenance 記録の置き場所と検査境界

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [requirements.md](requirements.md)、[decisions.md](decisions.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | provenance 記録の置き場所は Intent 直下の `provenance/` ディレクトリとし、実行単位の JSON を累積する。ファイル命名規則は Construction の Functional Design で確定する。 | active | [requirements/R001-provenance-record-generation.md](requirements/R001-provenance-record-generation.md) | なし |
| GD002 | 既存 Intent への遡及適用はしない。`provenance:check` は `provenance/` ディレクトリが存在する Intent だけを検査対象にする。 | active | [requirements/R002-record-measurement-reconciliation.md](requirements/R002-record-measurement-reconciliation.md)、[decisions/D002-inspection-scope-boundary.md](decisions/D002-inspection-scope-boundary.md) | なし |
| GD003 | 記録先の存在確認を validator に含めない。存在確認も内容照合も `provenance:check` が担い、検査責務の境界（validator = 成果物構造、provenance:check = 実測値の照合、evaluator = 意味と接続性）を decisions に記録して親 Issue #315 の受け入れ条件を満たす。 | active | [requirements/R005-inspection-boundary-traceability.md](requirements/R005-inspection-boundary-traceability.md)、[decisions/D001-inspection-boundary-adoption.md](decisions/D001-inspection-boundary-adoption.md) | なし |
| GD004 | `examples/skill-provenance.json` とは並立させ、統合しない。将来の統合検討は #240 以降の候補として残す。 | active | [decisions/D003-skill-provenance-json-coexistence.md](decisions/D003-skill-provenance-json-coexistence.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: provenance 記録の置き場所を、Intent 直下の専用ディレクトリ、traceability や decisions への埋め込み継続、steering layer 直下の共有場所のどれにするか。
- 確認が必要な理由: 記録先が JSON スキーマの粒度（Intent 単位か repo 単位か）と `provenance:check` の検査対象範囲を決めるため。Ideation の未確定事項に「Inception で判断する」と記録されていた。
- 推奨回答: Intent 直下の `provenance/` ディレクトリに、実行単位の JSON を累積する。
- 推奨理由: provenance は Intent ごとの作業実行の事実であり、Intent 配下に置けば対象 Intent との対応が自明になる。traceability や decisions への埋め込みは Markdown の手書きを継続することになり、機械可読化の目的と矛盾する。steering layer 直下の共有場所は、どの Intent の記録かを別途対応付ける必要が生じ、複雑になる。
- ユーザー回答: 推奨回答どおり採用する。

### Q002

- 確定判断: GD002
- 確認したいこと: `provenance:check` の検査対象を、全既存 Intent への遡及適用、新規記録から開始し既存 Intent は対象外、のどちらにするか。
- 確認が必要な理由: 既存 Intent（18 件以上）には `provenance/` が存在せず、遡及適用する場合は当時の build workspace や host environment を再現できない可能性があるため。Ideation の未確定事項に「Inception で判断する」と記録されていた。
- 推奨回答: 既存 Intent への遡及適用はしない。`provenance:check` は `provenance/` ディレクトリが存在する Intent だけを検査対象にする。
- 推奨理由: 遡及適用は当時の実行環境を再現できない場合があり、検証できない値を無理に生成すると記録の信頼性を損なう。新規記録から適用範囲を広げる方が、実測の正確性を維持できる。
- ユーザー回答: 推奨回答どおり採用する。

### Q003

- 確定判断: GD003
- 確認したいこと: 記録先（`provenance/`）の存在確認を amadeus-validator の成果物構造検査に含めるか、`provenance:check` だけに担わせるか。
- 確認が必要な理由: 検査責務が validator と `provenance:check` に重複すると、責務境界が曖昧になり、親 Issue #315 の受け入れ条件（検査責務境界がいずれかの子 Issue に記録されていること）を満たせない可能性があるため。Ideation の未確定事項に「amadeus-validator との連携範囲は Inception で判断する」と記録されていた。
- 推奨回答: 記録先の存在確認を validator に含めない。存在確認も内容照合も `provenance:check` が担う。検査責務は、validator = 成果物構造の検証、provenance:check = 実測値の照合、evaluator = 意味と接続性の評価に分ける。
- 推奨理由: 既存コード分析で `AmadeusValidator.ts` に provenance 関連の検査が存在しないことを確認した。validator の既存責務（成果物 Markdown の構造検査）に実測値照合を混在させると責務が肥大化する。境界を明確に分けることで、親 Issue #315 の受け入れ条件を満たせる。
- ユーザー回答: 推奨回答どおり採用する。

### Q004

- 確定判断: GD004
- 確認したいこと: `examples/skill-provenance.json` と、この Intent が導入する Intent 単位の provenance 記録を統合するか、並立させるか。
- 確認が必要な理由: 両者とも「provenance」という語を使い、md5 や commit を記録する点で類似するため、混同や重複対応の懸念があるため。Ideation の未確定事項に「Inception で判断する」と記録されていた。
- 推奨回答: 統合せず並立させる。将来の統合検討は #240 以降の候補として残す。
- 推奨理由: `examples/skill-provenance.json` は example snapshot 再生成の鮮度管理に特化し、`staleReason` による例外記録の仕組みを持つ。この Intent が扱うのは Intent ごとの作業実行の実測記録であり、対象範囲（example vs 任意 Intent）と粒度（skill md5 のみ vs 9 項目）が異なるため、無理に統合すると両方の契約が複雑になる。
- ユーザー回答: 推奨回答どおり採用する。
