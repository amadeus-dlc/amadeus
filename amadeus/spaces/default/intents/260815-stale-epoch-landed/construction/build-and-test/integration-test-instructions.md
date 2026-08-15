# Integration Test Instructions — intent 260815-stale-epoch-landed

- 主対象: `bun test tests/integration/t3110-pr-convergence-stale-epoch-landed.integration.test.ts`(13 — 2 軸再現 / 削除ブランチ / 誤 create 防止 / sensor merge 束縛 / 祖先ゲート)
- 無退行: t3062 / t541 / t482 / t448 / t447 / t450-report-format-sensor / t533-enforcement / t534(builder+conductor 実測 254 pass)
- 実行規約: 複数 path 列挙時は事前に実在を機械確認し、実行後に listed と runner 報告数を照合(本 intent でも命名誤り 1 件を事前検出して訂正済み)
