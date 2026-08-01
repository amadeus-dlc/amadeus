# Services — otel-meta-schema

上流入力(consumes 全数): requirements.md、architecture.md(codekb 260801 現在節)、component-inventory.md(同)— サービス境界の不在(常駐なし・store は既存 JSONL・Relay の merge 経路 relay.ts:298-312)は architecture.md 現在節の実測、store 一覧は component-inventory.md 現在節に依拠する。

## 方針

本 intent は常駐サービスを導入しない(CLI/hook プロセスの範囲)。

## サービス相当の境界(3つ)

1. **resource 供給サービス面**(ADR-2 supplier registry)— hooks(SessionStart/SessionEnd)がプロセス内 API として供給。ネットワーク境界なし
2. **telemetry store 面** — 既存の `<record>/.amadeus-otel/` JSONL store(spans-/metrics-/buffer-)へ additive。新 store なし
3. **OTLP Relay** — 無改変(resource は span record 経由で既存 merge 経路 relay.ts:298-312 に自然合流。logs/metrics の resource 搬送は Relay 側改修が必要になった時点で #1868 改訂を経る — 本 intent は store 面まで)

## 適用規範

CLI/ライブラリの NFR 設計に常駐サービス向け機構(cache/scaling/circuit breaker)を持ち込まない(nfr-design:c1 準拠)。
