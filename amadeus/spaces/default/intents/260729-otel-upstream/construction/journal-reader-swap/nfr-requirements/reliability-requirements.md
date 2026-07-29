# Reliability Requirements — U6: journal-reader-swap

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 不可視性（完了の主条件）

- **CLI 契約不変**: 各 tool の CLI 出力・終了コード・エラーメッセージ形式を差替え前後で変更しない（BR-2）。公開 CLI Interface（サブコマンド・引数・オプション名）も不変で、変更が必要な場合は Unit 範囲外へ差し戻す（BR-20）
- **既存スイート不変 pass**: doctor／recovery／presence／grant／merge／runtime graph／learnings の既存テストを一切変更せず全 pass。既存テストの修正が必要になった場合は設計不備として差替えをやり直す（BR-3）
- **出力同一性**: 各 tool について、v1-only／v2-only／mixed-version の3 fixture に対し、旧 reader 経由と共通 reader 経由の出力が一致することをテストで固定（BR-11、BR-2/BR-3 の検証手段）

## rollback（tool 単位）

- **独立性**: rollback は tool 単位で独立に行え、tool 間で差替え状態を共有する仕組みを持たない（BR-6）。1 tool の revert が残り 6 tool の差替え済み経路に波及しないことを、当該 tool のみ revert した構成で残 tool が全 pass するテストで検証する（BR-22）
- **手段の限定**: 撤回手段は git revert と差替え前 backup に限定（BR-6、FR-MIG-2 と整合）
- **恒久 dual-read 禁止**: 差替え期間中も本番経路は共通 reader に一本化し、並行参照は同一性検証テスト内に限定（BR-13、FR-MIG-1）

## 失敗経路の確定性

- 判別不能な schema version の行は silently skip せず判別可能なエラーで返す（BR-4）。v2-only 構成での v1 shard 遭遇も同様（BR-18）
- エラーハンドリングはドメイン境界＝判別ユニオン Result、CLI 境界＝emitError、不変条件違反のみ例外（BR-14）
- 欠損 shard は空集合の正常系（BR-19）。v1 record の v2-only 属性欠損は許容し、runtime graph は edge を推測・合成しない（BR-8、BR-16）
- **v2-only 証明**: v1 codec 非搭載構成で 7 tool が v2 Journal を読めることをテストで証明し、削除ゲート FR-MIG-4(a) の入力とする（BR-7、FR-JRN-4 後段）
