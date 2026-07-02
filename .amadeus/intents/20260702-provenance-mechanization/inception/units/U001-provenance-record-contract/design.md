# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、provenance 記録契約の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
JSON スキーマの詳細型、実測手順の詳細、policies.md と development.md の更新文言は Construction で確定する。

## 設計戦略

- 生成の機械化と検証の機械化の 2 段階として扱う（Issue #296 の確定判断）。生成は実測（git コマンド、ファイルハッシュ）だけで値を作り、人間の手書きを排除する。照合は記録の再計算で drift を検出する。
- 記録先は Intent 直下の `provenance/` ディレクトリとし、実行単位の JSON を累積する（GD001）。
- 検査対象は `provenance/` ディレクトリが存在する Intent だけとし、既存 Intent へ遡及しない（GD002）。
- 記録先の存在確認は validator に含めず、存在確認も内容照合も `provenance:check` が担う（GD003）。検査責務は、validator = 成果物構造の検証、provenance:check = 実測値の照合、evaluator = 意味と接続性の評価に分ける。
- `examples/skill-provenance.json` とは統合せず並立させる（GD004）。将来の統合検討は #240 以降の候補として残す。

## 責務境界

- 所有するもの: `provenance:generate` と `provenance:check` の dev-scripts と eval、`npm run test:all` chain への組み込み、policies.md と development.md の記録方法の記述整合、検査責務境界の decisions への記録。
- 所有しないもの: 証拠内容の意味評価（evaluator、#240 の責務）、steering knowledge の契約変更（#297 の責務）、validator の成果物構造検証そのものの変更、`examples/skill-provenance.json` の統合。
- 依存してよいもの: git コマンド、ファイルハッシュ計算、既存の dev-scripts 配置方式（`promote-skill.ts`、`.agents/skills/amadeus-validator/scripts/StateScaffold.ts` と同じ配置方式）、Bun 実行環境、`npm run test:all` の既存 chain 構造。
- 後続で再確認が必要になる条件: #240 evaluator で評価軸が増え、記録契約と評価契約が別価値になった場合。`examples/skill-provenance.json` との統合検討が #240 以降で具体化した場合。

## 構成候補

- 記録生成: build workspace と target workspace の path と commit、host environment の識別情報、target artifacts の対象範囲、利用した昇格済み skill / validator / 開発用スクリプトの path、commit、md5、stage 判定の根拠、人間による次回 stage0 採用判断の有無を実測して JSON を出力する。
- 記録照合: 記録済み値を再計算し、md5 不一致、commit 不一致、参照先欠落を検出する。
- 検査対象境界: `provenance/` ディレクトリが存在する Intent だけを検査する。
- 標準検証組み込み: `npm run test:all` の chain（`test:it:all` など既存の束ね方）への組み込みを扱う。
- 記録方法文書整合: policies.md と development.md の記述更新を扱う。
- 検査責務境界の記録: validator、provenance:check、evaluator の境界を decisions に記録する。

## データと契約候補

- 入力候補: 対象 workspace の path、対象 Intent ディレクトリ名、（check 時は）検査対象範囲（`provenance/` 存在 Intent 一覧）。
- 出力候補: `provenance/` 配下の機械可読 JSON（policies.md の最低記録項目 9 項目と 1:1 対応）、check の実行結果要約（drift の有無、不一致項目）。
- 状態候補: 生成直後（初回記録）、再計算による照合（drift 検出）。
- 事前条件候補: 対象 Intent ディレクトリが存在する。git リポジトリとして実行できる。
- 事後条件候補: 生成直後の出力だけで policies.md の最低記録項目を満たす。check の実行結果が drift の有無を明示する。
- 不変条件候補: `provenance/` を持たない既存 Intent は検査対象にならない。人間は JSON の値を手書きしない。

## 検証観点

- 6 項目相当の実測（path、commit、md5 など）が固定入力（既知の workspace、commit）で検証できる。
- 実装前に eval が失敗することを確認する（RED の記録）。
- drift ケース（md5 不一致、commit 不一致、参照先欠落）がそれぞれ eval で検出される。
- `npm run test:all` chain への組み込みが `test:it:all` など既存の束ね方と整合する。
- 昇格が不要な dev-scripts であるため、promote 同期の検証は対象外である。

## Bolt 分割方針

- B001 で `provenance:generate` の dev-script と eval を実装する（生成ロジックの実装を含む）。
- B002 で `provenance:check` の dev-script と eval、`npm run test:all` chain への組み込みを実装する（B001 に依存）。
- B003 で policies.md と development.md の記録方法更新、検査責務境界の decisions への記録を行う（B001、B002 に依存）。

## Construction への引き継ぎ

- Functional Design で確定する事項: JSON スキーマの項目の詳細型と命名、`provenance/` 配下のファイル命名規則（GD001）、実測手順（git コマンドとファイルハッシュの具体的な取得方法）。
- 文書変更で確定する事項: policies.md と development.md の更新後の具体的な文言。
- 検証時に確定する事項: eval の置き場所（`dev-scripts/evals/` 配下の具体的なディレクトリ名）と `package.json` の実行入口名（`provenance:generate`、`provenance:check` の npm script 名と `test:all` chain への組み込み位置）。
