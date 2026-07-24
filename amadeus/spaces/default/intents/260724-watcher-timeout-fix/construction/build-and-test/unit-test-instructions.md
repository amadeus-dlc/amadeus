# Requirement-driven Test Instructions — watcher-timeout-fix

参照元: `code-generation-plan.md`、`code-summary.md`。Test Strategy は Minimal。
本変更はシェル関数と実ファイル境界を対象とするため、孤立モックの新規 unit test は増やさず、
既存の実FS integration seamを最小の要件駆動テスト集合として使用する。

## 実行方法

```bash
bun test tests/integration/t-team-up-watcher-arming.test.ts
```

追加サービスや共有状態は不要。各テストは一時ディレクトリと短縮タイムアウトを使用する。

## 要件トレーサビリティ

- FR-1 / NFR-1a: 既定再送回数が1回であり、never-arm時も1回だけ再送する。
- NFR-1b: 初回prompt脱落後、1回の再送でarmedへ回復する。
- NFR-1c / NFR-2: `WATCHER_READY_TIMEOUT` の既定値90を軽量に検証する。
- FR-3 / FR-4: unarmed時の非ゼロ終了、メンバー名と回復ガイダンスを既存テストで保持する。

## 合格条件

対象11件がすべて PASSし、失敗・skipが0件であること。カバレッジ率の固定閾値は設けず、
各FR/NFRの観測可能な経路と落ちる実証を合格条件とする。
