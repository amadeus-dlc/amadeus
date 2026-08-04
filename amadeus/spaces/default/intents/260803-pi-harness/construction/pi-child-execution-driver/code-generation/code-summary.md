# コード生成サマリー — pi-child-execution-driver

## 変更内容

- `amadeus-pi-driver.ts`、contract、guardian、replay storeの4ファイルを追加した。
- strict JSONL RPC、assistant-text-only collection、success/failure/timeout/cancel terminal resultを実装した。
- guardian controlを認証し、process group reapとPID再利用negative checkを追加した。
- core swarm resolverへPi harnessを登録した。
- fake Pi process fixtureとunit/integration testsを追加した。

## 実装判断

- childは常に `--no-session` で起動し、provider secretやprompt本文をreplay/auditへ保存しない。
- pending recoveryでは受理済みidentityを隔離し、再利用されたPIDへsignalを送らない。
- queue/dependency/retry policyはcore Unit poolに残し、driverはnative acceptanceとterminal factだけを扱う。

## テスト結果

- driver referee: 49件成功、0件失敗、tamperなし。
- cross-unit driver tests: 成功。
- `bun run typecheck`: 成功。

## 計画との差分

- なし。
