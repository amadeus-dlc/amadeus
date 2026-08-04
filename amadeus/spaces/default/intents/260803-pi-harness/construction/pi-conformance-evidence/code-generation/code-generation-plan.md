# コード生成計画 — pi-conformance-evidence

## トレーサビリティ

- 対象: SCN-001〜009、M1〜M10、FR-VAL-001〜002、および全FR/NFR
- 根拠: `unit-of-work-story-map.md` の `pi-conformance-evidence` implementation steps

## 実施計画

- [x] Step 1: M1〜M10と正準requirement/evidence pathのclosed traceを定義する。
- [x] Step 2: Pi 0.83.0以上、OS、provider ID、full commit、全assertionを検証するformal evidence schemaとvalidatorを実装する。
- [x] Step 3: macOS/Linux各1件のgreen、native Windows negative、credential混入、欠落・重複coverageをfail-closedで検査する。
- [x] Step 4: 明示的opt-inのPi live RPC journeyを追加し、RPC入力が`HUMAN_TURN`と`GATE_APPROVED`を生成しない契約を固定する。
- [x] Step 5: 実際のhuman gateを確認する手動TUI dogfood checklistを追加する。
- [x] Step 6: candidate treeを横断するPi cross-unit E2Eを追加する。
- [x] Step 7: Pi driver、guardian、extensionに残ったNSD001 9件をnarrowing parserと明示的terminal処理へ修正する。
- [x] Step 8: `dist/pi`を正規generatorで再生成し、型、package drift、Pi関連回帰、no-silent-dropを検証する。
