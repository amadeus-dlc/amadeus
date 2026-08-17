# Security Test Instructions — intent 260816-priority-bug-batch-3

本 intent は認可・監査境界(P4)を直接触るため、Mandated「認可に関わる変更を directive contract、state transition、audit invariant、race、harness drift のテストで検証」を以下で充足する(独立したセキュリティスキャンの数値目標 NFR は不在 — 生成せず、根拠は performance と同様 no-test-theatre)。

| 面 | 検証 |
|---|---|
| 認可(presence)| t188: milestone 空振り承認の拒否(fail-closed)、guard-disabled の正直記録、backfill のみのゲート拒否 |
| 認可(override)| t3149: presence 不在 override の拒否(負例 pin)、偽造 merge facts の拒否 |
| audit invariant | t482: append-only 維持・冪等鍵 dedup・fail-open で監査失敗がゲートを阻害しない。event-registry 基数 pin 不変 |
| race | t3046: 実プロセス並行 append の TOCTOU 解消 + property |
| state transition | t206/t185: workspace_requires の attribution 原則(sibling 誤帰属なし)両側テスト |
| harness drift | 各レーンの `bun run build` + 生成物 drift 検査(CI) |

秘密情報のハードコード・新規入力面の追加はなし(全 unit 既存境界内の修正)。
