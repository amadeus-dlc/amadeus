# Integration Test Instructions — intent 260816-priority-bug-batch-3

- filesystem / process を使う medium test は integration 層に配置(cid:code-generation:c2-doctor-seam)— t3046(Bun.spawn 実プロセス2本 + バリア同期)、t3149(record fixture + git 実操作)、t482(実 CLI next 駆動)
- 横断整合: 台帳ガード群(model-map SOURCE_DRIFT / allowlist fingerprint / coverage-registry freshness / event-registry 基数 pin 98 / no-silent-drop)を各レーンで対象実行し green を実測済み(各 code-summary)
- 統合断面のフルスイートは各 Bolt PR の CI(Tests - smoke + unit + integration)を正とする。着地は Bolt 番号順の直列(record 競合)
