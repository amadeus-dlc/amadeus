# コード生成サマリー — pi-doctor-diagnostics

## 変更内容

- `amadeus-pi-doctor.ts` に8つのclosed diagnostic checksとstructured snapshotを追加した。
- `amadeus-utility.ts doctor` のPi branchへread-only診断を接続した。
- Pi 0.83.0未満、native Windows、trust/resource/driver欠落を局所failureとして分類した。
- trustはnearest ancestorをread-onlyで判定し、Codex/Claude固有settingsを要求しない。
- unit/integration testsと全harness generated projectionを追加した。

## 実装判断

- 期待値は `.pi/tools/data/harness.json` のnative runtime/resource hash catalogから取得する。
- doctorはfile修復、trust承認、provider変更を行わず、blocked workflowから独立して完走する。
- path、username、credential-bearing URL、secretは出力前にredactする。

## テスト結果

- referee: converged、tamperなし。
- Pi doctor unit/integration: 5件成功、0件失敗。
- `bun run typecheck`: 成功。
- 全8 harnessの `package.ts --check`: 成功。
- 本Unitのno-silent-drop finding: 0。

## 計画との差分

- Pi driver/guardian/extensionにbatch 1由来のNSD001が9件残っている。doctor Unitの所有範囲外のため本Unitでは変更せず、最終cross-unit補正へ引き継いだ。
