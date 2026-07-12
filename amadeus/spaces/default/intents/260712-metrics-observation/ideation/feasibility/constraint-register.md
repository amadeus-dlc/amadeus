# 制約台帳 — メトリクス定点観測(260712-metrics-observation)

| # | 制約 | 出典(既決) | 本 intent への効き方 |
|---|---|---|---|
| C1 | ランタイム依存の無断追加禁止 / Bun 単独前提 | project.md Forbidden・Tech Stack | 計測は既存資産(lizard=導入済み pin・Bun/git 標準)のみで構成。新規 npm/pip 依存は要 ADR |
| C2 | dist/ 手編集禁止・7面同期 | project.md Forbidden / Mandated | snapshot ツールを core に置く場合は package.ts+promote:self 同期が必須。tests/ 配下なら対象外 — 配置は design 論点 |
| C3 | 検証劇場の禁止(結果は実行から導出) | team.md Forbidden / P2 | snapshot 値は必ず実計測の出力から書く。ハードコード・推定値の混入は不可。「落ちる実証」= 計測失敗時に snapshot が黙って古い値を残さないこと(loud fail)をテストで固定 |
| C4 | 共有台帳の追記競合 | cid:shared-ledger-insert-collision | 追記型単一台帳を採る場合は union→regen 定型が前提。既定候補は日付付き個別ファイル |
| C5 | lizard 断片計測の癖 | cid 記録済み(handleNext 断片値等) | CCN 分布の解釈に癖が乗る — ゲートと同一経路ゆえ癖も同一(物差し統一の利点)。スキーマ注記に明示 |
| C6 | CI 権限(ci.yml は contents: read) | .github/workflows 実測 | main への snapshot コミットは新規の write 権限付き workflow/job が必要(release.yml :48 に前例) |
| C7 | スカッシュマージ運用(main 1コミット=1 Bolt) | org.md Way of Working | マージ単位 snapshot の因果対応が綺麗に成立する好条件(制約というより追い風) |
| C8 | bun --coverage の spawn 盲点・brace/型注釈 DA:0 | cid 群(bun-coverage-spawn-blindspot ほか) | snapshot ツール自身のテストは in-process seam で書く(実装時の定石適用) |
