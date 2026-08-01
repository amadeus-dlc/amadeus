<!-- per-unit code-generation diary -->

- 2026-07-30 batch 4 swarm ディスパッチ（worktree bolt-callsite-migration、base = #1718 着地後の otel-improvement）
- 設計裁定5件: E-U7CG-Q1（guard は tests/ 配置、2-0）/ E-U7CG-Q2（実書換え99行 batch 込み、2-0）/ E-U7CG-Q3A（per-call intent/space は fail-closed throw、2-0）/ E-U7CG-Q3B（tie → ユーザー裁定 案A' = 戻り値拡張のみ本 Bolt）/ E-U7CG-Q2R（Q2 前提不成立の実測2機構により実書換えゼロ充足へ改訂、2-0）
- Bugbot 指摘（同一行複数呼出しの undercount、Medium）: matchAll 化＋count=2 回帰＋落ちる実証で是正（c363ed0e8）、conductor がスレッド resolve
- CI 赤2種の是正: ci.yml 構造ピン（hash re-baseline — 許可集合列挙でなく SHA-256 ピン機構のため、260725-mirror-review-fixes と同経路。落ちる実証追加）/ patch coverage 10行（全件実テスト被覆、local-lcov-pre-push 違反を申告）。t258/t259 は corpus root 実測により自変更起因でないと確定（負荷起因）
- PR #1733 CI 全 green → ユーザー承認により squash マージ（1c1db28ac、2026-07-30T11:30:58Z）
- builder が統合 base の cross-merge 検証（emitEvent 戻り型 × U10 同居面、U9/U10 の legacy site 持ち込みゼロ）を実測 — 全 green
- 後続義務: Task #1（per-call/lock 再入の canonical 化裁定）/ Task #2（bootstrap 方針＋requiredAttributes 突合＋実書換え batch 編成）を U8 前に実施
