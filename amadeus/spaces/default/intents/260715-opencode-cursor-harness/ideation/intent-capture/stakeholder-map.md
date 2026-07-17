# Stakeholder Map — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`(Issue #626)

## Key Stakeholders と関心事

| ステークホルダー | 種別 | 関心事 |
| --- | --- | --- |
| リポジトリオーナー(Issue #626 起票者 = ユーザー) | 意思決定者 | cross-harness reusability の North Star 前進。core の harness-neutrality 維持。既存 harness への回帰ゼロ |
| opencode 利用開発チーム | 受益者(外部/内部) | 自ハーネスで AI-DLC workflow を起動・実行できること(最低 `--doctor` / `--version` / workflow start) |
| Cursor 利用開発チーム | 受益者(外部/内部) | 同上。Cursor の rules / command / MCP 単位に合った自然な surface |
| Amadeus フレームワーク保守チーム(本チーム) | 実装者・影響を受ける側 | `scripts/package.ts` manifest 駆動の open-set harness seam が特別扱いなしで拡張できることの実証。dist/self-install ドリフトガードの維持 |
| 既存 harness(Claude / Kiro / Codex)の利用者 | 影響を受ける側(回帰リスク) | 既存配布物・セルフインストール・CI の無回帰 |
| AI-DLC v2 / TAKT 方向性の関係者 | インフルエンサー | portable workflow method 化と矛盾しない設計(ただし TAKT executor 互換は本 intent の非目標) |

## 意思決定者 vs インフルエンサー

- **意思決定者**: ユーザー(リポジトリオーナー)。仕様変更・マージ承認・ゲートの最終承認(エスカレーション正準リスト(2)(4))。チーム内執行は leader が delegate 経路で担う
- **インフルエンサー**: opencode / Cursor 各コミュニティの機能制約(skill / rules / hook / MCP の受け取り単位)が設計を実質的に制約する。調査項目(Issue #626)として文書化して意思決定材料にする
- **実装判断**: 真に未決の設計判断はエージェント選挙(cid:always-elect)、逸脱は実装前停止(cid:deviation-stop-before-implement)

## Communication Requirements

- 進捗・ゲート準備完了・ブロッカーは conductor(e3)→ leader へ agmsg で自発報告(push-reporting)。ゲート承認は leader の delegate-approval 経路(auto-gate-approval)
- PR 単位のレビューは実装者以外のメンバーへ即時依頼(independent-review-on-pr)。マージはユーザー承認後に leader が執行(no-AI-merge / leader-executes-merge)
- opencode / Cursor の実行モデル調査結果は成果物(文書)として record に残し、README / harness guide への反映を受け入れ条件に含める(Issue #626)
