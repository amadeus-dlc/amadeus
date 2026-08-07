# Unit Test Instructions — Issue #2279

**テスト戦略**: Comprehensive(`amadeus-state.md` → Test Strategy)
**上流入力**: 3 Unit の `code-generation-plan.md` / `code-summary.md`

Comprehensive の 15 tests/component は**計画上の上限であってノルマではない**。
本 Intent の unit 層は「純関数の全分岐 + 不変条件 + 判定順」を固定する層と定義する。
FS・spawn を伴うものは integration 層(別紙)へ置く。

## フレームワークと実行

`bun:test`。設定ファイルは不要。

```bash
# 本 Intent の unit 層を全数
bun test tests/unit/t451-subagent-type-classify.test.ts \
         tests/unit/t453-subagent-model-resolve.test.ts \
         tests/unit/t460-subagent-stats-compose.test.ts

# 単体で回す(重い環境ではタイムアウトを上げる)
bun test --timeout 120000 tests/unit/t460-subagent-stats-compose.test.ts
```

対象は必ず `dist/claude/.claude/tools/...` から import する(投影後のバイトを検証
するため)。したがって**実行前に `bun run build` が必要**。

## 対象コンポーネントと観点

### C-2 `classifyAgentType` / C-4 台帳 — `t451`(13 件)

- 4 verdict(`persona` / `builtin` / `unknown-type` / `outside-allowed-set`)の全分岐
- **判定順の不変条件**(BR-U1-1): 台帳へ `unknown` を注入しても `unknown-type` が
  優先、同名衝突は `builtin` が優先、空 allowed でも台帳は独立に効く
- ケーシング差(`Explore` ≠ `explore`)が別値として共存すること
- 台帳が 7 エントリで `unknown` を含まないこと
- `sanitizeAdvisoryValue` の 1 行化 + 制御文字除去

### C-3 `resolveEffectiveModel` — `t453`(10 件)

- ADR-3 の先勝ち順(harness > request > pin)を**単独ケースと対照ケースの両方**で固定
- 全欠落・空白のみ → `unresolved`(`Model` を捏造しない)
- trim は presence 判定にのみ使い、値は逐語保持

### C-7 `composeStatsReport` / `renderStatsText` — `t460`(18 件)

- verdict 決定(BR-U3-3): 属性採用 / union 非適合の再分類 / 属性なし旧行の再分類、
  および食い違いの計数(`verdictMismatchCount`)
- 不変条件 3(全域性): 完了行は必ずどれか 1 バケツに入る
- 不変条件 4: `unresolvedModelCount + Σ byModel = completedTotal`
- レンダリング 5 セクション、`model/source asymmetry` 注記、空 corpus の 0 件レポート
- **出力サニタイズ**(security-design「属性値の出力サニタイズ」): 制御文字が描画
  テキストへ到達しないこと、改行による行偽造が成立しないこと、かつ compose 側は
  生値のまま(集計キーを表示都合で変えない)

## 新規テストを足すときの規約

- ファイル先頭の `// covers: function:<name>` 行を必ず書く。
  `bun tests/gen-coverage-registry.ts` の機械導出がこれを読む。
- 追加後は `bun tests/gen-coverage-registry.ts --check`(exit 0)を確認する。
- 実測値のみを書く。期待値を先に書いて出力を合わせにいかない(検証劇場の禁止)。

## カバレッジの期待水準

Comprehensive では「行カバレッジの数値目標」ではなく**契約の網羅**を基準にする。

- 各 BR / AC に対して、それを**落とせるテスト**が 1 つ以上あること
- fail-open 経路(throw しない・emit を止めない)が明示的に測られていること
- `tests/.coverage-registry.json` が fresh であること(ratchet 充足)

## 実測結果(本ステージ実行時)

```
bun test tests/unit/t451… tests/unit/t453… tests/unit/t460…
```

| ファイル | 件数 |
|---|---|
| `t451-subagent-type-classify` | 13 |
| `t453-subagent-model-resolve` | 10 |
| `t460-subagent-stats-compose` | 18 |
| **合計** | **41 pass / 0 fail** |

unit スイート全体(`tests/unit`)は **898 pass / 0 fail**。
