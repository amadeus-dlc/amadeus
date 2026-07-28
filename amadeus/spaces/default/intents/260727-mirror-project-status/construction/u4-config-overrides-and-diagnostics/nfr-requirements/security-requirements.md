# Security Requirements — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 入力検証(requirements NFR-2 — FR-5 の fail-closed)

- `mirror-projects` は closed schema: unknown key(config ルート)・unknown phase キー(status-names 内)・形式不正はすべて fail-closed で issue 化する(business-rules BR-U4-1 — 既存 unknown-key 拒否様式 amadeus-mirror-config.ts:335-339 の実装直読は business-logic-model が確認済み)。
- parse 失敗した層の値は同期・診断のどちらの入力にもしない(business-logic-model の層解決 — 有効値を持つ最後の層のみが入力)。

## 診断の read-only 保証(requirements FR-9b)

- `repair status` は remote mutation を発行しない — gateway mutation メソッド呼び出し 0 回を negative assert でテスト固定(business-rules BR-U4-4、受入条件12)。
- 診断は台帳を書き換えない(business-rules BR-U4-8 — read-only は state 面にも適用)。攻撃者が診断コマンドを繰り返しても remote・local の状態変化は構造的に発生しない。

## 秘匿(requirements NFR-4 / FR-6c)

- 診断出力(期待選択肢名+実在選択肢一覧)には Project 識別子・選択肢名・状態ラベルのみを含め、token・生の GraphQL 応答を転記しない(business-rules BR-U4-6 — U2 の redact 流儀)。
- 検証: 固有トークンを仕込んだ permission-denied 注入で診断出力 0 hit を assert(business-rules テスト規約)。

## 権限(requirements FR-10b)

- permission-denied の診断は対象 Project と必要権限(`project` scope)を示すに留め、認証 scope の自動変更・自動再認証を行わない(business-rules BR-U4-7)。
- U4 は新しい認証面・API 経路を追加しない(technology-stack 断面: 依存宣言変更 0 行 — 既存 gh credential store 委譲のまま)。
