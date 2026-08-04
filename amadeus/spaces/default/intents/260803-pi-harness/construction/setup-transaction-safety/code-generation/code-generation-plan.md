# コード生成計画 — setup-transaction-safety

## トレーサビリティ

- 対象: SCN-001、FR-DST-001、NFR-REL-001、NFR-SEC-001
- 根拠: `unit-of-work-story-map.md` の `setup-transaction-safety` implementation steps

## 実施計画

- [x] Step 1: transaction plan、WAL journal、private staging/quarantine/backup schemaを定義する。
- [x] Step 2: target lock、mandatory recovery、preflightをCLI apply pathへ接続する。
- [x] Step 3: stage/apply/manifest commitを同一transactionとして実装する。
- [x] Step 4: pre-decision rollbackとpost-decision cleanupを実装する。
- [x] Step 5: path escape、case-fold/Unicode collision、symlink/special fileをfail-closedにする。
- [x] Step 6: I/O ordinal failure injectionとupgrade E2E testsを既存Bun test構成へ追加する。
