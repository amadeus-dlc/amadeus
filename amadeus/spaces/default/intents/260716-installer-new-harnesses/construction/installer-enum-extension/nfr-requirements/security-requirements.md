# Security Requirements — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`、`../../../inception/requirements-analysis/requirements.md`、codekb technology-stack.md。

## 要求

- SR-1: 入力検証は既存 `HarnessName.parse` の membership 判定の保存(BR-3)— 寛容化(大文字小文字・部分一致)を導入しない。未知値は exit 2 で拒否
- SR-2: 新規依存を追加しない(Bun-only 前提の維持 — project.md Forbidden)。攻撃面の増加なし: ネットワーク経路・ファイル書き込み経路・シークレット扱いに変更なし(検証は fakeHttp fixture で完全ローカル)
- SR-3: 秘密情報のハードコード禁止(construction ガードレール)— 本 unit の変更面(列挙値・文言・テスト)に該当対象なし
- SR-4: 比例選定(build-and-test:c3): 新規攻撃面・新規依存・承認済みセキュリティ NFR がいずれも不存在のため、追加のセキュリティ検査(SAST 追加・依存監査の新設等)は選定しない — 既存必須 CI(lint/typecheck/テスト)の省略根拠にはしない

## 脅威モデル差分

なし — 信頼境界(GitHub codeload ダウンロード、ローカル FS 書き込み)は不変で、本 unit は境界内の値集合拡張のみ。
