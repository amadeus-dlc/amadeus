# コード生成計画 — pi-distribution-installation

## トレーサビリティ

- 対象: SCN-001、SCN-002、FR-DST-001〜004、NFR-SEC-001、NFR-REL-001、NFR-CMP-001
- 根拠: `unit-of-work-story-map.md` の `pi-distribution-installation` implementation steps

## 実施計画

- [x] Step 1: setup harness union、`.pi` engine layout、reporterへPiを追加する。
- [x] Step 2: fresh install、N→N+1 update、retired resource、same-version no-opをtransaction coordinatorへ接続する。
- [x] Step 3: root private packageのclosed `pi` metadataとlocal/git resource viewを追加する。
- [x] Step 4: authored manifestから単一candidate catalog、path/hash/source identityを生成する。
- [x] Step 5: target `package.json`不変、`dist/pi/package.json`非生成、modified retired file保持を実装する。
- [x] Step 6: setup unit/integration、package candidate、mutation、regen drift testsを既存Bun構成へ追加する。
