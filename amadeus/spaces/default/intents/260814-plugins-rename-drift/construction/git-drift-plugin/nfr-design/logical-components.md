# Logical Components — git-drift-plugin

上流入力: `functional-design/domain-entities.md`(型・port)、`functional-design/business-logic-model.md`(アルゴリズム)。

## 論理コンポーネント配置

| 論理コンポーネント | 物理配置 | 責務 |
|---|---|---|
| DriftDetector | `plugins/git-drift/tools/amadeus-sensor-git-drift.ts`(純ロジック部) | detectDrift(behind + 交差判定 + 報告整形) |
| FetchThrottle | 同上(throttle 部)+ `amadeus/.amadeus-sessions/git-drift-fetch.json` | fetch の頻度制御(fetch のみ skip) |
| GitPort / ClockPort | 同上(port 定義 + 本番実装) | git 実行・時刻のテストシーム(fake はテスト側) |
| SensorManifest | `plugins/git-drift/sensors/amadeus-git-drift.md` | id/severity/matches/command/timeout の宣言 |
| PluginManifest | `plugins/git-drift/plugin.json` | stages:[] + seams 2 + sensors + tools + settings 宣言 |

## 配置原則

- 単一ツールファイル内にロジックを凝集(プラグインは core import 不可のため共有基盤に依存できない — ADR-6。ファイル分割は実装時に既存プラグインのイディオム(pr-convergence の tools 分割粒度)へ合わせてよいが、公開 seam は CLI 契約のみ)。
- conformance テスト(stages:[]+sensors+seams 形状)は `tests/` 側に配置し、U3 境界の ownership に揃える。
