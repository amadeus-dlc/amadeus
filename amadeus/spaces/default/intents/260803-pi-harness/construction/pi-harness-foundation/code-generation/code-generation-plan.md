# コード生成計画 — pi-harness-foundation

## トレーサビリティ

- 対象: SCN-001、FR-HAR-001〜003、NFR-CMP-001、NFR-MNT-001
- 根拠: `unit-of-work-story-map.md` の `pi-harness-foundation` implementation steps

## 実施計画

- [x] Step 1: Pi harness manifest、`.pi` layout、native runtime/version/trust contractを追加する。
- [x] Step 2: skill、question annex、extension、child driver resourcesとcanonical `stageEntry`を宣言する。
- [x] Step 3: harness identity、capability、projection、package generatorへPiを登録する。
- [x] Step 4: manifest、registry、projection、package byte-parityのunit/integration/smoke testsを追加する。
- [x] Step 5: 既存のBun/TypeScript/Biome構成を再利用し、専用test runnerや設定を追加しない。
- [x] Step 6: `dist/pi`を正規generatorから生成し、`package.ts pi --check`で検証する。
