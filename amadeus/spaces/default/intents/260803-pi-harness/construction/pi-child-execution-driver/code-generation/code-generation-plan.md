# コード生成計画 — pi-child-execution-driver

## トレーサビリティ

- 対象: SCN-005、SCN-006、SCN-007、FR-SUB-001〜005、NFR-SCL-001
- 根拠: `unit-of-work-story-map.md` の `pi-child-execution-driver` implementation steps

## 実施計画

- [x] Step 1: closed branded request/result schemaとspawn前identityを定義する。
- [x] Step 2: `pi --mode rpc --no-session` のJSONL handshake、prompt、terminal collectionを実装する。
- [x] Step 3: assistant textだけを抽出し、terminal replayをexact-onceにする。
- [x] Step 4: authenticated guardian、timeout、cancel、kill/reap、PID/PGID再利用防御を実装する。
- [x] Step 5: owner-only AES-256-GCM replay storeを実装し、credentialを永続化しない。
- [x] Step 6: Pi harnessのswarm driver resolutionを追加する。
- [x] Step 7: contract/unit/process integration testsを既存Bun test構成へ追加する。
