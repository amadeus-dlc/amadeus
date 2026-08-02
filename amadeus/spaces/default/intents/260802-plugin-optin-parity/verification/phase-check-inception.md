# Phase Check — Inception（Issue #2018 plugin opt-in parity）

## 検証メタデータ

- 検証日時: 2026-08-02T09:50:55Z
- 検証者: conductor
- Scope: `self-fix`
- Depth: Minimal
- Test Strategy: Comprehensive
- 検証断面: `689c38744cb9`
- 次ステージ: `code-generation`

## 実行ステージと成果物

self-fix の Inception 実行集合は Reverse Engineering と Requirements Analysis である。User Stories、Application Design、Units Generation、Delivery Planning を含む他の Inception ステージは scope 定義により SKIP されているため、後続実装は承認済み要件から直接追跡する。

| ステージ | 状態 | 成果物 | 検証結果 |
|---|---|---|---|
| Reverse Engineering | 承認済み | CodeKB 9成果物、`re-scans/260802-plugin-optin-parity.md` | 対象を7利用面・6ハーネスディレクトリとして特定し、project設定・導入元・合成結果・有効化判定の責務境界を記録済み |
| Requirements Analysis | 承認回答 `Approve` 受領済み | `requirements.md`、`requirements-analysis-questions.md` | Q1〜Q3回答済み、reviewer iteration 2 `READY`、required-sections・upstream-coverage・answer-evidence 合格 |

## トレーサビリティ

| 要件 | 上流根拠 | 主な実装境界 | 検証境界 | 状態 |
|---|---|---|---|---|
| FR-1 / FR-1A | #2018 のproject-level opt-in要求、Q1=A | `amadeus-config.ts`、`amadeus-plugin.ts` | config単体、install/drop/compose統合 | Fully traced |
| FR-2 / FR-2A | fresh worktreeの0/0誤判定、Q2=A | `amadeus-plugin.ts`、`amadeus-plugin-compose.ts`、各ハーネスadapter、OpenCode plugin hook | 7利用面の初回導入、失敗・再試行・原子性統合 | Fully traced |
| FR-3 | `isRecordCurrent` の0 discovered / 0 recorded fail-open | `amadeus-plugin.ts` のcurrentness・doctor・status | `not-selected`〜`failed`状態表、警告・終了値 | Fully traced |
| FR-4 | #2018の3チェックポイント・main/single parity | `amadeus-plugin-activation.ts`、`amadeus-orchestrate.ts` | Requirements Analysis / Functional Design / Build and Test × main / single × 全ハーネス | Fully traced |
| FR-5 | 空集合ハッシュによる偽current、Q3=A | `amadeus-plugin-activation.ts`、formal-model-check plugin | 0件導入成功、未準備、明示検査失敗、対象追加・削除 | Fully traced |
| FR-6 | plugin未選択repoのzero-impact | plugin CLI、起動hook、packaging・promotion | clean host回帰、既存CLI回帰、distribution drift guard | Fully traced |
| NFR-1 / NFR-2 | 決定性、冪等性、fail-closed、所有境界 | config validator、plugin transaction、contained path | 再実行byte同一、途中失敗、path traversal・不正名 | Fully traced |
| NFR-3 | Bun-only・全ハーネス共通core | framework core、harness adapter、生成projection | typecheck、全配布面、macOS/Linux/Windows対応契約 | Fully traced |
| NFR-4 | セッション開始時の退行防止 | no-op fast path、自動導入経路 | 同一runnerのp95基準 | Fully traced |
| NFR-5 | 無音失敗の解消 | 構造化状態、hook警告、doctor | 状態コード・plugin名・ハーネス名の出力照合 | Fully traced |

## 裁定と整合性

- Q1=A: 導入対象のplugin名をproject rootの`amadeus/config.json`へ記録する。`plugins/<name>/`の存在だけを導入意思とみなさない。
- Q2=A: OpenCodeの`manual-only`分類を廃止し、公式pluginフックから自動導入を起動する。OpenCodeだけを例外にしない。
- Q3=A: 初回導入は仕様0件でも成功させるが、検査対象が揃うまで未準備とし、成功や「変更なし」を記録しない。明示検査はエラーにする。
- 3裁定は相互に矛盾せず、要件書のFR-1〜FR-5と受け入れ条件へ反映済み。
- 未定義用語の検出と用語定義の正本統一は #2029 / #2030 に分離し、#2018の実装へ混入していない。

## Coverage

- 機能要件群の上流根拠: 6 / 6（100%）
- 機能要件群の実装境界: 6 / 6（100%）
- 機能要件群の検証境界: 6 / 6（100%）
- 非機能要件の検証境界: 5 / 5（100%）
- 未回答質問: 0
- 未解決事項: 0
- 孤児要件: 0
- 矛盾: 0

## 品質ゲート

- Product Lead reviewer: iteration 1 `NOT-READY` の6 findingを修正し、iteration 2 `READY`、finding 0。
- センサー: `required-sections`、`upstream-coverage`、`answer-evidence` の最終実行はすべて `SENSOR_PASSED`。
- 学習リチュアル: 4候補を利用者が推奨どおり採用し、project-level practiceへ永続化。追加学習は「なし」。
- `git diff --check`: 合格。

## Warnings

- 設計・Unit・Delivery Planning成果物がないのは欠落ではなく、`self-fix` scopeの明示的なSKIPである。Code Generationでは本書の直接トレースを維持する。
- このphase-checkは実装前の追跡可能性を検証する。コードとテストの実測結果はBuild and Testで確定する。

## 判定

Inception完了条件を満たす。Requirements Analysisの承認を確定し、Constructionの`code-generation`へ進行可能。

## Human approval

- [x] Requirements Analysis の `Approve` を受領済み
- [x] Code Generation への進行を要求済み
