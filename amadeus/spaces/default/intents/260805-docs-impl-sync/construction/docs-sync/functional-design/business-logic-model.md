# Business Logic Model — docs-sync(functional-design)

上流入力(consumes 全数): requirements.md(FR-1〜FR-6・NFR-1〜4 を作業フローへ展開)。unit-of-work / components / component-methods / services は scope `self-document` の SKIP により設計上不在 — brownfield の codekb(`code-quality-assessment.md` § docs 品質、observed `1043b7e67`)と既存 docs 構造を de-facto application design として扱う(ステージ契約 Step 2 のフォールバック)。

## 作業フロー(修正パイプライン)

本 unit の「ビジネスロジック」は docs 修正の決定的パイプラインである。全工程で NFR-3(実測転記)を適用する。

### Phase 1 — 乖離修正(FR-1 / FR-2)

1. **修正対象の読込**: `code-quality-assessment.md` § docs 品質のクラス A(11 件)・B(3 件)・D のうち FR-2 対象 7 件(D-1〜D-4、D-7〜D-9 — D-5/D-6 は FR-4 側で処理)を修正キューとする。各項目は所在(file:line)・現記述・実測値を持つ。
2. **是正の適用**: 各項目に対し次の決定手順を適用する:
   - 隣接列挙(表・一覧)が同一文書内に隣接する件数語 → 実値へ更新
   - 隣接列挙のない散文の件数語 → count-free 表現へ置換(FR-1、A-8 は母集団明記も可)
   - 実体誤り(バージョン・パス・列挙欠落)→ 実装実測値へ置換(FR-2)。置換値は書込直前にコマンド再実行で採取する(RE 転記値の盲信をしない — 区間前進対策)
3. **EN/JA 同時適用**: 1 項目の修正は EN/JA 両面を同一編集単位で行う(NFR-1)。JA のみに存在する誤り(A-11)は JA 側のみ修正。

### Phase 2 — 構造補完(FR-3 / FR-4 / FR-5)

4. **self-* 節の新設**(FD-Q2=A): `docs/guide/05-scopes-and-depth.md` + `.ja.md` へ専用 H2 節「自己開発スコープ(self-*)」を追加し、4 スコープの目的・使い分け(project.md § Scope Overrides の正準と整合)・EXECUTE 規模を解説。既存の「10 scopes」構造は一般スコープ 11(installer-distribution 含む)へ更新。17 章・harness-engineering/04 章から参照を張る。
5. **ツール文書の補完**(FD-Q1=B):
   - F-2 → `docs/reference/22-formal-model-supply.md` へ TLA+ authoring / evidence CLI の節追加
   - F-3 → `docs/guide/19-plugins.md` + `docs/reference/11-contributing.md` へ import-closure guard の節追加
   - F-4/F-5 → 新章(reference 24 番台、番号は PR 直前に `git ls-tree origin/main docs/reference/` で確定)「Intent Autonomy と Intent Completion」を新設
   - F-6 → 新章内の 1 節(harness-registry)
   - F-7 → `docs/reference/12-state-machine.md` の advisory 系節へ amadeus-advisory-choice の受理経路を追記
6. **対訳・索引**(F-8/F-9/F-10): `live-e2e.ja.md` を EN から新規作成、`live-e2e.md` を harness-engineering 索引へリンク、`amadeus-files.md` を現況更新して `docs/README.md` からリンク。
7. **凍結注記**(FR-4): `docs/research/upstream-sync/**` の各レポート冒頭へ凍結 3 要素注記を追記(内容バイト不変を `git diff` で確認)。

### Phase 3 — 検証と起票(FR-6 / NFR-2)

8. **ローカル検証**: docs 消費ガード(t174 / t132 / t48 / t52 / t287 / t291 / t-pi-docs-contract + t68)+ `bun run typecheck` / `bun run lint` を実行し、exit code を記録。受け入れ基準の grep 述語(FR-1/FR-3/FR-5)を全数実行。
9. **Issue 起票**: FR-6 の 3 系統を Issue-first で起票(起票前重複検索 → 種別/P ラベル → 共通契約 6 節)。
10. **PR 分割**: 変更は焦点の絞れる単位で PR 化する(乖離修正 / self-* 節 / ツール文書 / 対訳・凍結の 4 分割を既定とし、code-generation の Bolt 計画で確定)。docs-only PR は CI テスト層が skip されるため(G-1)、各 PR 本文へローカル検証の実出力を記載する。

## 決定木 — 件数語の扱い(FR-1 の機械適用)

```
件数語を発見
├─ 同一文書内に隣接列挙(表・一覧)がある → 実値へ更新(列挙と同期)
├─ 隣接列挙がない散文
│   ├─ 母集団が prose 上で定義可能かつ定義する価値がある → 母集団明記+実値
│   └─ それ以外 → count-free 表現へ置換
└─ 凍結記録内(FR-4 対象)→ 触らない(凍結注記のみ)
```

テキストフォールバック: 件数語は「隣接列挙あり→実値」「なし→count-free」「凍結→不変」の 3 分岐で処理する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T10:10:25Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜6・NFR-1〜4・制約は3成果物へ漏れなく写像、裁定転記正確、consumes_absent の扱い適切、実装可能性あり。Minor 1件(business-logic-model の D クラス件数 8→実測 7)は conductor が機械再計算どおり是正済み(受理は機械検証可能クラス — cid:requirements-analysis:delegated-review-analysis-with-owned-verdict 追補)。

### Findings

- NIT | business-logic-model.md:11 の D クラス件数 8 件は FR-2 対象の実測 7 件(D-1〜D-4, D-7〜D-9)と不一致 — 是正適用済み(D-5/D-6 は FR-4 側と明記)
