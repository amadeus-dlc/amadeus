# Performance Design — U1 resource-core

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — いずれも nfr-requirements SKIP(scope self-feature)により不在(expected)。性能・セキュリティ・スケーラビリティ・信頼性の各要件は requirements.md NFR-1〜4 から、技術スタック前提(Bun/TypeScript/ESM、Biome、tsc --noEmit)は codekb technology-stack.md 260801 現在節から代替導出した。business-logic-model.md(実在)からは buildResource の遅延評価 memo 設計を消費した。

## 遅延評価と1回計測

- `currentResource()` は初回呼出し時に buildResource を1回だけ実行し memo する(business-logic-model.md の遅延評価 memo 設計)。git 照会(vcs.ref.head.*)や env 読取はプロセスあたり最大1回 — 毎 emit の再解決をしない
- vcs 解決は FD 承認済み設計どおり `git rev-parse --abbrev-ref HEAD` / `git rev-parse HEAD` の **subprocess を1回**(business-logic-model.md:8 の契約をそのまま消費 — 機構変更なし)。失敗は両属性とも fail-open 省略(NFR-1)。memo により subprocess はプロセスあたり最大1回に抑まる
- supplier 後着(bootstrap 後の supply)は memo を無効化して次回参照時に再構築する。無効化はフラグ1本(O(1))

## 性能バジェット

- buildResource 1回あたり: git subprocess 最大1回(vcs 2属性、memo 済みなら 0)+ env 読取のみ。service.version は amadeus-version.ts の定数参照でゼロコスト(ファイル読取なし)。目標: 短命プロセスの起動オーバーヘッドに埋没する水準(subprocess 1回 ≈ 数十ms 上限、memo により emit 回数へ非比例)
- 検証は実時間待機でなく呼出し回数 counter の assert で行う(bt-timeout-verification-shape: 同一制御経路の決定的確認を実時間より優先)— buildResource 実行回数が n 回 emit で 1 のままであることをテスト固定

## 非適用(nfr-design:c1)

キャッシュ層・connection pooling・CDN・async 分散は短命 CLI プロセスの library 層に非適用。memo が唯一のキャッシュであり、それ以上の機構は導入しない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T04:10:19Z
- **Iteration:** 2
- **Scope decision:** none

iteration1のCritical2件(vcs機構の無申告逸脱・resourceスロット虚構)とMajor2件・Minor1件を全て是正確認。FD契約準拠・per-record埋め込みの正しい容量前提へ復元。

### Findings

- None
