# User Stories Assessment（260705-github-kanban-sync）

上流入力: [stories.md](stories.md)、[requirements.md](../requirements-analysis/requirements.md)

## 実行判断

- **Decision**: Execute
- **Rationale**: 本 Intent は repo-local な開発ツールであり、ステージ定義の Skip 基準（developer tooling）に触れうる境界事例である。それでも Execute としたのは、(1) Maintainer という明確な単一利用者がいて board 上の観測可能な振る舞いが受け入れの中心であること、(2) P1〜P3 の 3 PR 分割に対して story 単位の受け入れ基準が QA（build-and-test）の直接の入力になること、(3) feature scope の既定で本ステージが EXECUTE であり、Skip にする積極的理由（利用者不在、純内部リファクタ）が無いこと、の 3 点による。
- **Factors considered**: project type = Greenfield の内部ツール / user-facing scope = Maintainer 専用の board UI（純バックエンドではない） / complexity signals = 3 段階 PR、外部システム（GitHub GraphQL）連携、hook 結線。
- **価値の高い領域**: board 上で観測できる振る舞い（列配置、フィールド値、鮮度、認証失敗の挙動）を story の受け入れ基準として固定すること。

## INVEST 評価

| Story | I（独立） | N（交渉可能） | V（価値） | E（見積可能） | S（小ささ） | T（テスト可能） |
|---|---|---|---|---|---|---|
| US-1 | P2 以降の前提だが単独で PR 化できる | 補完範囲は Q2 で確定済み | Issue への到達性 | 小（台帳 + 補完） | 1 PR | FR-1 の受け入れ基準で検証可 |
| US-2 | US-1 に依存 | フィールド構成は wireframes で確定 | 一覧性（主課題） | 中（sync 本体） | 1 PR | 実行後の board 状態で検証可 |
| US-3 | US-2 と同 PR | 判定は `[?]` のみと確定 | 放置ゲート発見 | 小 | US-2 に同乗 | 列配置で検証可 |
| US-4 | US-2 と同 PR | text（ISO 8601 UTC）で確定済み | 鮮度の誤読防止 | 小 | US-2 に同乗 | フィールド値で検証可 |
| US-5 | US-2 と同 PR | エラーメッセージ文言のみ交渉余地 | 板の信頼性 | 小 | US-2 に同乗 | scope 剥奪環境で検証可 |
| US-6 | US-2 に依存 | flush 抑制は 2 分固定と確定 | 自動追従 | 中（hook 2 本 + キュー） | 1 PR | hook 発火ログと board 差分で検証可 |

## カバレッジ

- requirements.md の FR-1〜FR-5 はすべていずれかの story の受け入れ基準に現れる（FR-3.5 は US-2 の初回自動作成 AC、受け入れ条件 3 の同時実行収束と受け入れ条件 6 の手編集上書きも US-2 の AC で明示）。
- FR-3.8（auto-archive、Should）は人間設定のため story にしない（P2 の board 確認時に Maintainer が実施）。
- 受け入れ条件 6 件（Issue #470）は US-1〜US-6 の受け入れ基準で全件カバーされる（条件 1 = US-2、条件 2 = US-3、条件 3 = US-2、条件 4 = US-6、条件 5 = US-6、条件 6 = US-2）。

## MVP 境界

US-1 + US-2（P1、P2 = PR 1、PR 2）で主課題（一覧性）が満たされる。
US-6（P3 = PR 3）が従課題の自動追従を足す。
