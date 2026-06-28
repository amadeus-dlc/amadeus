# Construction Design

## 概要

- 対象 Bolt は B001 Discovery Brief 記録である。
- 対象 Unit は U001 Discovery Brief 記録である。
- 対象要求は R001 Discovery Brief を記録できる、対象ユースケースは UC001 入力テーマと判断を記録するである。
- この設計は、Discovery Brief に入力テーマ、確認した前提、判定、判定理由、推奨次アクションを残すための Task 生成根拠である。
- この設計では、Intent 候補提示、Intent 初期化、Requirement、Use Case、Unit、Bolt、Task の定義、実装証拠化を扱わない。

## Domain Design

- **Discovery Brief** は、Intent 化前の判断記録である。
- Discovery Brief は、入力テーマ、確認した前提、判定、判定理由、推奨次アクションを保持する。
- **判定** は、入力テーマを単一 Intent として扱えるか、複数 Intent に分けるかを示す判断である。
- **判定理由** は、判定と対応する根拠である。
- **推奨次アクション** は、後続の Intent 候補確認へ進むための案内である。
- Discovery Brief は、Requirement、Use Case、Unit、Bolt、Task を定義しない。
- Intent 候補は B002 の責務であり、B001 では後続が参照できる判断記録だけを成立させる。

## Logical Design

- Discovery Brief の保持構造は、入力テーマ、確認した前提、判定、判定理由、推奨次アクションを必須項目として扱う。
- 判定と判定理由は、同じ Discovery Brief 内で対応を確認できる状態にする。
- 推奨次アクションは、Intent 候補確認へ進む内容として記録する。
- Discovery Brief の確認状態は、記録済み、確認待ちのいずれかとして扱える設計にする。
- 後続の B002 は、B001 が記録した入力テーマ、判定、判定理由、推奨次アクションを参照する。
- 既存コード調査では、対象 workspace が例示成果物中心であり、実装コードは存在しないことを確認した。
- そのため、B001 の Construction Design は、実装対象コードではなく Amadeus 成果物として成立する記録項目と責務境界を Task 化する。

## 実装設計

- T001 では、Discovery Brief の必須記録項目を定義し、入力テーマ、確認した前提、判定、判定理由、推奨次アクションを欠けなく扱う。
- T002 では、判定、判定理由、推奨次アクションの対応関係を整理し、後続の Intent 候補確認が参照できる形にする。
- T003 では、Discovery Brief の責務境界を固定し、Requirement、Use Case、Unit、Bolt、Task を Discovery Brief 内で定義しないことを確認可能にする。
- T004 では、記録済み、確認待ちの確認状態と、B002 へ渡す参照項目を整理する。
- 保存操作、UI 表現、具体的なファイル更新処理は、この Bolt の設計準備では実装しない。
- 実装時は、既存の `.amadeus/discoveries/*/brief.md` の見出し粒度と、R001、UC001、U001 の責務境界を合わせる。

## 検証設計

- T001 の検証では、Discovery Brief に入力テーマ、確認した前提、判定、判定理由、推奨次アクションが存在することを確認する。
- T002 の検証では、判定と判定理由が対応し、推奨次アクションが Intent 候補確認へ接続することを確認する。
- T003 の検証では、Discovery Brief が Requirement、Use Case、Unit、Bolt、Task を定義していないことを確認する。
- T004 の検証では、確認状態と B002 への参照項目が、後続の Intent 候補提示で使える形になっていることを確認する。
- 検証入口は、Construction 後続段階で追加するテストまたは validator 実行結果に記録する。
- この段階では、実装コード、テストコード、`test-results.md`、PR 記録を作らない。

## 設計変更記録

- 2026-06-28: B001 の Construction Design を作成した。
- 2026-06-28: Discovery Brief 記録を、必須項目、判断対応、責務境界、後続参照の Task 集合へ分解した。
