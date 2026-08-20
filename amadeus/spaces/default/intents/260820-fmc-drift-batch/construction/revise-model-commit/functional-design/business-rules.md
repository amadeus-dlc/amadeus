# Business Rules — revise-model-commit(U1 / #2289)

上流入力: `business-logic-model.md`(route 依存 compose 手順)/ `requirements.md` FR-REG-1〜6・NFR-1/2 / `unit-of-work.md` U1 / `unit-of-work-story-map.md`(#2289 クローズ条件)/ `components.md` C2 / `component-methods.md` C2 / `services.md`(registration verb の CLI 面 — revise-model が置換を受理)。

## 不変条件(是正後に成立していなければならない規則)

- **BR-1(route 正本)**: `AUTHORING_ROUTES` の定義は leaf `authoring-routes.ts` の1箇所のみ。`tla-registration.ts` 側に定義・再定義・ローカルコピーを残さない。census(帰属条件 — units-generation AC): `git grep -n -F 'AUTHORING_ROUTES' -- plugins/formal-model-check/tools/` で registration 側の**定義** 0 件・leaf に定義1件(applicability 側の定義除去は U4 の受け入れ基準で、U1 の PR 時点では `tla-applicability.ts:302` の定義が残存していてよい)。
- **BR-2(route 必須・fail-closed)**: `composeRegisteredMap` の route は default なしの必須引数。型は `"author-new" | "revise-model"` の閉ユニオンで、未知値はコンパイル境界で表現不能(NFR-2 — 実行時の素通り分岐を作らない)。
- **BR-3(revise-model の置換規則)**: 置換は draft.name と registered name の**完全一致1件**に対してのみ成立。0件 = `revise-target-missing` で loud 拒否(FR-REG-2 — fail-open の置換であり、append への暗黙フォールバック・警告付き続行・互換分岐を一切作らない)。同名が構造上2件以上あることは validator の unique 不変条件により先行拒否される(防御分岐を足さない)。
- **BR-4(author-new の現行維持)**: append + name 昇順 sort + 全 map validator 検証。同名衝突は validator-rejected(既存挙動・既存エラー契約とも不変)。
- **BR-5(provenance last-writer-wins)**: 置換 entry の `authoringProvenance` は draft 値のみ(旧値 merge 禁止)。置換対象の provenance 不在は置換可否に影響しない。map スキーマ(optional 性含む)不変。
- **BR-6(bytes 保存)**: route を問わず、非対象 entry は parse 済みオブジェクトからの再直列化で bytes 保存(旧 FD BR-U4-17 の継承)。書込は従来どおり temp-file + atomic rename、競合検知(re-read 比較)も不変。
- **BR-7(leaf の純粋性)**: leaf は定数 export のみ・import ゼロ。plugin.json `tools[]` への宣言1行は t3078(tools→plugin.json 全数宣言)が機械強制する。U3 との plugin.json 交差は `tools[]` / `advisories[]` の行非交差であり、依存辺は追加しない。
- **BR-8(テストの無音 pass 禁止)**: t448 の再スコープで zero-assertion 早期 return を残さない(#1982)。既存の自己参照比較ブロック(:74-82)は非接触(FR-X-4 起票対象 — U1 で修正も悪化もしない)。
- **BR-9(検証劇場禁止、NFR-1)**: `revise-target-missing` の拒否経路は実行結果由来の Result で返し、どのコードも消費しない検証フィールド・status ハードコードを作らない。

## エラー処理

- 新設エラーは `RegistrationFailure` への判別 kind `revise-target-missing`(name を運ぶ)1つのみ。CLI 面は `registrationCommit` の汎用 failure 直列化(`failed(committed.error)`)に乗るため、メッセージ整形の追加実装は不要 — kind と name が JSON で可視化される。
- 回復可能性: `revise-target-missing` は呼び手の入力誤り(登録名の取り違え)であり retryable(正しい名前で再実行)。`concurrent-modification` 等の既存分類・回復性は不変。
