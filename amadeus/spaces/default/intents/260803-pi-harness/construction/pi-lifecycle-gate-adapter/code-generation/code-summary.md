# コード生成サマリー — pi-lifecycle-gate-adapter

## 変更内容

- `amadeus-pi-extension.ts` にPi 0.83 event parser、registration gate、sealed journal、health latchを実装した。
- interactive-only HUMAN_TURN、strict tool start/end、compaction mission recoveryを実装した。
- continuation outboxを `prepared → entry-appended → turn-observed` で永続化した。
- authored sourceと `.pi/extensions/amadeus.ts` の双方からcore moduleを解決できるruntime loaderを追加した。
- session start時のplugin auto-composeを既存 `handlePluginCli` へ委譲した。

## 実装判断

- raw prompt、tool args/resultはauditへ出さず、sealed local payloadとして保持する。
- registration/event schema drift、journal conflict、tool pairing不整合はdurable health latchで停止する。
- auto-compose failureはworkflowを壊さないadvisory warningとする。

## テスト結果

- lifecycle referee: converged、tamperなし。
- lifecycle unit/integrationを含むPi cross-unit tests: 26件成功、0件失敗。
- wiring XOR closure: 成功。
- `bun run typecheck`: 成功。

## 計画との差分

- 初回実装ではsession-start auto-compose wiringが不足していたため、cross-unit wiring testに従って既存core compose seamへ接続した。
