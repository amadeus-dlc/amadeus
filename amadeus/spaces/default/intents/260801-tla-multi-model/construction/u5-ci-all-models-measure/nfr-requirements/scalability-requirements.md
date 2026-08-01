# Scalability Requirements — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): business-logic-model(u5 functional-design §2.2 / §2.3 — 実行マトリクス・evidence 構造), business-rules(BR-S3), requirements(FR-4 / FR-5, NFR-1〜4)

## 適用要件

### SC-1: モデル次元の線形拡張

- 要件: 登録モデル数 N に対し、実行量・evidence 量は **O(N)** にスケールすること。実行マトリクスは「モデル外側ループ × 6 run 内側」の逐次構造(BLM §2.2、BR-S3 で暗黙の並列化禁止)。acceptance.json の runs 配列は `6 × N` 要素のフラット配列で、domain validator の長さチェックは `6 × モデル数` へ一般化される。
- 現在の N = 2(FormalElection / MirrorLifecycle)。モデル追加のコストは宣言(model-map.json の models 配列 + vocabulary)のみで、CI ツール側のコード変更を要しない設計であること(`--model` 未指定時の既定 = 全登録モデルがそのまま追随)。

### SC-2: リゾルバの計算量(u1 由来、u5 の前提)

- 要件: u1 のモジュール依存リゾルバは行ベース抽出 + 推移閉包で、入力 spec サイズに対し実質線形(閉包はモジュール数の二乗を上限とするが、登録モデル・aux は個位数)。u5 はこのリゾルバを loader 経由で消費するのみで、新たな超線形アルゴリズムを導入しない。

## N/A 判定

- 負荷増大への対応(同時接続数・トラフィック増・水平スケール): **N/A** — CI バッチツールであり、同時実行の概念はジョブ単位(workflow_dispatch の手動起動、並列化禁止は ADR-4 の確定裁定)。負荷は登録モデル数にのみ比例し、SC-1 でカバーされる。
- データ成長 / 容量計画: **N/A** — evidence は CI artifact として run ごとに揮発し、永続ストレージの成長モデルを持たない。
- スケーリングトリガー / オートスケール: **N/A** — 固定 30 分 timeout の CI ジョブ内で完結し、動的スケーリングの対象外(PR-1 参照)。
