# Business Logic Model — revise-model-commit(U1 / #2289)

上流入力: `inception/units-generation/unit-of-work.md`(U1 節)/ `unit-of-work-story-map.md`(#2289 クローズ条件)/ `inception/requirements-analysis/requirements.md`(FR-REG-1〜6)/ `inception/application-design/components.md`(C2)/ `component-methods.md`(C2 変更面)/ `services.md`(registration verb の CLI 面)。file:line は現行 observed 断面(2026-08-20 本ステージ実読)。

## route 依存 compose の決定的手順

1. **leaf モジュール新設(FR-REG-5 前半、ADR-1)**: `plugins/formal-model-check/tools/authoring-routes.ts` を新設(ADR-1 の仮名を本 FD で確定 — このファイル名を最終とする)。内容は定数のみ: `export const AUTHORING_ROUTES: ReadonlySet<string> = new Set(["author-new", "revise-model"]);`(現行 `tla-registration.ts:87` と同値)。他 import ゼロ — 循環は構造的に不可能。**plugin.json `tools[]` へ `"tools/authoring-routes.ts"` を1行追加する**(条件付き write scope の確定 — units-generation §12a FOLLOW-UP への回答): t3078 の述語方向は実読で確定した — `tests/integration/t3078-plugin-tool-declaration.integration.test.ts:81` 逐語 `every plugin tool module is declared in its plugin.json`(tools→plugin.json 全数宣言)。したがって leaf 新設は宣言追加を必須とする。U3(advisory-retirement)の plugin.json 接触面は `advisories[]` のみで、U1 の接触面は `tools[]` の1行 — 同一ファイル内で行非交差であり、PR の直列着地時の textual merge で解決する(unit 依存辺は追加しない)。
2. **定義→import 置換**: `tla-registration.ts:87` の `AUTHORING_ROUTES` 定義を削除し、leaf からの import に置換。route 検査(`:110` `checkApplicability`)の消費は不変。`tla-applicability.ts:302` 側の置換は U4(applicability-arms、直列末端)の作業であり本 unit は触れない(FR-REG-5 の分担)。
3. **`composeRegisteredMap(snapshot, draft, route)` へ route 必須引数を追加(FR-REG-1)**: default 値は与えない(呼び忘れを型で止める — 互換分岐禁止)。route の型は `"author-new" | "revise-model"` の判別ユニオン:
   - **author-new** = 現行挙動の維持: `[...models, draft]` を name 昇順 sort → 全 map validator 検証。同名衝突は従来どおり validator-rejected(map 全体検証が重複 name を拒否する既存経路 — `:229-243` の検証単位は不変)。
   - **revise-model** = 同名置換: `models` から `draft.name` と name 完全一致する entry の index を探し、**1件存在**するときのみその位置を draft で差し替える(他 entry の bytes 保存 — 旧 FD BR-U4-17 の再直列化規律を維持)。置換後も全 map validator 検証を通す。
4. **不在名 cross-check(FR-REG-2、fail-open 閉鎖)**: revise-model で同名 entry が snapshot に**不在**の場合、`RegistrationFailure` へ新設する判別 kind `{ kind: "revise-target-missing"; readonly name: string }` で明示拒否する。現行の fail-open(XR-260820-2289 F1: revise-model + 不在名が append として ok=true で map を書く)は**置換**であり、警告付き続行・互換分岐は作らない。kind 新設が CLI 面へ波及しないことは実測済み: `tla-authoring.ts:807` `registrationCommit` は失敗を `failed(committed.error)` の汎用 JSON 直列化で出しており(`:845` 近傍)、kind ごとの exhaustive switch を持たない — U1 の write scope(`tla-registration.ts` + leaf + テスト + plugin.json tools[] 1行)で閉じる。
5. **commit の route 伝搬(FR-REG-1)**: `commit`(`:314`)は precondition (a)(`checkApplicability` — route ∈ AUTHORING_ROUTES を検証済み)の通過後に `candidate.applicability.route` を取り出し、`:338` の `composeRegisteredMap` 呼出へ第3引数として渡す(parse-don't-validate: 検証済み事実の運搬であり再検証しない)。
6. **provenance last-writer-wins(FR-REG-3)**: 置換 entry の `authoringProvenance` は draft が運ぶ値をそのまま採る(旧値との merge・保全をしない)。置換対象の provenance 不在(現行 3/4 モデル)は置換可否に影響しない。map スキーマの optional 性は変更しない。
7. **t448 再スコープ(FR-REG-4)**: `tests/unit/t448-tla-registration.test.ts:294-307` の同名拒否 pin を「author-new アームでの同名衝突」として明示的に再スコープする。その際、同テスト内の zero-assertion 早期 return(`if (!snapshot.ok) return;` / `if (!draft.ok) return;` — :296-297/:300-302 実測)を明示的な失敗(`expect(snapshot.ok).toBe(true)` を先行させる等)へ変え、#1982 silent-success 検出クラスを残さない。なお t448 冒頭の自己参照比較(`:2-3` の同一パス二重 import を「shipped plugin copy」と称する `:74-82` — 検証劇場クラス)は FR-X-4 の起票対象であり **U1 は修正も悪化もしない**(当該テストブロックは非接触)。
8. **TDD(3面テスト先行)**: (a) 置換成功(revise-model + 既存名 → 同名 entry が draft へ置換され他 entry bytes 不変)、(b) 置換対象不在(revise-model + 不在名 → `revise-target-missing` 拒否)、(c) author-new 同名衝突(→ validator-rejected 維持)。route 引数追加前に (a)(b) は赤(現行 compose は route を知らず append する)— 特に (b) は**現行 fail-open の再現を先に赤テストとして固定**してから修正する(落ちる実証を兼ねる)。
9. **生成台帳**: 新規テスト追加により `bun tests/gen-coverage-registry.ts` regen を同一変更へ同梱。

## FR-REG-6 改訂裁定(conductor 所有 — 本成果物への明記)

- **改訂対象**: `260804-tla-authoring/construction/registration-committer/functional-design/business-logic-model.md` §1 手順3(「snapshot.parsed に draft を加えた全体を検証」— append 前提)および同 intent の FR-010(replace 意味論の不規定)。
- **改訂内容**: registration commit に **replace-by-name(revise-model route)** を追加する。author-new は従来どおり append。
- **裁定 provenance**: ユーザー実 HUMAN_TURN のバッチ承認(2026-08-20)+ RA Q1=A(provenance last-writer-wins)。P3 に基づき、これは**無申告の逸脱ではなく裁定済みの意図的改訂**である。
- **旧 FD への改訂ポインタ**: 上記旧 FD の手順3 近傍へ、本 intent と本成果物を指す1行の改訂注記を追記する(record 書込は conductor が本ステージで実施 — unit builder の write scope 外)。

## 落ちる実証

- **fail-open 閉鎖(FR-REG-2)**: 現行コードに対し revise-model + 不在名の fixture で `composeRegisteredMap`(route 対応後の呼出面では commit 経由)が ok=true で map を書く再現を赤テストとして先に固定(XR-260820-2289 F1 の実 corpus 赤)→ 修正後 `revise-target-missing` の loud 拒否で緑。注入不要の自然な赤。
- **置換成功面**: route 引数が存在しない現行断面で (a) は型レベルで書けない(コンパイル赤)— 実装後に green を実測。
- **t448 zero-assertion**: 早期 return を明示失敗化した後、全 assertion 到達を test runner の assertion count で確認(#1982 の3ゲートと整合)。

## 生成台帳・CI 整合(FR-X-1)

blocking CI 集合 + coverage-registry regen 同梱。model-map ハッシュピン resync は不要(U1 は engine ファイル非接触)。t3078 は leaf の plugin.json 宣言追加で green を維持(宣言漏れは t3078 自体が赤で検出する — 機械強制)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T13:47:17Z
- **Iteration:** 1
- **Scope decision:** none

FR-REG-1..6 と ADR-1 の leaf 分担・条件付き plugin.json write scope を忠実に反映し、fail-open 閉鎖は互換分岐なしの置換(新 kind revise-target-missing)。引用は attested 事実と全一致、3成果物は相互整合し、実装に追加の設計質問は不要。

### Findings

- FOLLOW-UP | BR-1/AC の census 述語が定義以外(import 行・U1 PR 時点で残存する tla-applicability.ts:302)にも一致する — 定義行(= new Set()と import 行を判別する discriminator を code-generation の受け入れ基準へ明示的に持ち込む
- FOLLOW-UP | fail-open 落ちる実証の記述が自己言及的で密 — 現行2引数の commit/compose 経路へ revise-model+不在名 fixture を与え ok=true を観測する、という文字どおりのテスト対象ポインタを code-generation 時に明示する
- NIT | AuthoringRoute 型の配置(leaf か tla-registration.ts か)が実装裁量として未確定 — リテラル値は完全規定済みで非ブロッキング
