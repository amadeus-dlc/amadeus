# Initiative Brief — チーム機能のコア昇格

> 上流入力(consumes 全数): intent-statement、scope-document、intent-backlog、feasibility-assessment、constraint-register(本文で統合)。optional の competitive-analysis / market-trends / build-vs-buy / team-assessment / wireframes は該当ステージ SKIP により設計上不在 — 各節に N/A 根拠を明記(approval-handoff:c4 準拠)

## Initiative 概要

amadeus 独自のエージェントチーム機能(チーム起動 / メンバー間メッセージング / 選挙による合意形成 / docs)を公式配布へ昇格する。intent-statement の課題定義のとおり、現状は開発リポジトリの非配布層(`scripts/`・`contrib/`)に散在し、外部利用者は到達不能。成功定義はクリーン環境 E2E(新規インストール環境で docs だけを頼りにチーム結成→選挙完走)であり、既存テスト基盤への組み込みで自動検証する。

## 承認済みスコープ(scope-document より)

- **In(Must)**: 選挙エンジン昇格(core/tools 移動+スキル配布化+ADR)、チーム起動配布面、メッセージング統合面(herdr/agmsg = PATH 前提の必須 prerequisite)、境界ガード新設、クリーン環境 E2E、docs(Team Mode 章 en/ja+3層配置規約)
- **Should**: バリエーション機能の搬送(codex/--instance/-c/サイズ/spawn 系 — E2E 保証なし)
- **Won't**: 外部ツール同梱・抽象化、memory シードテンプレ、Windows、手動実証、選挙 CLI 機能拡張

## 実現性と制約(feasibility-assessment / constraint-register より)

総合判定 **GO**。4要素すべて実現性「高」— 決定打は prerequisite モデルの裁定(外部依存の配布問題が解消)。主要制約: Bun-only 配布(T-1)、core/tools の全ハーネス投影(T-2、ADR 必須)、macOS+Linux 下限(T-3)、drift guard 定型(T-4)、境界ガード(T-5)、PATH 契約+実測バージョン記録(T-6)。

## バックログと順序(intent-backlog より)

proto-Unit 6件を dependency + risk-first で実行: PU-1 境界ガード → PU-2 選挙昇格 → PU-3 起動/メッセージング配布面 → PU-4 E2E → PU-5 docs → PU-6 バリエーション維持(Should)。ハードデッドラインなし。

## リスクと承認

RAID 上位(R-1 agmsg 入手経路未確定 / R-2 herdr バージョン互換)は緩和策付きでユーザーが承認済み(approval-handoff Q1 = A、2026-07-23)。R-1 は docs 執筆前の確定を条件とし、未確定時はユーザーへ再エスカレーション。

## リソースと体制

Ideation で確約するリソースは Inception の分析工程と人間ゲートまで(approval-handoff:c3 準拠 — Construction の staffing / schedule は Units と依存の確定後、delivery-planning で承認する。未確定の mob 編成をここで捏造しない)。実行体制の現況: e6 が conductor、判断はユーザー直接回答(選挙不実施)、leader へ節目報告。

## SKIP ステージの N/A 根拠(approval-handoff:c4 準拠)

- **market-research(競合分析・市場動向)**: N/A — 自プロジェクトの既存機能の配布昇格であり、市場投資判断を要しない。代替内部証拠 = intent-statement のトリガー(ユーザーの明示的意思決定)
- **team-formation(team-assessment)**: N/A — 既存のドッグフードチーム体制で実行し、staffing 判断は delivery-planning へ委ねる
- **rough-mockups(wireframes)**: N/A — UI を持たない CLI/配布系 intent。出力様式は既存兄弟ツールの既習様式に従う(ui-less-mockups-as-output-contract は Inception の refined-mockups 相当が実行される場合にそこで充足)
