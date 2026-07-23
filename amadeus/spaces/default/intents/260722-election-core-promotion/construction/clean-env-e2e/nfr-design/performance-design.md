# Performance Design — clean-env-e2e

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- performance-requirements の「serial 層+負荷偽赤回避」を実装形に固定: テストは tests/e2e/ の serial 命名で直列実行。temp 環境合成(business-logic-model のクリーン環境合成3手順)は **beforeEach でケースごとに再生成**(FD 不変条件「CleanEnv は afterEach で必ず破棄」に準拠 — ※iter1 の beforeAll 使い回し案は FD 矛盾として撤回)。コストは self-install コピー(数十ファイル)×5ケースで e2e 予算内 — 重い展開元の読み取りは同一なので OS キャッシュが効き、既存 setup-install e2e の同型処理と同オーダー
- tech-stack-decisions の既存基盤(node-pty 等)以外の新規プロセスを起動しない

## 検証設計

- performance-requirements の検証(e2e 層 wall-clock 前後比較+record 転記)を実装受け入れへ転記

## 他 NFR との整合

- reliability-requirements の teardown(afterEach 全削除)と beforeEach 再生成が対になり、ケース独立性と性能予算を同時に満たす(生成⇔破棄の symmetric-pair)。security-requirements の隔離 assert は各生成直後に走る(5回 — 定数)。scalability-requirements の固定5ケース閉集合がこの定数コストの上限を保証

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:28:32Z
- **Iteration:** 1
- **Scope decision:** none

Major1件: CleanEnv ライフサイクルの設計間矛盾(beforeAll 使い回し vs afterEach 全削除)— FD 不変条件(afterEach 破棄)準拠のケースごと再生成へ統一要

### Findings

- Major: performance-design を beforeEach 再生成へ是正し4文書の整合節を実メカニズムで書き直し

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:30:24Z
- **Iteration:** 2
- **Scope decision:** none

4文書の統一は閉包確認。残余 = logical-components.md の fake shim 行に beforeAll が残存(same-root 走査漏れ1箇所)— 是正一意・grep 閉包可能

### Findings

- 残余: fake shim 行を beforeEach 再生成へ(same-root sweep で全数閉包)
