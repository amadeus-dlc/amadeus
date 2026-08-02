# Scalability Design — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): scalability-requirements(非適用の根拠), performance-requirements, security-requirements, reliability-requirements, tech-stack-decisions, business-logic-model(§2 配給経路)

## 非適用の根拠(scalability-requirements からの引き継ぎ)

負荷・同時実行・容量計画の対象となる実行形態を持たない。本 Unit の対象は単発プロセスの CLI/CI 検証ツールであり、登録モデル数は現行 2(FormalElection / MirrorLifecycle)、第3モデル登録は requirements.md の Out of scope 明記どおり扱わない。語彙サイズもモデルあたり十数要素に留まり、選択・解決の計算量はモデル数・語彙サイズに対し線形(PERF-1 / PERF-2)で、スケーリング戦略(水平分散・キャッシュ・分割)を要する次元に達しない。したがって負荷予測・スケーリングトリガ・同時実行目標・データ分割・オートスケーリング規則は設計しない。

## 構造的な将来耐性(設計事実の記録 — 要件ではない)

- 語彙の源が model-map.json の `vocabulary` フィールドに一元化されるため、モデル追加時の語彙供給は map 宣言の追加のみで完結しコード変更を要しない(business-logic-model §0 配給経路)。これは scalability 設計ではなく ADR-5/ADR-6 の設計効果である。
- モデル数 m に対する選択コストは `selectVerifiedModel` の O(m) 名前検索のみ(PERF-2)。m が増えても線形を超える経路は本設計に存在しない。
- リゾルバ推移閉包の計算量境界は u1 のスコープ(リゾルバは u1 所有)、CI 全モデル反復時間は u5 のスコープ。u3 はいずれにも性能上の新規制約を課さない(→ 各 Unit の nfr-design へフォワード)。
