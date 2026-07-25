# Units Generation 質問と回答

## 回答方針

ユーザーの包括指示「質問は全部推奨でいいよ。」に基づき、以下はすべて推奨案を採用した。実装順や価値優先順位は Delivery Planning で決め、本ステージでは境界と依存トポロジーだけを確定する。

## Q1. Unit 境界戦略

どの境界で Unit of Work を分けるか。

- A. 検証可能な機能能力で分ける（推奨）
- B. TypeScript ファイル単位で分ける
- C. harness 単位で分ける
- D. 監査イベント種別で分ける
- X. その他

[Answer]: A（E-1466-UG-Q1、2026-07-25T06:03:38Z、ユーザーの包括指示に基づく推奨回答）

## Q2. Unit 粒度

どの粒度を採用するか。

- A. 3つの中粒度 Unit とし、各 Unit を独立に検証可能にする（推奨）
- B. 1つの粗粒度 Unit にまとめる
- C. ファイルごとの細粒度 Unit に分ける
- X. その他

[Answer]: A（E-1466-UG-Q2、2026-07-25T06:03:38Z、ユーザーの包括指示に基づく推奨回答）

## Q3. 依存関係の表現

Unit 間の依存をどう扱うか。

- A. 必要な直接依存だけを DAG に記録し、独立 Unit があれば並行可能性を残す（推奨）
- B. すべてを一列の依存にする
- C. 依存を記録せず Delivery Planning に委ねる
- X. その他

[Answer]: A（E-1466-UG-Q3、2026-07-25T06:03:38Z、ユーザーの包括指示に基づく推奨回答）

## Q4. Unit 間の統合契約

Unit 間の契約を何で固定するか。

- A. TypeScript directive、監査イベント、strict JSON process wire、audit-derived query で固定する（推奨）
- B. stderr 文字列で固定する
- C. 新しい永続設定モデルで固定する
- X. その他

[Answer]: A（E-1466-UG-Q4、2026-07-25T06:03:38Z、ユーザーの包括指示に基づく推奨回答）

## Q5. 配備モデル

各 Unit をどう配備するか。

- A. 既存 CLI/core に埋め込む単一リポジトリ配備とし、harness は canonical source から生成する（推奨）
- B. Unit ごとに独立サービスとして配備する
- C. grant 専用デーモンを追加する
- X. その他

[Answer]: A（E-1466-UG-Q5、2026-07-25T06:03:38Z、ユーザーの包括指示に基づく推奨回答）

## Q6. 分解計画の承認

「認可ドメイン」「solo gate transaction」「harness 契約と回帰保証」の3 Unit に分け、依存は前者から後者への直接依存だけを記録する計画を承認するか。

- A. 承認する（推奨）
- B. 計画を修正する
- X. その他

[Answer]: A（E-1466-UG-Q6、2026-07-25T06:03:38Z、ユーザーの包括指示に基づく推奨回答）

## 曖昧性分析

- 「機能能力」は、ユーザーが観測できる成果と独立したテスト境界を持つ縦の単位と定義した。
- 「並行可能性」は実装順の推奨ではなく、DAG 上で直接・間接依存がない Unit の集合だけを指す。
- user-stories stage は本 scope で成果物が存在しないため、story map は `requirements.md` の FR/NFR を検証可能な delivery scenario として扱う。
- 実装順、critical path、価値・リスクによる優先順位は本ステージでは決めず、Delivery Planning に留保する。
