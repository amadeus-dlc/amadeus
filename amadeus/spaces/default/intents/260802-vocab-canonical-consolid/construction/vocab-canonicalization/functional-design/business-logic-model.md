# Business Logic Model — vocab-canonicalization

上流入力(consumes 全数): requirements.md

- `requirements.md`: FR-2(生成パイプライン)/ NFR-1/2(決定性・fail-closed)/ OQ-1(マーカー様式)/ OQ-3(生成タイミング)を本書の ADR とフローで確定した。設計上不在の consumes 4件(unit-of-work / components / component-methods / services — expected: true)はフォールバックとして本書がロジック定義の起点(内容は捏造しない)

## ADR-1: 投影宣言の様式 — fenced YAML マニフェスト(OQ-1 の確定)

**Context**: 正本から各面の subset を機械抽出するには、正本側に投影宣言が要る(FR-1d)。

**Decision**: 正本 EN の `## Projection Manifest` 節に **fenced YAML ブロック**で宣言する(domain-entities.md E-2)。

**Alternatives Rejected**:
- (i) 表への列追加 — EN/JA 両方の全行に波及し、読者向けの表が投影メタデータで汚れる。JA 側にも同期義務が生じ二重化する
- (ii) 行内 HTML コメント — Markdown 表は1行1レコードであり、行末コメントはセル内容との境界が処理系依存(CommonMark でセル末尾に取り込まれうる)。壊れ方が無音
- (iii) 別宣言ファイル(独立した語名リストファイル)— 宣言と定義表が別ファイルに分かれ、語の追加・改名のたびに2ファイル同期が必要になる(正本一本化の趣旨に対する新たな分散点)。宣言ファイル自体が「定義を持たずポインタ相当の内容だけの用語系 md」に近づき、裁定5の精神と緊張する
- 採用案の位置づけ: fenced YAML ブロックは **候補(iii)の in-file 変種**である — 宣言の実体は語名リスト(iii と同形)だが、置き場所を正本ファイル内部にすることで (iii) の同期分散の欠点を消し、(i)(ii) の表汚染・無音破損も回避する
- 採用理由の傍証: fenced YAML を md 内の機械可読ブロックとして parse する家風が既存(`unit-of-work-dependency.md` の edge block を `parseBoltDag` が読む — per-unit-loop-activation (a))

**Consequences**: 宣言は EN 正本のみに置く(JA は英語キーでペアリングされるため独自宣言不要)。生成器がキー正規化(Term → kebab-case)を所有。セキュリティ/コンプライアンス影響: なし(リポジトリ内文書の機械処理のみ)。

## ADR-2: 生成タイミング — 独立スクリプト write/check+コミット済み生成物(OQ-3 の確定)

**Context**: 生成を package.ts Step 2b(ビルド時)に足すか、独立スクリプト+コミット済み生成物+drift check にするか。

**Decision**: **独立スクリプト `scripts/glossary-projection.ts`(write/check)+生成物はコミット**。t413 が `check` を CI で強制する。

**Alternatives Rejected**:
- package.ts Step 2b 内生成 — S-3/S-4(docs/reference)は package の出力ツリー外で、S-2 は core の**手書きファイル内の一区間**。ビルド時生成にすると「core 正本自体が build 生成物」になり、dist:check の前提(core=手書き正本)と衝突する
- symlink / ポインタのみ md — 裁定5で禁止

**Consequences**: 正本編集後は `write` 実行+dist 再生成(S-1/S-2 が core 配下のため 13 ファイル同期 — FR-3b)が同一変更に必要。`check` の drift guard がこの同期漏れを CI で loud に検出する。先例 = `amadeus-runner-gen.ts` の write/check ドリフトガード(RE 実測)。セキュリティ/コンプライアンス影響: なし(生成器はリポジトリ内ファイルのみを読み書きし、外部入力・ネットワーク・秘密情報に触れない。書込先はマーカー区間と生成物ファイルに限定)。

## 生成フロー(GlossaryProjector)

