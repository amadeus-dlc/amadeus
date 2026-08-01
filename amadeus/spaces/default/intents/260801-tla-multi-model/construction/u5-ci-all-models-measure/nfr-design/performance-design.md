# Performance Design — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): performance-requirements(PR-1〜PR-3), security-requirements, scalability-requirements(SC-1〜SC-2 — 本書へ畳み込み、後述), reliability-requirements, tech-stack-decisions(現行スタック据え置き・新規選定なし), business-logic-model(u5 functional-design §2.2 / §2.3 / §3.4 / §7 / §8 — 実行マトリクス・evidence per-model 化・run 予算・計測計画・エスカレーション)

本 Unit は CLI/CI バッチツールの変更であり、性能設計の対象は **CI ジョブ時間予算への適合**と **モデル次元の線形スケール**のみである。新規のキャッシュ・非同期化・プーリング等の性能機構は導入しない(tech-stack-decisions どおり新規技術要素なし)。設計は全て functional-design が既に指定した機構の写像であり、本書は機構を新たに発明しない。

## PD-1: CI 時間予算適合の設計(PR-1)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| PR-1(30 分 timeout 内) | **measure-first シーケンス**(BLM §7.1): diagnostic 事前計測 → per-run 予算 190 秒との整合確認 → CI 実測 → record 固定の4段。推測で予算を置かず、実測で整合を取る(ADR-8) | t406 AC2 の CI green 実測証跡(acceptance.json の cliMs/spawnMs/elapsedMs)が record の code-generation 証跡ファイルへ固定されること(BR-E1) |
| PR-1(per-run 予算) | **run 予算 190 秒据え置き**(BLM §3.4): verified-source 層でも diagnostic の 300 秒ではなく port の既存予算を継承し、超過は timeout 系失敗として証跡化。予算の緩和は禁止(BR-T1) | port 統合テスト(t-formal-verif-node-ci-model-check-port 改訂版)の timeout 期待値不変ケース |
| PR-1(総量見積り) | **実行マトリクスの固定**(BLM §2.2): モデル外側ループ × warm-up 0 + measured 1-5 の 6 run 内側 = `6 × N` run の逐次構造。2 モデルで 12 run + bootstrap 最大 300 秒の算術で 30 分に突き合わせる | t406 AC2(12 run evidence の生成と verify green)+ 超過時は BLM §8 エスカレーション(BR-T2)— 緩めて閉じないこと自体が設計 |

## PD-2: 統計 pin の計測設計(PR-2)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| PR-2(基準値一致) | **ModelTlcEvidence + 共有抽出器**(BLM §2.3 / §3.4): 各 run の `tlc-stdout.bin` を diagnostic の `extractDiagnosticStatistics` で抽出(複製実装を置かない — BR-E4)し、MirrorLifecycle measured run の 4 値(generatedStates 208,628 / distinctStates 89,099 / searchDepth 18 / statesLeftOnQueue 0)+ completion marker を基準値完全一致で pin(BLM §7.3) | t406 AC2 の統計一致 assert(実測証跡の assert 含む)。不一致は verify 赤で、値を黙って更新しない |
| PR-2(決定性の前提) | TLC 固定 jar・workers 1・同一 cfg の不変(tech-stack-decisions — docker/tla2tools 既存機構据え置き、BR-F2)。所要時間は計測・記録するが閾値は設けない(実測待ちの数値捏造禁止) | 既存 bootstrap supply-receipt / validateDockerReceipt 検査の不変(維持仕分けテスト) |

## PD-3: リソース利用設計(PR-3)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| PR-3(逐次・非侵襲) | **並列化禁止の逐次実行**(BLM §2.2 — ADR-4 却下案 (b) どおり reservation 機構非侵襲)。新規の常駐プロセス・メモリ要件なし | ci-model-check-runner 統合テストの短絡・順序期待値(モデル反復順 × run index 順のフラット配列) |

## PD-4: モデル次元のスケール設計(SC-1 / SC-2 — scalability-requirements の畳み込み)

scalability-design.md は当初 kind ゲート([service])により本節への畳み込みとしていたが、engine の produces 要件に従い独立 artifact として生成済みであり、適用内容は scalability-design.md §SCD-1 / §SCD-2 と同一である(本節はその相互参照として残す)。scalability-requirements の N/A 判定(負荷増大・データ成長・オートスケールは CI バッチの性質上 N/A)は同 artifact の段落どおりであり、判断はそちらへ前方参照する。

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| SC-1(O(N) 線形) | **宣言駆動の反復一般化**(BLM §2.2 / §2.3): 実行量・evidence 量は登録モデル数 N に比例するだけ。acceptance.json の runs 配列は `6 × N` のフラット配列、domain validator の長さチェックは `6 × モデル数` へ一般化。モデル追加コストは model-map.json の宣言のみで CI ツールのコード変更を要しない(`--model` 未指定の既定 = 全登録モデルがそのまま追随) | t406 AC2(2 モデル = 12 run evidence)と runner 統合テストの長さ一般化ケース |
| SC-2(超線形アルゴリズム非導入) | u1 リゾルバの消費は loader 経由のみ(BLM §1)。u5 側に新たな計算量ホットスポットを導入しない | 既存 u1/u2 テスト(維持仕分け)green + 本 Unit の差分に新規ループ構造がモデル反復のみであることのレビュー |

## N/A 判定(performance-requirements の段落を踏襲)

- レスポンスタイム / スループット / UI レイテンシ: **N/A** — CLI/CI バッチツールであり、同期応答する API や UI を持たない(performance-requirements N/A 節・business-logic-model §0 へ前方参照。本設計でも最適化対象として扱わない)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T22:06:26Z
- **Iteration:** 1
- **Scope decision:** none

All 5 artifacts exist with correct headers; every PR/SR/SC/RR maps to an existing mechanism with named verification; N/A evidence-based; prohibitions faithful. Findings: none.

### Findings

- None
