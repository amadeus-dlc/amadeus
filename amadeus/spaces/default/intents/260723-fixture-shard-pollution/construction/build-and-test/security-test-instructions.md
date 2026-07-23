# Security Test Instructions — 260723-fixture-shard-pollution（#1389）

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

本 B&T は code-generation-plan.md が定めた修正設計(根 = `recordEngineError` の projectDir 貫通 / 増幅 = clone-id の projectDir キー化)とテスト追加方針、および code-summary.md の実装内容・検証結果を検査対象とする(requirements.md の FR/NFR は上位の受け入れ基準として併せて参照)。

## 判定: N/A（専用セキュリティテストは選定しない）

cid:build-and-test:c1 / c3 の比例選定基準に従い、攻撃面・依存・承認 NFR を成果物で実測明記した場合にのみセキュリティ検査を比例選定する。本 intent はそのいずれにも該当しない:

- **攻撃面の拡大なし**: 修正は内部のエンジン監査ヘルパ(`recordEngineError`)の projectDir 解決と、プロセス内 clone-id メモのキー化に閉じる。ユーザー可視の CLI 契約(directive JSON stdout / advisory stderr)は不変(requirements FR-4)。外部入力の新規パース経路・ネットワーク境界・認証認可の変更はない。
- **依存の追加なし**: 新規 runtime dependency を導入しない(requirements NFR-3)。サプライチェーン面の新規リスクなし。
- **シークレット非関与**: 認証情報・トークンの取扱い変更なし。`.amadeus-clone-id` は gitignored な per-clone トークン(ホスト識別子であり秘密情報ではない)で、その解決経路の内部化はむしろ **ambient 実 record への意図しない書込み(監査整合性の毀損)を封鎖する方向**の是正である。

本修正はセキュリティ姿勢に対して中立〜わずかに正(監査整合性の保護)であり、専用のセキュリティテスト対象(インジェクション・認可バイパス・機密漏洩)を新設する根拠がない。戦略名だけで検査を機械追加しない(cid:build-and-test:c1)。

## 再評価条件

以下のいずれかが成立した場合、本 N/A 判定を再評価する:
- 監査シャードの内容・パス解決に信頼境界外の入力(ユーザー制御の projectDir パス等)が関与し、パストラバーサル等の攻撃面が生じる。
- clone-id / shard 名にユーザー制御文字列が混入し、ファイル名インジェクションの経路が生まれる。
- 承認済み NFR にセキュリティ要件(認証・認可・機密性・監査改竄耐性の定量基準)が追加される。

上記が満たされない限り、セキュリティテストは比例原則により不追加とする。既存の必須 scan・要求済み検査の省略根拠には本 N/A を用いない(cid:build-and-test:c3)。
