# Scalability Design — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-requirements/scalability-requirements.md`(SC-1〜3)、`../nfr-requirements/performance-requirements.md`、`../nfr-requirements/security-requirements.md`、`../nfr-requirements/reliability-requirements.md`、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(F-3)。

## 設計(成長軸 = ハーネス数)

- SD-1: 追加コスト一定化の機構 = 全数台帳(8サイト+テスト2本+README)+ literal 契約テストによる欠落の機械検出(SC-1)。台帳は requirements.md FR-4 AC-4b に正本を置き、本 unit では複製しない(canonical 1定義 — construction ガードレール)
- SD-2: 汎用機構の無改修スケール(F-3)を守る設計制約: wizard = `HarnessName.all` 駆動、payload = `readdirSync` 駆動のまま — 列挙数 n に対する変更箇所は台帳の定数箇所のみ(SC-2)
- SD-3: 実行規模のスケール設計は N/A(SC-3 の根拠を継承 — 単発 CLI・ランタイムサービス不存在)

## 将来の縮退・拡張

7値目追加時も本設計は不変(台帳更新のみ)。ハーネス削除時は同じ台帳を逆向きに辿る — 専用の削除機構は作らない。
