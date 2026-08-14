# Security Test Instructions — 260814-park-provenance

## 判定: 新規 security テスト生成は不要(既存ガードで被覆)

セキュリティ関連面は NFR-1(park の受理根拠を grant に置かない / mint の hook 専用性維持)のみ。被覆: t17 + t3016 が「HUMAN_TURN 不在では受理されない」「grant は判定入力でない」ことを実測固定し、`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` バイパスを park に通さないことは実装上の不使用 + 拒否テストで担保。偽造面は既存契約(HUMAN_TURN は UserPromptSubmit hook のみが mint、監査 CLI で拒否)を変更していない。目標なき検査は生成しない(`cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。
