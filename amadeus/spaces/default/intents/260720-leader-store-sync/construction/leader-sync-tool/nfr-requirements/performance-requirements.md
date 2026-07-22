# Performance Requirements — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, business-logic-model, business-rules, technology-stack — 性能面の母数は requirements.md の実測(elections 55 dir / #1280 の 531 ファイル)、フロー段は business-logic-model.md の verb 3種、実行系は technology-stack.md の Bun 直接実行に依拠。

## 要求(比例選定 — 承認済み性能 NFR は不在)

- P-1: 専用 SLO なし(単発 CLI・leader ローカル実行 — technology-stack.md の Bun 直接実行構成(コンパイル工程なし)で対話的応答が既定水準。起動 ~20ms の数値は CLAUDE.md 記載であり consumes 外につき根拠には用いない — reviewer 指摘で出典訂正)。business-rules.md BR-5 の SYNC_SPLIT_FILE_LIMIT(300)が単一実行の上限ガードを兼ねる(execution timeout ≠ SLO — observability-setup:c3 の語彙)。
- P-2: status/plan は read-only 走査のみ(elections 55 dir 級で顕著な遅延なし — 実測は B&T で wall-clock 記録のみ、閾値化しない)。

## 検証

専用ベンチ不要(build-and-test:c1 の比例選定)。--ci スイートの実行時間レンジ内であることのみ観測。
