# Business Logic Model — feature-diff

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)。

## 文書の構成設計（en / ja 同構成）

1. 冒頭: 目的、対象三者（main / v2 = b67798c3 / Amadeus）、読み方。
2. 「上流 main と v2 の関係」節: v1 系（main）と v2 の構造差を要約 + 上流リンク（FR-4。main の実測 tree = .claude / .kiro / aidlc-rules / docs / scripts）。
3. 全体サマリ表: 比較軸 → 一致 / 適応 / 独自 / 未取り込みの 4 区分（v2↔Amadeus の関係区分。main の状況は各軸の main 列と冒頭要約節が担う）。
4. 比較軸ごとの H2 節（FR-2 の 12 軸）: 各節 = 5 列表（観点 / 上流 main / 上流 v2 / Amadeus / 出典）+ 必要な注記。main 列は対応構造がない行は定型値「対象外（v1 系。冒頭要約参照）」、対応概念がある行は短い実値。

### 正準 H2 見出し（NFR-3 チェック②の照合対象。en / ja 対）

| # | en | ja |
|---|---|---|
| 1 | Lifecycle structure | ライフサイクル構造 |
| 2 | Scope set | scope 集合 |
| 3 | Engine tools | エンジンツール群 |
| 4 | Hooks | hooks |
| 5 | Sensors | sensors |
| 6 | Audit events | audit イベント |
| 7 | Question protocol | 質問プロトコル |
| 8 | Multi-agent operation | 多体連携運用 |
| 9 | Validator | validator |
| 10 | Installer | インストーラ |
| 11 | Harness | harness |
| 12 | Not yet adopted from upstream | 上流にあって Amadeus に無いもの |
5. 追従手順の節（FR-5）: 基準 commit 更新時の確認先（parity:check → parity-map 宣言 → 本文書の各節出典）+ 各機構文書リンク。

## 出典マッピング（軸 → 実測根拠）

| 軸 | 出典 |
|---|---|
| ライフサイクル構造 | stage-graph.json（32 stages）、docs/amadeus/lifecycle/、上流 core |
| scope 集合 | .agents/amadeus/scopes/（10 個、pdm = 独自 #429） |
| エンジンツール群 | .agents/amadeus/tools/（26 tools）、parity-map nameMappings |
| hooks | .agents/amadeus/hooks/（11 個） |
| sensors | .agents/amadeus/sensors/（4 個）+ 独自 2 段検出 #538 |
| audit イベント | audit-format.md（Event Registry 71 events + 設計境界節 #506） |
| 質問プロトコル | amadeus-grilling（独自結線）、question-rendering |
| 多体連携 | team.md 並行運用ポリシー（#497/#502/#551 = 独自運用） |
| validator | .agents/skills/amadeus-validator（独自） |
| インストーラ | scripts/amadeus-install.ts（#451 = 独自） |
| harness | harness/codex（#552 Phase 1、上流 harness/codex の部分適応）+ harness/claude 相当は .claude 配線 |
| 未取り込み | Adaptive Workflows = 取り込み済み（#428）、上流 build/emit 機構 = Phase 2 予定（#552 設計確定）、その他 #428 ドリフト 8 項目 |

## 検証（NFR-3 の決定論チェック 3 点の実装方法）

build-and-test で一時スクリプト（record 内に手順記録）により機械確認する: ①出典列の空欄行 grep ②FR-2 の 12 軸見出しの存在照合 ③en/ja の H2 一覧 diff。恒久 eval は作らない（Right-Sizing。#530 の lint 化は別 Intent）。
