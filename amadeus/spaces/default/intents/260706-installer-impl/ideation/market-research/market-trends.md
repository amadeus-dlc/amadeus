# Market Trends — インストーラの実装

> ステージ: market-research (Ideation) / 作成: 2026-07-07
> 上流入力: `../intent-capture/intent-statement.md`

## 関連トレンド

### 1. スペック駆動開発(SDD)ツールの急拡大
GitHub spec-kit は 90k+ スターに達し、「2026年に最も成長している AI コーディングアプローチ」と評される(出典: [fundesk.io の 2026 ガイド](https://www.fundesk.io/spec-driven-development-github-spec-kit-guide)、[MarkTechPost](https://www.marktechpost.com/2026/05/08/meet-github-spec-kit-an-open-source-toolkit-for-spec-driven-development-with-ai-coding-agents/))。AI-DLC/Amadeus と同じカテゴリのツールが「1コマンド導入」を標準装備しており、手動コピー配布は市場水準を下回っている。

### 2. 「インストーラ」から「プロジェクト状態管理ツール」への進化
shadcn/ui CLI v4 は「もはや単なるインストーラではなく、プロジェクト状態を管理する洗練されたツール」へ進化した(出典: [shadcn/ui March 2026 Update](https://medium.com/@nakranirakesh/shadcn-ui-march-2026-update-cli-v4-ai-agent-skills-and-design-system-presets-d30cf200b0e9))。導入後の状態(バージョン、カスタマイズ)を認識する CLI がトレンドであり、Q3 で決めた「バージョン検出 + 差分レポート」はこの潮流に合致する。

### 3. マルチエージェント対応が標準に
cc-sdd は 8 エージェント、spec-kit は主要 4+ エージェントをサポート(出典: [cc-sdd](https://github.com/gotalab/cc-sdd)、[Spec Kit Integrations](https://github.github.io/spec-kit/reference/integrations.html))。Amadeus は既に 4 ハーネスの dist/ を持っており、インストーラでの選択式全ハーネス対応(intent-statement の決定)は市場標準に沿う。

### 4. 再実行アップグレードモデルの定着と限界
`npx <pkg>@latest` 再実行や `init --force` による更新が業界の事実上の標準だが、ユーザーカスタマイズの保護は各ツールとも粗い。【仮説】非破壊マージを構造的に保証できるツールはまだ主流でなく、差別化余地がある(確信度: 中 — 競合の詳細な保護機構までは検証していない)。

## 示唆

- 1コマンド導入 + 対話式ウィザード + 非対話フラグはテーブルステークス — intent-statement の成功指標1(1コマンド・1分以内)は市場水準の追随であり過剰要求ではない
- 差別化は更新体験(差分レポート + 非破壊マージ)に集中させるのが合理的
