# Feasibility Assessment — upstream-sync-230

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md`)

## 技術的実現可能性

intent-statement の定義する問題(upstream v2.2.0→v2.3.0 未追従)に対し、承認済み計画(`docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md`、ledger 8/8 APPROVED)の 24 ADOPT/ADAPT 項目はすべて実現可能と評価する。根拠は本セッションの実測(タグ SHA 固定・418 パス diff・Amadeus 側 grep 実証)に基づく。

| ブロック | 実現可能性 | 根拠 |
|---|---|---|
| エンジン正しさ修正(6項目) | 高 | 対象機構は Amadeus に実在・欠陥は実測済み(bolt_dag 無音 degrade はノルム化された既知問題)。upstream の修正設計が参照可能 |
| エンジン機能追加(4項目) | 高 | opt-in 設計(unit-major はバイト同一デフォルト)、スキーマ変更は既存の drift ガードで検証可能 |
| workspace 検出(2項目) | 高 | 加法的シグナル追加のみ。非該当プロジェクトはバイト同一出力 |
| ハーネス統合修正(3項目) | 高〜中 | execPath/クォートは機械的。kiro-ide hook context は最大のハーネス diff で、実機検証は Kiro IDE 上のみ可能(中) |
| レビュアー品質(2項目) | 高 | プロンプト/プロトコル prose 変更+6ハーネス再投影 |
| プラグイン機構(5項目) | 中〜高 | 最大ブロック。upstream 設計(単一 `compose.ts`、manifest 由来投影)は Amadeus の6ハーネス manifest 構成に適合するが、移植ではなく再実装。core バイト同一維持が成立条件で、既存 dist:check が検証器になる |
| テスト・docs(2項目) | 高 | 既存4層テストランナー・coverage 機構に載せる |

**検証先行項目(MEDIUM confidence)**: swarm-batch-advance / gate-next-stage-naming / help-routing / kiro-ide-hook-context の4項目は、inception(reverse-engineering / requirements-analysis)で現行挙動を実測してから移植可否を確定する — EQUIVALENT に解決してスコープ縮小する可能性がある(計画に明記済み)。

## リスク分析

- **スキーマ波及**: stage-schema 拡張(D6 root)は全6ハーネス dist に波及する。緩和: 全 Bolt で `dist:check` / `promote:self:check` を必須化(検証契約に含む)
- **プラグイン機構の規模**: 独立 construction スライス化を計画済み。walking-skeleton 規律(greenfield 要素の最初の Bolt を小さな end-to-end スライスに)を適用
- **上流との構造差**: 4→6ハーネス、`packages/framework` レイアウト、amadeus 名前空間 — 既知の構造変換として計画の Residual drift 節に固定済み
- **pre-2.2.0 の未認証域**: baseline は REVIEWED であり、それ以前の同等性は本 intent の保証範囲外(計画に明記)

## AWS ランドスケープ評価(aws-platform 視点)

N/A — 反証可能根拠: 本リポジトリはデプロイ基盤を持たず(memory/project.md Deployment 節)、amadeus スコープは Operation フェーズ全 SKIP。本 intent が触るのはエンジン/ハーネス/パッケージャ/docs のコードのみで、AWS サービス・アカウントの新規利用や変更は発生しない。

## 規制・ライセンス評価(compliance 視点)

規制要件なし(社内開発フレームワーク、個人データ・決済・医療情報の取り扱いなし)。ライセンス: upstream `awslabs/aidlc-workflows` は MIT-0(MIT No Attribution — 実読確認)、Amadeus は MIT/Apache-2.0 デュアル。設計参照・再実装・コード取り込みのいずれも帰属義務なく適法。upstream コードは読み取りのみで実行しない(計画の Fixed boundary 準拠)。

## 総合判定

**GO**(条件なし)。ideation 完了時点で park し、実装はユーザーの再開承認後 — これは実現可能性の条件ではなく、ユーザー設計のゲートである。
