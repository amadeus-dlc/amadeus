# Integration Test Instructions — bug-zero-batch

## 実行

`bash tests/run-tests.sh --ci` — smoke / unit / integration 層を含む CI プロファイル。マージ済み main + 工程記録ブランチで exit 0 を確認する(結果は build-test-results.md)。

## 統合境界の検証ポイント

- #674: finalize → amadeus-bolt release-merge / complete --merge の実 CLI 連鎖(t134 が実プロセスで検証)
- #675: gate resolution(approve/reject)→ 監査 ledger(HUMAN_TURN / DELEGATED_APPROVAL)の統合判定(t188/t112)
- #676: bolt start → audit shard 書き込み境界(bare fallback 不使用を t33 negative が検証)
- #668: codekb-path CLI → git remote 解決の統合(t182 が実 git repo fixture で検証)
