上流入力(consumes 全数): code-generation-plan.md / code-summary.md

# Unit Test Instructions — 260811-allowlist-semantic-audit

Test Strategy は Comprehensive。ただし件数の上限(15 tests per component)は**計画上の天井であって
ノルマではない**ため、`code-summary.md` が列挙する要件(FR-1/2/4/6/7、NFR-1/2/4)から駆動して
必要な検査面だけを置く。

## 対象と配置

純関数の検査は unit 層、実 FS に触れる検査は integration 層へ置く
(`cid:code-generation:fs-tests-integration-first`)。

| ファイル | 層 | 対象 |
|---|---|---|
| `tests/unit/t534-allowlist-semantic-audit.test.ts` | unit | AST クラス述語・散文クレーム抽出(advisory 側) |
| `tests/unit/t536-allowlist-declared-class.test.ts` | unit | `selector.class` の閉語彙・fail-closed parse・決定性・非 import の静的 assert |

## 実行

```bash
bun test ./tests/unit/t534-allowlist-semantic-audit.test.ts ./tests/unit/t536-allowlist-declared-class.test.ts
```

ファイルパス指定では先頭に `./` を付ける — 付けないと bun は filter として解釈し、
`did not match any test files` で**無音の 0 件実行**になる。

## 要件との対応

| 要件 | 検査 |
|---|---|
| FR-4(宣言と AST の照合) | 一致で緑 / 食い違いで赤 / 宣言なしで緑(ラチェットの opt-out) |
| FR-6(規約違反) | 語彙外の `class` 値が malformed として拒否される |
| FR-6(構文クラス不定) | AST で判定できないクラス(`spawn-only` / `unmeasurable-other`)の宣言が拒否される |
| NFR-1(決定性) | 同一入力の 2 回実行が byte-identical / ネットワーク・LLM クライアントを import しない静的 assert |
| NFR-2(fail-closed) | 空文字・null・非文字列が「一致」ではなく malformed として落ちる |
| NFR-4(検証劇場の禁止) | ガードが返す全フィールドを消費する fixture テスト |

## 期待被覆

新規・変更行は patch coverage gate の対象になる。**新設ガードのために allowlist へ免除を足さない**
ことを合格条件とする(`bun tests/coverage-patch-gate.ts --check` の出力 `allowlisted: 0`)。
spawn 経由でしか通らない行が残る場合は、免除ではなく in-process seam の追加で解消する
(`cid:requirements-analysis:bun-coverage-spawn-blindspot`)。
