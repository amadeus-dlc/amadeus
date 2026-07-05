# Bolt Plan（260705-github-kanban-sync）

上流入力: [unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)、[components.md](../application-design/components.md)

順序は dependency-first（delivery-planning-questions.md Q1 = A）。1 Unit = 1 Bolt = 1 PR、厳密直列（Q2 / Q3 = A）。

## B001-registry-issues-field

- **Unit**: u001-registry-issues-field
- **walking skeleton**: いいえ
- **Definition of Done**: `intents.json` に `issues` フィールドが追加され、判別可能な既存 entry の遡及補完が済み（D-AD10）、`npm run test:all` が green のまま、`issues` 有無両方の entry を読める検証が追加されている。Bolt PR が作成済み
- **確信仮説**: 台帳スキーマの追加的変更が既存の読み手（エンジン、validator）を壊さないこと
- **デモ**: `intents.json` の diff と検証の green

## B002-kanban-sync-cli（walking skeleton）

- **Unit**: u002-kanban-sync-cli
- **walking skeleton**: **はい**。ローカルスキャン（C-1/C-2）→ GraphQL 書き込み（C-3）→ board 表示という全アーキテクチャ層を貫く最小 end-to-end スライス
- **Definition of Done**: `kanban-sync.ts --all` がメインリポジトリで成功し、board に全 Intent のカード（列 + 7 フィールド）が表示され、US-2〜US-5 の受け入れ基準を満たし、TDD の検証が green。Bolt PR が作成済みで、**人間が board の実表示を確認して Bolt PR を承認する**（walking skeleton gate、C11 の人間操作完了が前提）
- **確信仮説**: 「ローカル成果物（正）を Projects v2 の鏡へ冪等反映する」というアーキテクチャが実運用の Intent データで成立すること
- **デモ**: board の Board view / Table view の実表示

## B003-kanban-hooks

- **Unit**: u003-kanban-hooks
- **walking skeleton**: いいえ
- **Definition of Done**: hook 2 本が `.claude/settings.json` に repo-local 結線され、US-6 の受け入れ基準（キュー記録、flush、drop 回復、ネットワーク非接続）を満たし、検証が green。Bolt PR が作成済み
- **確信仮説**: 自動追従（成功指標 4）が hook 経由で成立し、ツール実行のレイテンシを悪化させないこと
- **デモ**: セッション終了後に board が自動更新される様子（Synced At の更新）
