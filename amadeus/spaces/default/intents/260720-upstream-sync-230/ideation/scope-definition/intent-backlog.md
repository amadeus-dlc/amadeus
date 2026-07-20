# Intent Backlog — upstream-sync-230(優先順位付き proto-Units)

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md`)、feasibility-assessment(`../feasibility/feasibility-assessment.md`)、constraint-register(`../feasibility/constraint-register.md`)

> 優先度は dependency-first+risk-first(Q4 裁定)。全項目 Must のため MoSCoW 内の序列ではなく着手順序を表す。最終的な Unit 分割・Bolt 列は units-generation / delivery-planning が確定する(ここは proto-Unit の粗い束)。

## PU-1: 検証先行スパイク(inception 内で消化)

- 対象: swarm-batch-advance / gate-next-stage-naming / help-routing / kiro-ide-hook-context の現行挙動実測(MEDIUM confidence 4項目)
- 理由: risk-first — EQUIVALENT 判明ならスコープ縮小(feasibility RAID R3)。construction に入る前に requirements を確定させる
- 依存: なし(reverse-engineering / requirements-analysis の一部として実施)

## PU-2: エンジン正しさ修正バッチ(D1)

- 対象: bolt-dag-selfheal → (swarm-batch-advance) / gate-revision-backstop / compose-pending-freshness / recompose-autonomy-guard / (help-routing)
- 理由: 実測済み欠陥の封鎖 = 最小価値スライス(Q1)。bolt-dag-selfheal は swarm 検証の前提(RAID D3)
- 依存: PU-1 の検証結果(括弧付き項目)

## PU-3: 機械的 ADOPT バッチ(D4 の2+D5)

- 対象: execpath-spawn(6ハーネス)/ project-dir-quoting / reviewer-date-persona / reviewer-read-scope
- 理由: 小さく独立・波及は dist 再生成のみ。早期に利用環境の信頼性を回収
- 依存: なし(ファイル面が PU-2 と非交差なら並行可 — c6 判定は delivery-planning)

## PU-4: workspace 検出バッチ(D3)

- 対象: nested-root-detection / submodule-detection
- 理由: 加法的シグナル・独立。同一スキャナ面のため同一 proto-Unit に束ねる
- 依存: なし

## PU-5: スキーマ共有面(D6 root+D2 の kind)

- 対象: stage-schema-extensions+unit-kind-pruning(同一スキーマ面 — RAID D2)
- 理由: dependency-first — D6 の root であり D2 最大項目と交差するため単一設計で確定
- 依存: なし(ただし全6ハーネス dist 波及 — constraint T3/T4 の検証必須)

## PU-6: エンジン機能残(D2)

- 対象: unit-major-iteration / scope-cost-preview / gate-next-stage-naming(検証結果次第)
- 依存: PU-5(スキーマ)、PU-1(gate-next-stage-naming)

## PU-7: プラグイン機構本体(D6)

- 対象: packager-plugin-projection → plugin-compose-hook → test-pro-reference-plugin / plugin-docs
- 理由: 最大ブロック。walking-skeleton 規律で最初の Bolt を最小 end-to-end スライス(単一ハーネスの単一プラグイン投影)に切る
- 依存: PU-5(stage-schema-extensions)

## PU-8: kiro-ide hook context(D4 残)

- 対象: kiro-ide-hook-context(検証結果次第でスコープ確定)
- 依存: PU-1

## 横断(全 PU に随伴)

- D7 ported-tests: 各 PU の実装 Bolt に同梱(テストは第一級成果物 — org.md Testing Posture)
- D8 docs-updates: 各 PU の着地に同梱または最終 record-sync に束ねる(t174 legacy-refs gate green 維持)
