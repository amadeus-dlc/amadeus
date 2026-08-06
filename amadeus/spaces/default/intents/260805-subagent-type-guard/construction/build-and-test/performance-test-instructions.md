# Performance Test Instructions — Issue #2279

**上流入力**: U3 `nfr-design/performance-design.md`、3 Unit の `code-summary.md`

## 受け入れ基準を設けない理由(先に明示する)

本 Intent には**明示の性能 NFR が存在しない**。U3 の performance-design は
逐語で次を定めている。

> 明示 NFR 不在のため設計目標のみ(受け入れ基準ではない): 現行 corpus 規模
> (シャード数百・対象行数千)で対話的応答。テスト(BR-U3-6)は機能の正しさを
> 固定し、性能の退行上限は設けない — 退行が体感された時点で
> `bt-timeout-verification-shape`(counter assertion + 退行上限)の様式で追加する。

したがって本書は **CI をブロックする性能テストを定義しない**。未実測の推定値を
受け入れ基準に昇格させない(`estimates-not-acceptance-criteria`)。
定義するのは「観測のとり方」と「退行が疑われたときの追加手順」である。

## 性能特性(設計上)

| 面 | 特性 |
|---|---|
| hook 差し込み(U1/U2) | 発火ごとに `.claude/agents/` を再読(キャッシュなし)。十数ファイル規模の dir 読取 1 回 + 純関数分類。上限機構は意図的に設けていない(BR-U1-6) |
| 集計 CLI(U3) | シャード数 × 行数の 1 パス走査。純関数層は O(行数)、出力は distinct 型数でソート |

## 観測のとり方

```bash
# 実 corpus 全体に対する 1 回の集計(対話的応答の体感を測る)
time bun dist/claude/.claude/tools/amadeus-subagent-stats.ts --project-dir "$PWD"

# corpus 規模の把握
find amadeus/spaces/default/intents -name '*.jsonl' -path '*/audit/*' | wc -l
cat amadeus/spaces/default/intents/*/audit/*.jsonl | wc -l
```

測定は**必ず実 corpus のバイトに対して行う**。corpus は追記され続ける動く値なので、
測定値は測定時点の ref(シャード数・行数)と併記しなければ意味を持たない。

## 実測結果(本ステージ実行時)

**測定 ref**: シャード 216 / audit 行 127,715 / 対象イベント 6,874 completed + 65 started

| 測定 | 実測値 |
|---|---|
| 集計 CLI 全走査(`--project-dir`) | **0.163s** real / 0.134s user / 0.046s sys |
| 空スコープ(0 シャード)の起動 | 0.049s real |

distinct 型数 459、verdict 内訳は persona 1,672 / builtin 766 /
unknown-type 3,735 / outside-allowed-set 701。

数百シャード規模で 0.2 秒未満であり、設計目標「対話的実行で数秒以内」を
1 桁以上の余裕をもって満たす。**この値は受け入れ基準ではなく観測記録である。**

## 退行が疑われた場合の手順

1. 上記 `time` 計測を、測定 ref(シャード数・行数)と併せて記録する。
2. 体感退行が再現するなら、そのときに初めて
   `bt-timeout-verification-shape`(counter assertion + 退行上限)の様式で
   テストを追加する。上限値は**その時点の実測**から導出し、推定で置かない。
3. hook 面の退行なら、まず「発火ごとの agents dir 再読」をキャッシュ化する案を
   検討する(BR-U1-6 が明示的に据え置いた設計判断であり、変更には設計裁定が要る)。
