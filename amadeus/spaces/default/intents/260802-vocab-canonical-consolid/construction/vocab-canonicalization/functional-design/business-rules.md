# Business Rules — vocab-canonicalization

上流入力(consumes 全数): requirements.md

- `requirements.md`: FR-1〜FR-6 / NFR-1〜4 を検証可能なルールへ分解した。設計上不在の consumes 4件(expected: true — units-generation / application-design SKIP)はフォールバック(ステージ本文既定)に従い、本書は requirements のみを上流とする

## BR-1: 正本唯一性

- BR-1a: 用語定義の独立所有は `docs/guide/glossary.md` / `glossary.ja.md` のみ。他のいかなる md も「正本」「canonical」「正典」を用語定義について自称しない
- BR-1b: 投影面(S-1〜S-4)は必ず GENERATED マーカー(S-1 はファイルヘッダ、S-2〜S-4 は区間マーカー)を持ち、マーカー外に用語定義を追加しない
- BR-1c: 旧面は削除する — domain-language.md(FR-4a、`.coderabbit.yaml:83` を `docs/guide/glossary.md` / `glossary.ja.md` へ差替)と CONTEXT.md(FR-4b)

## BR-2: 生成の fail-closed 条件(全条件で loud 失敗)

1. EN/JA の英語キー集合に過不足(欠落キーの全数列挙)
2. ProjectionManifest の未知 projection 名 / 正本に不在のキー / 重複キー
3. マーカー区間の不在・入れ子・多重
4. トークン変換の不完全(S-3/S-4 出力に `{{HARNESS_DIR}}` 残存、S-1/S-2 出力に `<harness-dir>` 残存)
5. `terms: all` 以外での空 subset(protocol/reference が空になる宣言は誤設定として拒否)— validate フローの第3検査(business-logic-model.md 生成フロー)と BR-7-8 のテストが対応

## BR-3: EN/JA ペア規則

- 照合キーは EN 表の `**<Term>**`。JA 行は `**<Term>(<和訳>)**` 形式を維持(和訳の欠落は許容するが英語キーは必須)
- 集合一致の対象は**用語表本体のみ**。JA 固有 `## 表記規則` 節・(吸収後の)チーム固有表記節は対象外(FR-5a (i)、RE リスク1)
- 対訳更新は同一変更で行う(FR-6b)

## BR-4: トークン変換

- 正本の定義文はトークン中立形 `<harness-dir>` で書く(docs/ 面は package transform 対象外のため — RE 実測)
- S-1/S-2(core 面)への投影時のみ `<harness-dir>` → `{{HARNESS_DIR}}` を機械置換。逆置換・部分置換は BR-2-4 で検出
- 家風根拠: t291 の `not.toContain("{{HARNESS_DIR}}")` / `toContain("<harness-dir>")`(RE 実測)

## BR-5: subset の確定(OQ-2 の確定)

- `protocol` subset = 現行 §9 の17語(昇格6語を含む — 集合として不変。定義文のみ正本へ統一)
- `reference` subset = protocol 17語 + 固有4語(Approval Gate / Inline Stage / Subagent Stage / Lead Agent、requirements FR-1b の昇格対象)= 21語。現行の docs/reference Terminology が protocol §9 に対して欠いている3語(Ladder prompt / Parallel batch / Walking skeleton — 出典: RE 実測、codekb `architecture.md` 患部マップ節および `re-scans/260802-vocab-canonical-consolid.md`。本ステージの consumes 外のため実装前に CG で再実測して確定する)は protocol 側集合に含まれるため reference にも供給される(superset 化 — 語の喪失なし)
- `knowledge` subset = 全語(`terms: all`)
- 変更手続: subset の増減は ProjectionManifest の編集+write+check で完結(コード変更不要)

## BR-6: 定義矛盾の解消先(FR-1c)

- Unit of Work: Bolt 契約(3.1–3.5 / 3.6–3.7 は全 Bolt 後に1回)と整合する1定義に統一。「3.1-3.7 を1回通過」系の文は全面から消える(投影で構造的に保証)
- Guardrail: 所在は memory 層(`amadeus/spaces/<space>/memory/`)。`{{HARNESS_DIR}}/rules/` 表現は用いない
- Scope: 硬数値の外延(「10」等)を書かない — 隣接列挙が無い限り count-free(FR-6a)

## BR-7: 検証ゲート(t413)の検査述語

1. `bun scripts/glossary-projection.ts check` exit 0(S-1〜S-4 drift なし)
2. EN/JA 集合一致(生成器 validate の再実行 or 直接照合)
3. 旧面の不在: `domain-language.md` / `CONTEXT.md` が存在しない
4. 独立定義の禁止走査: 走査面(docs/ + core knowledge + amadeus-common protocols)に「用語定義の正本・canonical を自称する md」が正本ペア以外に存在しない(禁止表現リスト — mirror-docs-contract の FORBIDDEN 型)
5. symlink 不在(患部ディレクトリ走査)・「定義ゼロでポインタのみの用語 md」不在
6. slo-sli-patterns.md の用語(SLI/SLO/SLA/Error Budget)が正本と**同名で異義の定義**を持たない(同名語が正本に存在しない現状は green — FR-5c の例外クラス明示)
7. 落ちる実証済み(FR-5b)であること(実装時の1セット実施を CG の完了条件に含める)
8. BR-2 全5条件の fail-closed テスト(1条件1テスト。条件5 = 空 subset 宣言の fixture で exit 1)

## BR-8: 既存ゲート互換(NFR-3)

- t34(§9 見出し・6段下限)green 維持 — §9 の H2 見出しは生成対象外(区間は表のみ)
- t174 の走査対象(docs/**)に S-3/S-4 が入るが、生成内容は legacy トークンを含まない
- dist:check / promote:self:check: S-1/S-2 変更時は package.ts + promote:self の再生成を同一変更で行う(13ファイル同期)
