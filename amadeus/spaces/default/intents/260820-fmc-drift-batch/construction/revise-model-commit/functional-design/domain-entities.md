# Domain Entities — revise-model-commit(U1 / #2289)

上流入力: `business-logic-model.md` / `business-rules.md` / `component-methods.md`(C2 変更面)/ `unit-of-work.md` U1 / `unit-of-work-story-map.md`(#2289 クローズ条件)/ `requirements.md` FR-REG 群 / `components.md` C2 / `services.md`(CLI 面)。本 unit は新規ドメイン概念を1つ(route 判別)だけ型として顕在化し、他は既存エンティティの変更で構成する。

## 新設されるエンティティ

| エンティティ | 所在 | 役割 |
|---|---|---|
| leaf モジュール `authoring-routes.ts` | `plugins/formal-model-check/tools/authoring-routes.ts`(新規) | `AUTHORING_ROUTES` 定数の唯一の正本(ADR-1)。import ゼロの終端 |
| `AuthoringRoute` 型(名称は実装時に確定してよい) | leaf または `tla-registration.ts` | `"author-new" \| "revise-model"` の閉ユニオン — compose の route 引数型 |
| `RegistrationFailure` の kind `revise-target-missing` | `tla-registration.ts:80-85` の union へ追加 | revise-model + 不在名の loud 拒否(name を運ぶ) |
| plugin.json `tools[]` 宣言行 | `plugins/formal-model-check/plugin.json:18` 配列 | leaf の t3078 全数宣言充足(1行、advisories[] 非接触) |

## 変更されるエンティティ

| エンティティ | 所在 | 変更 |
|---|---|---|
| `AUTHORING_ROUTES` | `tla-registration.ts:87` | 定義削除 → leaf import(消費 `:110` は不変) |
| `composeRegisteredMap` | 同 `:229-243` | route 必須引数追加(author-new = append / revise-model = 同名置換)。全 map validator 検証・sort・bytes 保存は不変 |
| `commit` | 同 `:314-` | precondition (a) 通過後の route を `:338` の compose 呼出へ伝搬 |
| t448 | `tests/unit/t448-tla-registration.test.ts:294-307` | 同名拒否 pin を author-new アームへ再スコープ + zero-assertion 早期 return の明示失敗化 |

## 不変のエンティティ(境界確認)

- `ModelMapEntryDraft` / `ModelMapSnapshot` / `RegistrationReceipt` / `RegistrationPreconditions` の各スキーマ — フィールド追加なし
- preconditions 6 検査(`checkPreconditions`)・approvalVerifier・atomic replace・競合検知 — 非接触
- `tla-applicability.ts`(`:302` の定義を含む)— U4 の write scope、本 unit は非接触
- t448 の自己参照比較ブロック(`:74-82`)— FR-X-4 起票対象、非接触
- map スキーマの `authoringProvenance` optional 性 — 不変(last-writer-wins は値の採り方であってスキーマ変更ではない)

## ライフサイクル

leaf 新設 + 定義置換 + route 対応 + plugin.json 宣言 + テストは1 PR で原子的に着地する(leaf だけ先行して dormant module を main に置かない — inception 規則の先行着地禁止に整合)。U4 の applicability 側 import 置換は本 PR に含めない(直列末端で実施)。
