# Unit of Work — Story Map

**上流入力(consumes 全数)**: `requirements`(利用シナリオ walkthrough と SM-1〜4 — ジャーニーの導出元)/ `components`(C→Unit 割付)/ `component-methods`(各段の可視成果)/ `services`(運用時の観測手段)/ `component-dependency`(並行性)/ `decisions`(ADR-1/3/6 — 各ジャーニーの体験を決める裁定)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## ジャーニー × Unit のマップ

| ジャーニー(アクター) | U1 detection-skeleton | U2 model-attribution | U3 subagent-stats |
|---|---|---|---|
| **規約外起動に気づく**(conductor) | ad-hoc 名 / 型未指定の spawn 完了時に stderr advisory 1行 + `Type Verdict` が audit に残る | started 面にも同じ検出が配線される(発火はハーネス条件次第 — kimi 即時 / Claude Code は #2303/#2297 後) | — |
| **実効 model を追う**(leader) | — | spawn ごとに `Model` / `Model Source`(harness / request / pin)が記録され、解決不能は属性不在で明示 | model 別内訳と unresolved 件数が1コマンドで出る |
| **配分方針を監査する**(leader) | 警告の有無が「persona 経由か否か」の即時シグナルになる | model ピンの実効性(pin で解決された割合)が観測可能になる | 型別・verdict 別ランキング + 測定 ref 付きレポート(R-2 再計測の実演) |

## リリース刻み(価値の積み上がり)

1. **U1 のみ**: 検出が成立(SM-1)。誤検知ゼロの根拠は AC-1/AC-2 のテスト面(corpus 全数 sweep は U3 で完了)
2. **U1 + U2**: 可観測化が成立(SM-4)— audit 行単体で「何が・どのモデルで・なぜそのモデルか」が読める
3. **U1 + U2 + U3**: 監査が成立(SM-2 / SM-3)— corpus sweep の両側実証と1コマンド集計。intent の成功指標が全数閉じる

## ストーリーの独立テスト可能性

各セルは Given/When/Then で単独検証可能(例: U1 = Given 集合外の agent_type を持つ completed payload / When hook が emit する / Then stderr に advisory 1行 + `Type Verdict: outside-allowed-set` が audit 行に載り、emit は成功する)。詳細の受け入れ基準は requirements AC-1〜AC-6 に既に固定済みで、本書は重複定義しない。
