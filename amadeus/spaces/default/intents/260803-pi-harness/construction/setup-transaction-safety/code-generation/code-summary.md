# コード生成サマリー — setup-transaction-safety

## 変更内容

- default setup CLI apply pathを `SetupTransactionCoordinator` へ接続した。
- target lock、mandatory recovery、WAL、private staging/quarantine/committed backupを追加した。
- managed filesとinstall manifestを同一transactionでcommitするようにした。
- atomic rename/hard-link no-clobber、rollback、recovery、I/O ordinal injection seamを実装した。
- coordinator unit testsとupgrade E2Eを更新した。

## 実装判断

- credential-bearing backupはproject treeの `.bk` ではなくowner-only private rootへ保存する。
- corrupt/multiple journal、permission低下、symlink、case-fold/Unicode衝突はwrite前に拒否する。
- 未完了transactionのrecoveryが終わるまで新transactionを開始しない。

## テスト結果

- transaction referee: converged、tamperなし。
- coordinator/failure-injection + upgrade E2E: 12件成功、0件失敗。
- `bun run typecheck`: 成功。

## 計画との差分

- 初回cross-unit E2Eは主checkoutの古いgenerated setup CLIを使用したため失敗した。正規buildを再生成後、同一テストは成功した。authored sourceの追加変更は不要だった。
