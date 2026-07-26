# Performance Design — U1 visualize-skeleton

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

- U1-PERF-01(実用時間完走)の実現: business-logic-model.md の8ステップ単走査フロー。全 snapshot を一度メモリへ載せ(上限360件×16KB ≈ 5.9MB — scalability-requirements.md の retention 有界性)、描画は文字列連結の一括組み立て。ストリーミング・逐次書き出しは導入しない(tech-stack-decisions.md の依存ゼロ・単純性優先)
- U1-PERF-02(線形性)の実現: コレクタ×キーの二重ループのみ。svgLinePath は点列1パス。中間キャッシュなし
- 検証: 実データ完走の実測1回(integration 実データ sweep — AC-1 と同一テストで兼ねる。reliability-requirements.md U1-REL-03 の冪等性により再実行自由)

## 非対象

- ベンチマーク・プロファイリング基盤(performance-requirements.md 非対象の設計面)
