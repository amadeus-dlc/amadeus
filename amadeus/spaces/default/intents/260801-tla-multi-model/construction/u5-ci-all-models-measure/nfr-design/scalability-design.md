# Scalability Design — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): scalability-requirements(SC-1〜SC-2), performance-requirements(PR-1 — 時間予算と表裏), security-requirements, reliability-requirements, tech-stack-decisions(現行スタック据え置き・新規技術要素なし), business-logic-model(u5 functional-design §2.2 / §2.3 / §3.4 / §11 — 実行マトリクス・evidence per-model 化・loader 消費・テスト計画)

前 iteration では kind ゲート([service])判定により本書を独立生成せず performance-design §PD-4 へ畳み込んでいたが、engine の produces 要件に従い本 iteration で独立 artifact として具現化する。内容は PD-4 と同一の設計判断であり、矛盾はない(重複記述の主体は本書、PD-4 は本書への相互参照として読むこと)。機構は全て functional-design が指定済みのものの写像であり、新規のスケール機構(並列化・分散・キャッシュ等)は導入しない。

## SCD-1: モデル次元の線形拡張設計(SC-1)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| SC-1(O(N) 線形) | **宣言駆動の反復一般化**(BLM §2.2 / §2.3): 実行量・evidence 量は登録モデル数 N に比例するだけ。実行マトリクスは「モデル外側ループ × warm-up 0 + measured 1-5 の 6 run 内側」の逐次構造で、acceptance.json の runs 配列は `6 × N` のフラット配列、domain validator の長さチェックは `6 × モデル数` へ一般化。モデル追加コストは model-map.json の宣言(models 配列 + vocabulary)のみで CI ツールのコード変更を要しない(`--model` 未指定の既定 = 全登録モデルがそのまま追随)。現在の N = 2(FormalElection / MirrorLifecycle) | t406 AC2(2 モデル = 12 run evidence の生成と verify green)+ ci-model-check-runner 統合テストの長さ一般化ケース(モデル反復順 × run index 順のフラット配列) |
| SC-1(逐次構造の維持) | **並列化禁止**(BLM §2.2、BR-S3): ADR-4 却下案 (b) どおり reservation 機構には非侵襲。線形スケールの成立条件として逐次性を設計不変とする(性能面の時間予算適合は performance-design §PD-1 / §PD-3 と表裏) | runner 統合テストの短絡・順序期待値不変 |

## SCD-2: 計算量の非増大設計(SC-2)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| SC-2(超線形アルゴリズム非導入) | u1 のモジュール依存リゾルバ(行ベース抽出 + 推移閉包、実質線形)は loader 経由で消費するのみ(BLM §1)。u5 側の差分に新たな計算量ホットスポットを導入しない — 新規ループ構造はモデル反復(O(N))のみ | 既存 u1/u2 テスト(維持仕分け)green + code-generation の差分レビュー(モデル反復以外の新規ループなし) |

## N/A 判定(scalability-requirements の段落を踏襲)

- 負荷増大への対応(同時接続数・トラフィック増・水平スケール): **N/A** — CI バッチツールであり、同時実行の概念はジョブ単位(workflow_dispatch の手動起動、並列化禁止は ADR-4 の確定裁定)。負荷は登録モデル数にのみ比例し、SCD-1 でカバー(scalability-requirements N/A 節へ前方参照)。
- データ成長 / 容量計画: **N/A** — evidence は CI artifact として run ごとに揮発し、永続ストレージの成長モデルを持たない(scalability-requirements N/A 節へ前方参照)。
- スケーリングトリガー / オートスケール: **N/A** — 固定 30 分 timeout の CI ジョブ内で完結し、動的スケーリングの対象外(PR-1 参照。時間予算との突き合わせは performance-design §PD-1)。
