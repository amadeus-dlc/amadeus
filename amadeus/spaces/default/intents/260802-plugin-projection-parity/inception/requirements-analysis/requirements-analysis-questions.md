# Requirements Analysis 質問票 — plugin-projection-parity

## 質問なし（0問）の判断

追加質問は生成しない。ユーザーは、問題が `.codex` 固有ではなく他ハーネスでも再現すること、Claude Codeと同様にplugin関係ファイルをコミットすること、および動的生成を主目的にしてはならないことを明示した。Reverse Engineering成果はユーザー承認済み（2026-08-03T00:10:07Z）であり、実装の既存流儀から一意に決まる事項は質問せずコードから導出するというproject ruleにも従う。

| 観点 | 完全性の判断 | 根拠 |
|---|---|---|
| 機能要件 | 既決 | self-install対象5面へ決定的なplugin投影をコミットし、初回利用前から利用可能にする |
| 非機能要件 | 既決 | fresh worktree、起動後Git clean、決定性、冪等性、全ハーネスの配布ドリフト検査 |
| 利用シナリオ | 既決 | fresh worktree、通常起動、欠損修復、plugin未選択projectの4経路 |
| 事業上の目的 | 既決 | Issue #2018の再オープン理由である初回利用不能とdirty worktreeを解消する |
| 技術的文脈 | 既決 | CodeKBのbusiness-overview、architecture、code-structureと差分スキャンが所有境界・生成経路・正規配置を確定した |
| 品質属性 | 既決 | Comprehensiveテスト、package/promote-self drift guard、fresh-worktree E2Eで検証する |

## 裁定の記録

- ユーザー裁定: 「お前が勘違いしてた。ゴールを。」— 動的な自動導入を主目的とする旧解釈を却下
- 正しいゴール: Claude Codeと同様に、各self-installハーネスの決定的なplugin関係ファイルをversion管理する
- Codex固有裁定: runnerの正規配置はproject-root `.agents/skills`。runtime生成された `.codex/skills` は非正規
- 境界裁定: packageのplugin未選択基準状態と、Amadeus self-repositoryのplugin選択済みdogfood投影を分離する
- 追加質問: なし（0問）

