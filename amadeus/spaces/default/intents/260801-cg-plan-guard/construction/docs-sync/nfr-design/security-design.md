# Security Design — docs-sync(U4)

上流入力(consumes 全数): business-logic-model.md
- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は該当ステージが本スコープで SKIP のため設計どおり不在(consumes_absent expected)— 代替正本は requirements.md の NFR-1〜4。

- セキュリティ面は docs の記述内容(秘密情報を含めない)にのみ関係する(`business-logic-model.md` の同期規則どおり)。

## セキュリティ設計

- docs にトークン・実パス(マシンローカル)・秘密を書かない。ガードメッセージの説明は様式(3部)の説明に留め、認可・ゲート挙動の緩和手順を記載しない。

## 検証形

- 専用検査 N/A(根拠: コード変更ゼロ)。レビューで秘密・ローカルパス混入の目視+grep を行う。
