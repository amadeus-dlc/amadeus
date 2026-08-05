# Business Rules — `advisory-auto-resolution`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `requirements.md` 領域 G(FR-ADV-1〜5 — 全規則の trace 先)、`components.md` ADR-6 / ADR-9 / ADR-11、`component-methods.md` §C16 / §C17(逐語契約)、`services.md` `:192`(lock 指摘)、`unit-of-work.md` §`advisory-auto-resolution` 実装上の制約、`unit-of-work-story-map.md` §`advisory-auto-resolution`(落ちる実証の対象)。

---

## 決定規則と不変条件

| # | 規則 | 出所 |
| --- | --- | --- |
| R1 | **第 2 receipt 経路は認可成立時のみ**: `AUTO_DECIDED` basisFingerprint を provenance とする受理は autonomy 認可(full / semi の梯子)が成立したときだけ。不成立の全経路(mode=none・失効 grant・scope 不一致)は人間経路(`await-advisory-choice`)へ戻る | FR-ADV-1 / FR-ADV-2 |
| R2 | **人間経路の強度維持**: `human-turn` provenance の受理 3 点(grounding / 重複排除 / 提示照合)は現行と同値の強度を保つ | FR-ADV-2(等価強度)/ §C17 の表 |
| R3 | **置換であり並存でない**: 受理関数は provenance 判別ユニオンを受ける 1 本(`recordAdvisoryChoice`)のみ。人間用・自動用の関数複製・分岐コピーを作らない | FR-ADV-3 / C-7 |
| R4 | **二重 receipt の provenance 跨ぎ排除**: 同一 advisory identity に active な receipt があれば、provenance 種別に関わらず 2 件目を拒否する | FR-ADV-3 受け入れ基準 |
| R5 | **`run_required: true` は強制実行**: 無人経路は `defer-with-risk` を選べない。主 = 選択肢空間(optionIds から除外)/ 従 = 効果分類(`quality-waiver` ∈ `PROHIBITED_EFFECTS`)。人間経路の可否は変更しない | FR-ADV-4 / ADR-11 |
| R6 | **plugin 非依存の射程限定**: 「plugin 非依存」と主張してよいのは hold 判定の面のみ。`run_required` 経路(`formalCheckRoute:685` のハードコード)についてその主張を書かない — 本 FD を含む全成果物・docs に射程注記を保つ | FR-ADV-5 |
| R7 | **schema 昇格は読替なし**: store `schema: 2` へ昇格し、schema 1 は既存 fail-closed 経路(hold)に委ねる。migration・読替コードを書かない | ADR-9 |
| R8 | **InteractionKind を増やさない**: advisory の選択は `kind: "question"` occurrence へ写像(selector で一意化)。新種別の追加は Out | FR-ADV-1(Out 裁定)/ ADR-6 |
| R9 | **directive 検証面に触れない**: `amadeus-directive.ts:684-688` は本 Unit の diff に現れない(強制の実装層は guard / resolver 側) | ADR-11 Option B 却下 / C-3 |
| R10 | **エラー様式の維持**: `boolean` / `ParseResult<T>` の既存様式のみ。新しい例外経路を作らない | §C17 エラー処理の方針 |
| R11 | **梯子縮退の観測**: selector の instance 含有により実効 3 段(norm / solo-election / agent-recommendation)へ縮退する — U-2 のユーザー裁定(Bolt 1 ゲート回付済み)まで、この縮退を変更する設計判断を Unit 内で行わない。裁定の basisKind 分布を diary へ記録する | ADR-6 / U-2 |

## バリデーション論理

- C16 の翻訳は許可リスト型: `resolved` になる条件は「`decided` ∧ `run-now`」の 1 通りのみで、他は列挙によらず全て `human-required`(未知の結果種別も自動的に人間経路 — fail-closed)。
- `auto-decision` provenance の grounding は journal の `AUTO_DECIDED` 実在照会であり、receipt の自己申告を信用しない(検証劇場の回避 — org.md Forbidden)。
- schema 検査は parse-don't-validate: `parseStore` が `{ok:false}` を返し、上位の既存分岐が hold へ倒す(例外を投げない)。

## テスト固定(受け入れ基準 → ケース対応)

| ケース群 | 対象 | 期待 |
| --- | --- | --- |
| V1(t450) | full grant + pending 1 件 | `next` が `run-stage`、`AUTO_DECIDED` 記録(FR-ADV-1) |
| V2(t450) | mode=none + pending | `await-advisory-choice`(FR-ADV-2 (1)) |
| V3(t450) | 失効 grant / scope 不一致 | 同上(FR-ADV-2 (2)) |
| V4(t450) | 落ちる実証 | 認可判定を無条件 true 化で V2/V3 が赤(FR-ADV-2 (3)) |
| V5(t449) | `runRequired: true` | optionIds に `defer-with-risk` が存在しない(FR-ADV-4 主機構。落ちる実証: 分岐無条件化で赤) |
| V6(t451) | `PROHIBITED_EFFECTS` 収載 | `quality-waiver` 収載の assert(引き取り C。除去で赤 — FR-ADV-4 従機構) |
| V7(t451) | 受理 3 点(auto 側) | grounding(decisionId 実在)/ 重複排除(decisionId 一意)/ 提示照合(selector 一致)の各 fail(FR-ADV-3) |
| V8(t451) | provenance 跨ぎ二重 receipt | human-turn 受理済み identity への auto-decision 受理が拒否(逆向きも)(FR-ADV-3) |
| V9(t450) | schema 1 store | fail-closed hold(ADR-9。読替が起きないこと) |
| V10(t449) | 翻訳の網羅 | `parked` / `conflict` / `aborted` / `defer-with-risk` 選択の全経路が `human-required`(FR-ADV-2 の fail-closed) |
| V11(機械 grep — PR 前チェック) | FR-ADV-5 射程注記 | 本 Unit 成果物+改訂対象 docs に対し `grep -rn "plugin 非依存" <対象面>` を実行し、hit 全行に「hold 判定の面に限る」の射程注記が併記されていることを確認(注記なしの hit = 違反)。docs 面の走査は `semi-docs-revision` の FR-DOC-1 grep と共同で実施 |

落ちる実証は「注入 → 赤の実測 → 復元 → 残渣ゼロ確認」の不可分 1 セット(NFR-1)。

## 本 Unit が守らない(守る必要がない)規則の明示

- 梯子・認可基体そのもの(FR-AUTH / FR-LAD 系)は `semi-authorization-core` の所有 — 本 Unit は既存裁定経路の消費者。
- `formalCheckRoute` の実行コマンド(`:685`)は改変しない(U-7 は実行の担い手の確定であり、コマンド定義の変更ではない)。
- docs の射程注記の維持(R6 の記述面)は `semi-docs-revision` と共同(FR-ADV-5「記述面は semi-docs-revision も遵守」)。
