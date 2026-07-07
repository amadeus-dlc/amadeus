# Skill Matrix — インストーラの実装

> ステージ: team-formation (Ideation) / 作成: 2026-07-07
> 出典: `team-assessment.md`、`../scope-definition/intent-backlog.md`

## 必要スキルと充足状況

| スキル | 必要とする作業 | 充足 | 根拠 |
|--------|----------------|------|------|
| bun/TypeScript 開発 | 全プロト Unit(P1〜P4) | ○ | リポジトリの既存ツール群がすべて bun/TS。AI エージェント + メンテナの主戦場 |
| ファイル操作・マニフェスト処理 | P1(共通基盤) | ○ | `scripts/package.ts` / `promote-self.ts` に同種実装の実績 |
| CLI/UX 設計(対話式ウィザード) | P2(init) | ○ | 既存の onboarding.ts 等で対話フローの経験あり |
| npm パッケージング・公開 | P4 | △ | ビルド(TS→JS)・publish は本リポジトリで初。標準的な作業であり学習コストは低い |
| GitHub アーカイブ取得(HTTP) | P1 | ○ | 標準的な fetch + tar 展開 |
| ドキュメンテーション | P5 | ○ | docs/ 体制が確立済み |

## ギャップ分析

実質的なギャップは **npm 公開の実務(P4)** のみ。組織スコープ取得 → `npm publish` → タグ運用への統合、という一本道の手順であり、requirements/delivery-planning で手順を明文化することで解消する。追加要員・外部支援は不要。
