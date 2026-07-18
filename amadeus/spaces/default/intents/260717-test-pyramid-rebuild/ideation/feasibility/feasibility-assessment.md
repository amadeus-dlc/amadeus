# Feasibility Assessment — test-pyramid-rebuild(#684)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`

測定 ref: origin/main a4a33e59a 再接地後の本ブランチ HEAD、2026-07-17 実測。

## 技術的実現可能性: GO

サイズ分類の基盤が**既に実在**するため、新規機構の発明は不要 — 本 intent は既存基盤の上での分類台帳化・設計・計画:

| 既存機構 | 所在 | 実測 |
|---|---|---|
| classifyTestSize | tests/lib/test-size.ts:23-(291行) | small/medium/large の3値、signal→最小サイズの決定的 rubric(network→large / fs・timer→medium / それ以外 small)。declared/measured の両輪(:65-67) |
| test_pyramid コレクタ | scripts/metrics-snapshot.ts:97-104 | tier(ディレクトリ層)× size で集計、`${tier}_${size}` 動的キー |
| size ドリフトゲート | (declared<measured で CI 赤) | 宣言サイズが実測より小さいと失敗 — 上方向ドリフト検出 |
| tier×size 実測 | 本 intent RE で classifyTestSize 直叩き | unit 48s/162m/1l・integration 9s/138m・e2e 3s/63m/2l・smoke 14m(計440) |

## 実現方針(実ツール検証・feasibility:c1)

- 分類スイープ: classifyTestSize を fan-out で全ファイルへ機械適用(決定的 rubric 前提、effort low — leader 指針)。判定ブレは rubric 1本化+構造化出力で排除
- 層設計・比率目標・実行時間予算: t_wada 知見+実測データを前提材料に文書化(設計値は選挙)
- 再編計画: サイズ違反(unit の medium 162件等)の移設対象を Issue 分割で計画

## 確信度

高 — 分類器・コレクタ・ゲートが実在し実測済み。未確定は設計値(比率・境界)のみで、実現可能性そのものへの疑義なし。
