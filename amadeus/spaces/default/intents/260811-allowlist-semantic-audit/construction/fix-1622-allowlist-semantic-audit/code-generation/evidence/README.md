# FR-7 記録 — 述語と実測値の再実行可能な出典

上流入力(consumes 全数): requirements.md / unit-of-work.md(SKIP 由来で不在 — 設計どおり)

本ディレクトリは Issue #1622 の是正について、**後続の読み手が同じ数値を再導出できる形**で述語と
実測値を残す(FR-7、`cid:requirements-analysis:enumeration-completeness-review` の E-ASD-RES13 追補)。

**測定 ref**: 是正前 = `a96bfde5588328611cb46c7836c346d57223fe8d`(本 intent の park コミット。
`git rev-parse HEAD` の実出力)。是正後 = 本コミット。
`packages/` 配下のソースは RE の observed `854692fd7a11b124236b0427fe3d59e2fe6bf785` から
`git diff --name-only 854692fd7a11b124236b0427fe3d59e2fe6bf785 HEAD` = `tests/` 3 ファイルのみで、
**患部ファイルは全て無変更**である。したがって RE の T1〜T18 表の行番号はそのまま現行に一致する。

## ファイル

| ファイル | 役割 |
|---|---|
| `classify-ledger.ts` | FR-1 の全数分類述語。三値判定・AST クラス・pre-fix 走査でのトークン数を出力 |
| `fr1-classification.json` | 上記の `--json` 出力(是正後の断面) |
| `exempt-lines.ts` | 台帳が免除している `file:line` 集合を出力(FR-2 受け入れ (2) の入力) |
| `attribute-diff.ts` | 免除行集合の前後 diff をエントリへ帰属させ、未帰属があれば非0で終了 |
| `remediation.json` | FR-2 の是正台帳(機械可読)。採用方式と旧/新レンジ |
| `fr2-remediation.md` | 同上の根拠(エントリ単位の判断理由) |
| `ci-wiring.md` | FR-5 の配線根拠(実読した行と逐語) |

## 再実行手順

```bash
# FR-1: 全数分類
bun <evidence>/classify-ledger.ts

# FR-2 受け入れ (2): 免除行集合の帰属
bun <evidence>/exempt-lines.ts a96bfde5588328611cb46c7836c346d57223fe8d > /tmp/before.txt
bun <evidence>/exempt-lines.ts                                          > /tmp/after.txt
bun <evidence>/attribute-diff.ts /tmp/before.txt /tmp/after.txt

# FR-2 受け入れ (1)
bun run coverage:ci && bun tests/coverage-patch-gate.ts --check
```

`exempt-lines.ts` の revision 引数は**台帳だけ**を切り替え、ソースは常に worktree から読む。
両側で同じソースを読まないと、本ブランチが `tests/coverage-patch-gate.ts` へ加えた行が
免除行の移動として現れ、是正による増減と区別できなくなる(実測: 素朴に両方を rev から読むと
`tests/coverage-patch-gate.ts:251,273` → `:392,414` の見かけ上の増減 2 行が混入した)。

## FR-1: 全数分類(是正後の断面)

`bun <evidence>/classify-ledger.ts` の実出力からの転記:

```
entries: 616
verdicts (FR-1):
  一致 43
  判定不能 413
  転位 160
AST classes:
  catch-arm 57
  dispatch-case 15
  spawn-only 39
  type-only 58
  unmeasurable-other 447
ranges with zero tokens under the pre-fix walk: 39
  of those, now classified: 24
entries declaring selector.class: 4
  declaration matches the AST: 4
```

母集団の恒等式は `43 + 413 + 160 = 616` で台帳のエントリ数に一致する。
是正前(623 件)の同一述語による出力は `一致 41 / 判定不能 417 / 転位 165`(合計 623)。

**三値判定は blocking ではない**。これは `reason` という散文を読んだ結果であり、
ゲートが読むのは `selector.class` だけである(下記「達成されないこと」)。

## `tokensInRange` の zero-token 欠陥(前提バグ)の実測

修正前の走査は `ts.forEachChild` を使っており、句読点・キーワードトークンを訪れないため
`} catch {` だけの範囲はトークン 0 個になり、全クラス述語が無条件に偽を返していた。
`classify-ledger.ts` は修正前の走査を `preFixTokenCount` として保持しているので、この件数は
いつでも再測定できる。

- 修正前の走査でトークン 0 個だった範囲: **39 件**(計画が予告した件数と一致)
- そのうち修正後に `unmeasurable-other` 以外へ分類されたもの: **24 件**

## 達成されないこと(FR-4 の射程外 — `tests/README.md` にも明記)

1. 全 616 件の意味的照合の自動化。ゲートが検査するのは `selector.class` を宣言した
   エントリのみで、現時点では 4 件である(opt-in ラチェット)。
2. `spawn-only` の到達性の機械検証。到達性は構文の性質ではなく、AST では判定できない。
3. `reason` の主題抽出を要する転位の自動検出。散文には対象・根拠・被覆状況・到達条件が
   混在しており、4 回の設計試行がいずれも偽陽性で否定された(code-generation-plan.md の
   「4 回の試行と実測」表)。
