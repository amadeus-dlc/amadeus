# Performance Design — fix-1172-skip-denominator(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(P-1 の実現)

performance-requirements.md P-1 のとおり、行ループ内へ正規表現テスト1回(`/ — SKIP\s*$/`)を追加するのみ(business-logic-model の疑似コード位置 = `[S]` 除外の直後・total++ の前)。新規 I/O・関数呼び出しなし。

## 保証機構

- 計算量は行数線形のまま(既存ループ構造不変)— diff 検分で担保
