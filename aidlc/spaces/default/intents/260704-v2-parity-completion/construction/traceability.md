# Construction Traceability

## 要求と成果物と検証の対応

| 要求 | 成果物 | 検証 | 状態 |
|---|---|---|---|
| R001 エンジン動作 | `.claude/{tools,aidlc-common,sensors,hooks,scopes,agents,knowledge}`、settings マージ、`.gitignore` | B001 sandbox 統合テスト、smoke、test:all | 充足 |
| R002 grilling 結線 | `skills/amadeus-grilling/references/engine-bridge.md`、各 skill の bridge 段落 | B001 構成確認 + dogfooding の ask 応答 | 充足 |
| R003 skill 置換 | `skills/amadeus-*` 38 個（写像 1 対 1） | parity:check、promote 検証 | 充足 |
| R004 独自 skill 整理 | 5 skill 削除、検証コード追随。旧 22 skill + steering は CD005 で後送 | test:all | 一部後送（CD005） |
| R005 Operation 採用 | stage 定義（エンジン同梱）、AMADEUS.md 改定 | エンジンの scope グリッド | 充足 |
| R006 成果物双方向一致 | v2 位置の 3.6 / 3.7 成果物、GD009 廃止実施、validator v2 契約 | validator（workspace と Intent）pass | 充足（新規 record はエンジンが v2 形式で生成） |
| R007 sensor + validator 併用 | sensors 4 種 + hook 発火（shard に SENSOR_* 記録）、validator v2 契約 | test:it:amadeus-validator | 充足 |
| R008 パリティ機械化 | parity-check.ts、parity-baseline.json、parity-map.json、CI 連鎖 | parity:check green（差分ゼロ） | 充足 |
| R009 規範改定 | AMADEUS.md、artifacts rules、Skill Language Policy、sensor-learn-mapping 注記、backward-compatibility.md | 参照残ゼロ確認、test:all | 充足 |
| R010 検証 green と examples | test:all green。examples 再生成は CD006 で人間判断待ち | test:all | 一部未了（examples 再生成） |
| R011 エンジン 1 周完走 | dogfooding（resume → build-and-test → ci-pipeline → PHASE_VERIFIED → WORKFLOW_COMPLETED をエンジンが記録） | audit shard のエンジンイベント | 充足 |
