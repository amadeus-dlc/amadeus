# Code Generation Plan — live-e2e-common-hardening

## スコープ

承認済みU02設計を優先し、`tests/harness/live-e2e/testing/`にoffline adversarial test kitだけを追加する。U01のproduction export、type、taxonomy、ledger schema、matrix schemaは変更しない。対象はFR-1〜FR-6、FR-10、FR-11およびNFR-1〜NFR-5のうち、U02が所有するtransport非依存verificationである。

## 実装手順

- [x] Step 1: `ContractCase`、closed fault/terminal schema、seed付きstrict opt-in property generatorを実装する（FR-1、FR-2、FR-10、BR-D01、BR-P01〜P04）。
- [x] Step 2: transport固有情報を持たないscripted fake adapter/journeyとoffline fixtureを実装する（FR-3〜FR-6、BR-D02〜D05、BR-O03〜O05）。
- [x] Step 3: terminal taxonomy、run ownership、trace順序、env allow-list、canary非流出、credential-bearing resource cleanup、bounded outputを判定するsanitized oracleを実装する（FR-4〜FR-6、FR-10、NFR-1、BR-S01〜S05、BR-L01〜L06）。
- [x] Step 4: baseline greenとmutant redをstable assertion IDで証明するevidence helperを実装する（FR-10、BR-E01〜E03）。
- [x] Step 5: schema/property/oracle/evidenceのunit testsを追加する（Comprehensive test strategy、FR-1〜FR-6、FR-10）。
- [x] Step 6: fakeを既存production `runLiveJourney`へ接続するintegration testsを追加し、success、prepare failure、timeoutのcleanup契約を検証する（FR-5、FR-6、FR-11）。
- [x] Step 7: 既存Bun test設定を使用し、focused tests、lint、typecheck、package/promote drift guardを実行する（NFR-5）。追加のtest configurationは不要であることを確認する。
- [x] Step 8: 実装結果、変更ファイル、テスト、設計からの逸脱を`code-summary.md`へ記録する。

## Traceability

上記Step 1〜8は、U02 Functional DesignのVerification MatrixとBusiness Rulesを実装単位へ直接対応付ける。transport別production probeはU01/U03〜U11のownerであり、本計画には含めない。ledger crash/recoveryとmatrix driftのproduction動作はU01既存testsを依存契約として維持し、U02ではclosed terminal/oracleとevidence表現を再利用可能にする。