```
parse(docs/guide/glossary.md)     … EN 表 → {key → (term, defEN)} + ProjectionManifest
parse(docs/guide/glossary.ja.md)  … JA 表 → {key → (term+和訳, defJA)}
validate:                          … fail-closed(NFR-2)— いずれかで exit 1 / throw
  - EN/JA キー集合の完全一致(過不足を全数列挙して報告)
  - manifest の全キーが EN 表に実在・重複なし・未知 projection 名なし
  - 各 projection の実効 subset が非空(`terms: all` 以外で空リスト・全キー不在は誤設定として拒否 — BR-2 条件5)
  - 定義文の禁止トークン(S-3/S-4 向けに {{HARNESS_DIR}} が残らない / S-1/S-2 向けに <harness-dir> が残らない — BR-4 変換の完全性)
render:
  - S-1: GENERATED ヘッダ + 全語表(EN、<harness-dir>→{{HARNESS_DIR}} 置換)
  - S-2: protocol subset 表(同置換)を stage-protocol.md のマーカー区間へ
  - S-3: reference subset 表(EN、置換なし)をマーカー区間へ
  - S-4: reference subset 表(JA 定義)をマーカー区間へ
write: 差分がある場合のみ書換(決定性 — 同一入力なら byte 不変)
check: render 結果と committed 実体の byte-diff。差分・マーカー区間不在は exit 1
```

- マーカー区間: `<!-- glossary:projection:begin <name> -->` / `<!-- glossary:projection:end -->`。区間不在・入れ子・多重は fail-closed
- 語順: 正本表の出現順を保存(ソートしない — diff の可読性と決定性の両立)

## テスト面(TDD 順序 — NFR-4)

1. parser(EN/JA 表+manifest)の unit(純関数、`tests/unit/`)— Red→Green
2. validate の fail-closed 各条件(キー欠落・未知 projection・トークン残存・空 subset — BR-2 の全5条件を1条件1テストで)— Red→Green
3. render/write/check の integration(実 FS、`tests/integration/t413`)— Red→Green
4. 落ちる実証(FR-5b): 現状 corpus で check green を確立 → 正本1語の定義文を注入変更 → check 赤 → revert(falling-proof-injection-one-set。注入はテストが読む面=committed 実体側でなく正本側 — injection-surface-verify)

## 例外・エラー分類

- 回復可能(利用者の編集ミス): validate 失敗 → 全違反の列挙付き exit 1(1件目で止めない — 是正の一括性)
- 回復不能(内部不変量の破れ): render 中の不整合 → throw(fail-fast)
- FR-5 drift guard は CI blocking。fail-open 経路なし

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T10:44:27Z
- **Iteration:** 1
- **Scope decision:** none

構造・網羅性・トレーサビリティは実装可能な密度だが、BR-2条件5(空 subset 拒否)の設計/テスト面不在と ADR-1 の候補(iii)比較欠落の Major 2件で差し戻し

### Findings

- Major | business-rules.md:19 | BR-2条件5(空 subset 拒否)が validate フローと BR-7 述語のどちらにも対応チェックを持たない
- Major | business-logic-model.md ADR-1 | requirements OQ-1 の候補(iii)別宣言ファイルへの比較・却下が Alternatives に不在。採用案は第4案でありその位置づけ説明も必要
- Minor | business-rules.md:36 | 「⑥⑦が欠く3語」の主張に出典引用なし(スコープ内で検証不能)
- Minor | business-logic-model.md ADR-2 | セキュリティ/コンプライアンス影響の記載が ADR-1 と非対称

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T10:47:23Z
- **Iteration:** 2
- **Scope decision:** none

iteration1 の4指摘すべて verbatim で解消確認。契約網羅・要件トレーサビリティ・内部整合・無申告逸脱なし・実装可能な密度を全数パスで確認、新規指摘なしで READY

### Findings

- 確認 | business-rules.md:19-20 + business-logic-model.md validate 第3検査 + BR-7-8 | BR-2条件5の検査面配線を確認(Major#1 解消)
- 確認 | business-logic-model.md ADR-1 | 候補(iii)却下理由+採用案の位置づけ明示(Major#2 解消)
- 確認 | business-rules.md BR-5 | 出典明示+CG 再実測条件付記(Minor#3 解消)
- 確認 | business-logic-model.md ADR-2 | セキュリティ/コンプライアンス影響の対称化(Minor#4 解消)
