# コード生成計画 — pi-doctor-diagnostics

## トレーサビリティ

- 対象: SCN-007、SCN-008、FR-DOC-001〜004、NFR-USA-001、NFR-CMP-001
- 根拠: `unit-of-work-story-map.md` の `pi-doctor-diagnostics` implementation steps

## 実施計画

- [x] Step 1: Pi doctorの8 closed check IDとstructured result schemaを定義する。
- [x] Step 2: OS、Bun、Pi version、trust、skill、extension、package resources、driver probesを実装する。
- [x] Step 3: generated harness descriptorを期待値の正本としてresource/hashを照合する。
- [x] Step 4: blocked workflowでも完走するread-only dispatchをutility doctorへ接続する。
- [x] Step 5: secret、credential URL、username/home absolute pathをredactする。
- [x] Step 6: healthy/negative/no-silent-drop/redaction unit・integration testsを既存Bun構成へ追加する。
- [x] Step 7: 全harness配布物を正規generatorで再生成し、drift checkを通す。
