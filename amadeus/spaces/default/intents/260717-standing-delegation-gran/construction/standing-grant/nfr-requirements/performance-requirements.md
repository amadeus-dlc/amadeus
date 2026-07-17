# Performance Requirements — standing-grant(U1)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`(純関数構成・エラー処理方針)、`../functional-design/business-rules.md`(R-1〜R-8)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、codekb `technology-stack.md`(Bun/TS/Biome — 本日 RE 現況)

## 要件

- P-1: 受理検証は決定的入力(シャード readFileSync+parse+現在時刻)のみで、1ゲート解決あたりのシャード走査は「全 intent の audit ディレクトリ1周」を上限とする(intent 数十×シャード数個の grep 規模 — ADR-1 Consequences の実測見立て)。強制メカニズム = 既存テストランナー予算(専用ベンチ・SLO は持たない — timeout は個別実行の停止 guard であり service SLO でない: observability-setup:c3)
- P-2: グラント不在時の追加コストは humanActedSinceGate false 経路での1回の走査のみ(従来 pass 経路は走査ゼロ — 挿入位置 ADR-7 が保証)

## 検証対応

C-6 テストがランナー予算内で完走すること(build-and-test の実測表へ)。
