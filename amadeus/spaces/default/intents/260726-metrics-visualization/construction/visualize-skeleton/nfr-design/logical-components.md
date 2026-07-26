# Logical Components — U1 visualize-skeleton

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## NFR 実現機構の所在マップ

| NFR | 実現コンポーネント(application-design ID) | 機構 |
|---|---|---|
| U1-PERF-01/02(performance-requirements.md) | V-1 main / V-3 renderHtml | 単走査・一括組み立て(business-logic-model.md 8ステップ) |
| U1-SEC-01(security-requirements.md) | V-3 + T-1 | http 非出現 grep テスト |
| U1-SEC-02 | V-6 escapeHtml | 埋め込み集約ヘルパ |
| U1-SEC-03 / U1-REL-03 | V-1(ルート解決の分離) | env 値をデータへ流さない+決定的ソート |
| U1-SCALE-01/02(scalability-requirements.md) | V-1 / R-1(discoverCollectors, unionValueKeys) | 有界全量+データ駆動 |
| U1-REL-01/02(reliability-requirements.md) | V-1(検証→描画→書込の順序) | zero-write+error 全件 stderr |
| U1-REL-04 | R-1 | export 追加のみ(tech-stack-decisions.md の既存テストランナーで検証) |
| U1-SCALE-03 | V-1 main(stdout 正常系出力) | 生成バイト数の記録(scalability-design.md、FD ステップ8) |

## 層の整合

- すべて scripts/ ローカル層に閉じる(packages/framework 非接触 — tech-stack-decisions.md)。NFR 実現のための新規モジュール・新規レイヤは発生しない
