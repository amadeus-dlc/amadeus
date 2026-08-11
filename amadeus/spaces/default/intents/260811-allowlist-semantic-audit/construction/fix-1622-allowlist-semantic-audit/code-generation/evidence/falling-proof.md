# FR-4 / FR-6 落ちる実証

上流入力(consumes 全数): requirements.md / unit-of-work.md(SKIP 由来で不在 — 設計どおり)

新設ガードは「赤くなること」と「正当な既存データで赤くならないこと」の**両側**を実測する
(`cid:code-generation:corpus-sweep-for-new-guards`)。

## 実台帳に対する実証(in-memory、残渣ゼロ)

`falling-proof.ts` は台帳をメモリ上で改変して述語を適用し、ファイルには書き込まない。
実出力の逐語:

```
--- (a) current ledger, untouched ---
declared entries: 4
mismatches: 0

--- (b) one declaration flipped to a class the code is not ---
flipping packages/framework/core/tools/amadeus-graph.ts#stageGraphDrift: type-only -> catch-arm
mismatches: 1
  packages/framework/core/tools/amadeus-graph.ts:1768-1769 (stageGraphDrift) declares catch-arm but the lines are type-only

--- (c) one declaration set to a value outside the vocabulary ---
threw: coverage-patch-gate: malformed allowlist entry (file/selector/reason required, reason non-empty, expiry string when present, selector.class one of type-only/cat…

--- ledger file unchanged by this experiment ---
byte-identical: true
```

- **(a) 正当な既存データで緑**: 616 件、宣言 4 件、食い違い 0 件
- **(b) 宣言と実クラスの食い違いで赤**: 実台帳のエントリ 1 件の宣言を反転させると検出される
- **(c) 語彙外の値で赤(fail-closed)**: parse 段階で throw。空文字・`null`・
  `spawn-only` / `unmeasurable-other`(AST で判定できない 2 クラス)も同様に拒否される

**残渣**: 実験は in-memory であり、台帳ファイルは byte-identical(スクリプト自身が実測している)。

## CLI 境界に対する実証(t537)

`tests/integration/t537-allowlist-declared-class.integration.test.ts` は同じ 4 面を
`runCheck` 経由で固定する。fixture の git リポジトリと `AMADEUS_PATCH_*` シームを使い、
本番と同じ経路を通す。

| 検査 | 期待 |
|---|---|
| 宣言と実コードが食い違う | exit 1 + `declares type-only but the lines are catch-arm` |
| 宣言が実コードと一致する | exit 0 |
| 宣言なし(ラチェットの opt-out) | exit 0 |
| 語彙外の値 | parse で throw |

実台帳のスイープ(`every declared class matches the code it resolves to`)も同ファイルにある。
**「宣言が実際に存在すること」を別テストで固定している** — これがないと、宣言 0 件の台帳でも
スイープは緑を返し、ラチェットが進んでも緑のままになる(検証劇場の典型)。

## FR-6 の 2 クラス

requirements.md FR-6 は「規約違反」と「構文クラス不定」の 2 クラスの赤を求める。
契約最終確定(code-generation-plan.md「ユーザー裁定その3」)により `reason` の parse を
やめたため、この 2 クラスは `selector.class` の面へ写像される:

- **規約違反** → 語彙外の `class` 値。上記 (c) と t537 の 4 番目
- **構文クラス不定** → AST で判定できないクラス(`spawn-only` / `unmeasurable-other`)の宣言。
  t536 の「a class the AST cannot decide is rejected, not silently skipped」が固定する

どちらも**宣言という明示的な入力**に対する検査であり、散文の解釈を必要としない。
