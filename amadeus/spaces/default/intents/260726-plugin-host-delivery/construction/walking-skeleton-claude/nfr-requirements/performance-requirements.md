# 性能要件 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## no-op 高速路(自動 compose の起動レイテンシ非退行)

business-logic-model のフロー 2(自動 compose)は、claude SessionStart hook から `compose --if-stale` を起動し、composition record が最新のときは apply 段へ不到達で早期 return する経路である。business-rules の BR-U2-3(no-op 高速路)がこれを固定する。requirements の NFR-2(起動レイテンシ非退行)/ FR-3c-no-op に対応する、本 Unit の中心的性能要件である。

- 合否(到達不発の構造検証): composition record が最新の状態での自動 compose 経路が合成適用処理(applyPluginPlan)へ到達せず早期 return することを、到達カウンタまたは書込不発生の assert でテスト固定する(requirements FR-3c-no-op 合否)。この構造検証は数値予算に依存せず成立する
- 合否(冪等): 同一プラグイン集合で compose を 2 回実行した後の host bytes・composition record が 1 回実行後と byte-identical で、fragment が重複挿入されない(BR-U2-2 / FR-3c-冪等)

## 数値予算の扱い(build-and-test で実測固定)

business-logic-model のフロー 2 は no-op 経路の目標を「数百 ms」と付記するが、これは目安であり **受け入れ基準に用いない**。business-rules の BR-U2-3 と requirements NFR-2 のとおり、セッション起動レイテンシの数値予算は build-and-test の実測で固定する(推定値を基準化しない)。

- 推定(算出根拠なし・目安): no-op 経路は composition record のハッシュ照合と早期 return のみで、ファイル書込・再コンパイルを伴わない。ただし具体的な ms 予算は未実測につき、build-and-test の実測で確定する
- 合否: NFR-2 の数値予算は build-and-test の実測値で固定し、本 Unit では「no-op 経路が apply へ不到達」という構造的性質の合否のみを固定する

## 手動床の性能(N/A)

business-logic-model のフロー 1(手動 compose)は利用者が明示起動する一度きりの操作であり、繰り返しのホットパスではない。したがって手動 compose の実行時間には性能予算を設けない(N/A)。technology-stack のとおり常駐 service を持たないため、cache / スループット拡張などの常駐向けパターンは機械適用しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:53:20Z
- **Iteration:** 1
- **Scope decision:** none

BR-U2-1〜10 逐語一致・consumes 実参照・数値先送り適正。Minor 1(NFR-1 再掲の 2 項目脱落)は指摘直後に合否文へ追記是正済み。

### Findings

- [Minor] security-requirements の NFR-1 再掲 2 項目脱落 — 追記是正済み
