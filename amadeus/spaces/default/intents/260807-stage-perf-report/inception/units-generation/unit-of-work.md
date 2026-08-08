# Unit of Work — 260807-stage-perf-report

上流入力(consumes 全数): components(C1〜C9 の責務分割と規模見積りを Unit 境界の根拠として消費)、component-methods(シグネチャとエラー処理方針を Unit 責務の実装面として消費)、services(単一 CLI サービス構成を Unit=サービス対応の根拠として消費)、component-dependency(外部依存 `amadeus-journal.ts` のみという境界を Unit 独立性の根拠として消費)、decisions(ADR-1 実装形態 / ADR-3 命名 / ADR-5 純関数分離を Unit 定義の裁定として消費)、requirements(FR-1〜FR-7 / NFR-1〜NFR-5 を Unit 責務の完了条件として消費)

## Unit 一覧

### U1: stage-stats-cli

- **kind**: `service`(単発実行の CLI 実行可能物 — 常駐しないが「デプロイされる実行可能物」として service を適用)
- **説明**: ステージ実行パフォーマンスレポート CLI `packages/framework/core/tools/amadeus-stage-stats.ts`(ADR-1/ADR-3)。監査シャード 2 世代の正規化読取(FR-1)、idle 減算による net 実作業時間(FR-2)、§12a レビューイテレーション集計(FR-3)、センサー FAILED 率(FR-4)、モデル帰属(FR-5)を Markdown / CSV / `--json`(FR-6、ADR-4)で決定的に出力する read-only ツール(FR-7)
- **境界**: 単一ファイル(components.md の C1〜C9 モジュール分割を内包)+ twin テスト(t481 unit: 純関数 / t482 integration: 実 FS+CLI spawn — NFR-2)。`amadeus-subagent-stats.ts` は無変更(C-2)
- **責務**: FR-1〜FR-7 の全機能要件と NFR-1〜NFR-5 の全非機能要件の充足。除外バケット報告(ADR-6)と落ちる実証(NFR-5)を含む
- **デプロイモデル**: embedded — `packages/framework/core/tools/` 配置で既存 coreDirs 投影により全ハーネスへ配布(NFR-4)。独立デプロイなし
- **複雑度**: **M**(約 700〜900 行 — components.md の実測按分見積り。純関数群 500-600 / FS+CLI 200-300 + twin テスト)
- **実装ノート/制約**:
  - 依存は `node:fs`(read API のみ)/ `node:path` / `amadeus-journal.ts` に限定(ADR-2、`amadeus-lib.ts` 非依存)
  - fs write API を import しない(FR-7a — 自動テストで import 0 件を検査)
  - p95 は `tests/lib/percentile.ts` の意味論を鏡映実装(import しない — 出荷境界)
  - 出荷コメント・文字列に `scripts/` トークンを置かない(NFR-4、t258 boundary guard)
  - 新規テスト番号は t481 以降(NFR-2 — 実装時に最終 base で採番衝突を再確認: cid:code-generation:c1-tnnn-collision-on-regrounding)

## Unit 分割の検証(cid:units-generation:c1(a))

単一 Unit の妥当性: 候補となる内部境界(純関数コア / FS+CLI shell)はいずれも片側単独では利用者価値(単一コマンドでのレポート出力)を出荷できないため、単一 Unit へ統合する。1 Issue(#2405)= 1 Unit 原則とも整合。分割の実益(並列実装)は本 intent の規模(単一ファイル)では発生しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:37:41Z
- **Iteration:** 1
- **Scope decision:** none

Step 6 の3成果物契約(kind 宣言・複雑度数値見積り・入れ子 yaml edge block・被覆検証)を充足し、2.7/2.8 境界も遵守。stories.md 不在は FR 正本写像で捏造なく処理、上流との無申告逸脱なし、kind=service も妥当。残る指摘は上流参照ヘッダの実質性に関する軽微な FOLLOW-UP のみ。

### Findings

- FOLLOW-UP | unit-of-work.md:3 — 上流入力ヘッダの component-methods 消費宣言に対し、本文が具体シグネチャ・エラー処理方針を明示引用していない — 実参照への1文追記が望ましい。
- FOLLOW-UP | unit-of-work-dependency.md:3,20 — component-methods 消費宣言に対し :20 は amadeus-journal.ts 側の言及であり component-methods.md への具体参照ではない — 実参照追記が望ましい。
- FOLLOW-UP | unit-of-work-story-map.md:25-27 — C4 の「独立」括弧書きと component-dependency.md の DAG との整合を一文説明するとより明確(実質的矛盾ではない)。
