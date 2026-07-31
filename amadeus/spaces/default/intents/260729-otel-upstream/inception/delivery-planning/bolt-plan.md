# Bolt Plan — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`（すべて参照済み）

統合方式: **1 Bolt = 1 PR**（ユーザー指示 2026-07-29。各 Bolt は独立 PR でマージしてから次へ）。

序列方針: risk-first ≡ walking-skeleton-first（Q1-A）。原則 1 Unit = 1 Bolt、U9＋U10 をバンドル（Q2-A）で計10 Bolt。並行は gated swarm（Q3-A、builder 最大4・バッチ境界ゲート、`team-practices.md` ## Deployment 既定どおり）。実行者は全 Bolt とも amadeus-developer-agent（team-formation SKIP のため）。

## Bolt 1: otel-walking-skeleton【WALKING SKELETON・人間ゲート必須】

- **Unit**: U1
- **証明するアーキテクチャ層**: OTel API（上流）→ 3 Provider → Local Exporters → audit JSONL／Signal Stores の全層貫通＋ Context 維持＋単一 bundle
- **DoD**: #1678 合格条件すべて（OTel API が唯一の上流・EventRecord が AuditLogExporter へ到達・Span が LocalSpanExporter へ到達・失敗契約が ADR＋実証テストで確定・Logs API 採否と version pin 確定・async Context 維持分離・network flush なしで短命 process 終了・Bun-only 単一 bundle・sync I/O コストと bundle size が予算内）。代表 1 CLI・1 hook・1 subprocess のみ接続、本番 call site 不変更
- **Confidence hypothesis**: 「Bun 上で OTel API ファミリー唯一の上流と同期 Local Exporter が成立し、現行と同等の耐久性を損なわない」
- **検証の最上位**: Bun Context Manager の実検証と Logs API 採否（Q5-A）
- **不合格時**: 撤回し #1628 へ戻す（hard gate。後続 Bolt は起動しない）

## Bolt 2: event-registry

- **Unit**: U2。**DoD**: 78 語彙が型付き Registry に登録され、drift guard（compile-time・unit test・sensor）が4集合の乖離を拒否する
- **Confidence hypothesis**: 「語彙 drift が CI で機械的に阻止できる」

## Bolt 3: journal-v2

- **Unit**: U3。**DoD**: schema v2 codec＋v1/v2 reader＋mixed shard merge が property test（mixed・複数 clone・worktree）を通過。View/pretty-print が v2 から生成できる
- **Confidence hypothesis**: 「新旧混在期間の read/merge が破壊なく成立する」

## Bolt 4: context-propagation

- **Unit**: U5。**DoD**: 子 process／subagent／hook が同じ Trace に接続され、Intent Context を別 process で復元できる
- **Confidence hypothesis**: 「跨 process の因果が推測なしに接続できる」

## Bolt 5: local-exporters

- **Unit**: U4（依存: U2, U3）。**DoD**: 4 Exporter が本番品質（redaction 二層・fail-open 分離・Registry 受理検証）で動作し、telemetry 成果物の credential-free ゲート（VER-2）が配線される
- **Confidence hypothesis**: 「機微情報を流さずに全 Signal をローカル耐久化できる」

## Bolt 6: journal-reader-swap

- **Unit**: U6。**DoD**: doctor／recovery／presence／grant／merge／runtime graph／learnings が共通 reader で v1/v2 を読み、既存テストが通る
- **Confidence hypothesis**: 「reader 差替えは利用者から不可視で行える」

## Bolt 7: metrics-logs（バンドル）

- **Unit**: U9＋U10。**DoD**: Counter／Histogram と diagnostic Logs が Trace Context 相関で Store に出力される
- **Confidence hypothesis**: 「集計値と診断ログが trace と相関して参照できる」

## Bolt 8: callsite-migration

- **Unit**: U7（依存: U4→Bolt 5）。**DoD**: 全 call site が OTel API 経由となり、call-site guard が直接呼出しゼロを CI で証明。新旧 Signal の shadow 比較 report が同等以上
- **Confidence hypothesis**: 「約1600 call site の移行が振る舞いの回帰なく完了できる」

## Bolt 9: legacy-writer-removal

- **Unit**: U8。**DoD**: 削除ゲート全6条件の機械検証を通過し、旧 writer が削除される
- **Confidence hypothesis**: 「旧実装は二度と必要にならない（削除ゲートの客観的判定）」

## Bolt 10: otlp-relay

- **Unit**: U11（依存: Bolt 8 の shadow 比較完了）。**DoD**: Projector が Relay に縮退し、Relay が Journal から Span を生成しないことのテスト証明がある
- **Confidence hypothesis**: 「推測なしの転送のみで Collector 連携が維持できる」
