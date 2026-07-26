# Logical Components — U2 visualize-hardening

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## NFR 実現機構の所在マップ

| NFR | 実現コンポーネント | 機構 |
|---|---|---|
| U2-PERF-01/02(performance-requirements.md) | V-5 regressionClass / V-1 main | 最新2点比較・同一生成パス+バイト比較(business-logic-model.md 増分1/2) |
| U2-SEC-01/02/03(security-requirements.md) | V-3/V-5(静的定数)・C-1(最小ステップ)・D-1 | 注入面非拡大・権限不変・記載制約 |
| U2-SCALE-01/02(scalability-requirements.md) | V-7 MAX_HTML_BYTES / V-5 判定表 | 導出式定数・固定列挙+default 非強調 |
| U2-REL-01〜04(reliability-requirements.md) | V-7・V-1(--check 分岐)・C-1 | fail-closed・3値契約・loud-fail・着地2実測 |
| U2-PERF-03 | C-1+Bolt 2 検証記録 | CI 実測秒と timeout 枠比の記録(performance-design.md、固定閾値なし) |

## 層の整合

- U1 と同じく scripts/ ローカル層+ci.yml+docs のみ(tech-stack-decisions.md)。新レイヤ・新モジュールなし(metrics-visualize.ts への増分と1 CI ステップ)
