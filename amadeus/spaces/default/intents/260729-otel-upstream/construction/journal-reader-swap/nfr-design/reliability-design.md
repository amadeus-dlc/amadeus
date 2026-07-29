# Reliability Design — U6: journal-reader-swap

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の中核（不可視性・tool 単位 rollback・失敗経路の確定性）に対する設計。

## 不可視性の保証設計

- 各 tool の CLI 出力・終了コード・エラーメッセージ形式を差替え前後で変更しない（BR-2）。変更が必要になった場合は Unit 範囲外へ差し戻す（BR-20）
- 差替えの検証は 3 層: (1) fixture＋ゴールデンを実装に先行作成、(2) 旧 reader 経由と共通 reader 経由の出力一致を 3 fixture（v1-only／v2-only／mixed-version）で固定（BR-11）、(3) 既存テストを一切変更せず全 pass（BR-3）。既存テストの修正が必要になった場合は設計不備として差替えをやり直す

## rollback の設計

- 差替えは tool 単位で完結させ、tool 間で差替え状態を共有する仕組み（共通フラグ・段階管理ファイル）を持たない（BR-6）
- 1 tool のみ revert した構成で残り 6 tool のテストが全 pass することを検証し、rollback の独立性を証明する（BR-22）
- 撤回手段は git revert と差替え前 backup に限定（FR-MIG-2 と整合）。恒久 dual-read は禁止し、本番経路は共通 reader 一本（BR-13、FR-MIG-1）

## 失敗経路の確定性

- 判別不能な schema version の行は silently skip せず判別可能なエラーで返す（BR-4）。v2-only 構成での v1 shard 遭遇も同様（BR-18）
- エラーハンドリングはドメイン境界＝判別ユニオン Result、CLI 境界＝emitError、不変条件違反のみ例外（BR-14、team-practices ## Code Style）
- 欠損 shard は空集合の正常系（BR-19）。v1 record の v2-only 属性欠損は許容し、runtime graph は edge を推測・合成しない（BR-8、BR-16）
- v1 codec 非搭載構成で 7 tool が v2 Journal を読めることをテストで証明し、削除ゲート FR-MIG-4(a) の入力とする（BR-7、FR-JRN-4 後段）
