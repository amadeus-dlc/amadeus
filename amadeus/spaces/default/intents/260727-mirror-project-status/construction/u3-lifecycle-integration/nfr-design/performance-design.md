# Performance Design — u3-lifecycle-integration

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

performance-requirements の「配線が呼び出し予算を破らない・ゲート評価はオフライン」を、business-logic-model の boundary 別挙動表と completion ゲート手順の構造で実現する。キャッシュ・非同期等の常駐系パターンは非適用(performance-requirements の非目標 — cid:nfr-design:c1)。

## 呼び出し予算の維持設計

- **boundary 配線は同期経路の再利用のみ**: 各 boundary(business-logic-model の表 — 既存5種)は U1/U2 の同期経路を1回呼ぶだけで、U3 固有の API 呼び出しを追加しない(performance-requirements)。boundary 種別も新設しない(tech-stack-decisions の決定)。
- **parked の早期 return**: parked boundary / park 中 manual sync は期待 Status 導出が keep となり mutation 0 回(business-logic-model の表 — reliability-requirements の parked 不変性)。分岐を mutation より前に置く配置で API コストを構造的にゼロにする。

## completion ゲートのオフライン評価

- `completionProjectGate` は台帳のみを入力とする決定的評価(business-logic-model 手順1)— Project API 照会 0 回(performance-requirements の「API コスト 0」契約)。評価コストは台帳 entry 数に線形(scalability-requirements)。
- ready 判定後の close は既存の1操作ずつ前進(business-logic-model 手順3)— 追加のポーリング・待機を設計しない。

## 実行時間の境界

- gh サブプロセスの deadline/stdout cap は既存 profile(performance-requirements の実装直読: amadeus-mirror-runner.ts:29)を消費 — U3 でタイムアウト・throttle を追加しない。

## 非目標

- レスポンスタイム SLO・スループット目標: N/A(performance-requirements の N/A 規律 — チェーン内実行のみ)。ask 文言の生成(security-requirements の同意境界面)は文字列組み立てのみで性能面の設計対象外。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T10:51:48Z
- **Iteration:** 1
- **Scope decision:** none

consumes 接地・実装引用3点一致・FR-8a/8b 帰属正・責務境界維持。Minor 1件(FakeGateway の consumes 外無引用言及)は conductor が受理前に非固有名詞化で是正しセンサー再 PASSED。

### Findings

- [Minor] reliability-design.md:10 FakeGateway history の consumes 外無引用言及(是正済み: performance-requirements 規定の検証シームへの非固有名詞参照に変更)
