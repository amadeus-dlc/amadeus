# Business Logic Model — advisory-retirement(U3 / #3187)

上流入力: `inception/units-generation/unit-of-work.md`(U3 節)/ `unit-of-work-story-map.md`(#3187 クローズ条件)/ `inception/requirements-analysis/requirements.md`(FR-RET-1〜4)/ `inception/application-design/components.md`(C4)/ `component-methods.md`(C4 撤去対象)/ `services.md`(CLI 面の変化)。本 unit は削除中心のため「ロジックモデル」= 撤去手順の決定的モデルとして書く。

## 撤去手順(順序が意味を持つ)

1. **宣言面**: `plugin.json` の `advisories[]` から `authoring-hold` エントリ(`:77` 近傍)を除去。`spec-change` エントリは残す。`tools[]` は非接触。
2. **コード面**(`tla-authoring.ts`): `advisoryHold`(`:574-599`)・`defaultSubjectsPath`(`:529-530`)・`subjectsDeclare`(`:649-670`)・`publishSubjects`(`:632-647`)・`GovernedSubjects` 型・failure kind `governed-subjects-unreadable` を削除。dispatch(`:900-901`)から `advisory: { hold: … }` と `subjects: { declare: … }` を除去。USAGE(`:77,80-81`)から `advisory hold` / `subjects declare` を削除。**export の残骸・re-export・deprecation コメントを残さない**(FR-RET-4)。
3. **stage 契約**: `stages/tla-authoring.md:53`(`subjects declare` 手順4)を削除し、後続手順の番号を詰める。
4. **docs**: `docs/reference/22-formal-model-supply.md` / `.ja.md` の advisory authoring-hold 説明節を削除(対訳同期)。
5. **RFC**(裁定 auto-decision-e13e9039 = pointer-update): `specs/rfc/0001-intent-autonomy-modes.md:249` 近傍の表セルから `authoring-hold` を除去し、同表直下に1行の退役注記(「authoring-hold は 2026-08-20 の #3187 裁定で退役 — 発火経路は grid 一本」)を追記。RFC 本文の他の記述は非接触。
6. **テスト面**(実測済みの処分区分):
   - 削除: `tests/integration/t528-authoring-hold-end-to-end.integration.test.ts`、`tests/integration/t524-subjects-declare-writer.integration.test.ts`(いずれも退役機構専用 — census 4 hit / 全面)
   - 部分更新: `tests/integration/t481-spec-root-resolver.integration.test.ts`(`:33` の defaultSubjectsPath import と `:229` の assertion のみ削除 — 本体は spec-root resolver のテストで存続)、`tests/integration/t527-terminal-receipt-persist.integration.test.ts`(`:80` の subjectsPath fixture 行の除去 — 本体は #3262 receipt のテストで存続)
   - 期待値更新: t526 / t529 / t532 / t444-advisory-declaration / t445(-advisory-declaration-supply / -tla-applicability-cli)/ t353 / t113(advisory 宣言集合の要素数・列挙から authoring-hold を除去)
   - pin 追随: `tests/integration/t450-tla-authoring-stage-e2e.integration.test.ts`(`subjects declare` の toContain pin を除去)
7. **生成台帳**: テスト削除後に `bun tests/gen-coverage-registry.ts` regen を同一変更に同梱。
8. **投影**: `bun run build` → `.claude/` 投影・dist に退役キーが残らないことを census で確認。

## FR-RET-4 census 述語(確定形)

- キー集合(9、1キー1実行 `git grep -l -F`): `authoring-hold` / `authoring-subjects` / `advisoryHold` / `defaultSubjectsPath` / `subjectsDeclare` / `publishSubjects` / `GovernedSubjects` / `governed-subjects-unreadable` / `subjects declare`
- 対象集合: `plugins/ packages/ tests/ docs/ .github/ scripts/ amadeus/spaces/default/specs/`
- 除外(帰属条件): (a) `packages/framework/core/tools/amadeus-orchestrate.ts` の `advisoryHold`(同名別物 — 汎用 advisory 機構)(b) 工程記録(`amadeus/spaces/*/intents/ elections/ memory/ codekb/`、git 履歴)(c) RFC の**退役注記そのもの**(手順5で追記する1行 — census は `git grep -l -F` のファイル粒度のため、実効の除外は RFC ファイル全体)(d) **逐語保存された実測キャプチャ fixture**(クラス規則、2026-08-20 追補 — 選挙 E-260820-FMC-CG-U3DEV 2-0 の裁定): GitHub GraphQL 応答等の実測記録をバイト保存した fixture で、README がコメント本文の逐語保存を一次証拠として文書化しているもの — 該当実在例は `tests/fixtures/pr-convergence/measured-pr-2268.graphql.json`(キーは歴史的レビューコメント散文内のみ、改変は P2 違反)。除外はファイル粒度
- 実行順序: テスト削除 → registry regen → census(regen 前の census は `tests/.coverage-registry.json` の残存で偽赤)
- 健全性: 実在既知の対照リテラル(例: `spec-change`)を同述語形・同対象集合で併走し非ゼロを確認
- 合格条件: 全9キーで除外帰属外の hit = 0(`bun run build` 後の投影面でも同様)

## 落ちる実証

census 述語の新設ゲート化はしない(1回性の受け入れ検査であり恒常ゲートではない)が、実行時は「削除前に1キーが非ゼロであること」(現状 = 赤に相当)を先に採取してから削除 → 0 を確認する(注入不要の自然な赤→緑)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T14:10:36Z
- **Iteration:** 1
- **Scope decision:** none

U3 の3成果物は FR-RET-1..4・C4 契約へ trace する決定的な撤去手順・ゼロ互換規則・再実行可能な census 述語(対照リテラル・regen 先行順序つき)を備え、t481/t527 処分と RFC pointer-update の上流 FOLLOW-UP を具体処分で解消。実装に追加の設計質問は不要。残余は write scope 追補の明文化1件と表記 NIT 2件。

### Findings

- FOLLOW-UP | FD 手順5 が指示する specs/rfc/0001-intent-autonomy-modes.md 編集が unit-of-work.md の U3 write scope に未宣言 — code-generation 時に code-summary.md 等で write scope 追補を1行明文化してから ownership 検査面に触れる
- NIT | business-rules.md / domain-entities.md の上流入力列挙が consumes 6面の部分集合(business-logic-model.md は全6面被覆)— 体裁のみ
- NIT | census 除外 (c) は行単位の記述だが git grep -l -F はファイル粒度 — RFC ファイル全体が当該キーの検査から除外される実効を明記すると誤解がない
