# Performance Design — U1 opencode-skeleton

intent: 260715-opencode-cursor-harness / Unit: U1
上流入力: nfr-requirements(performance-requirements.md PR-U1-1/2)、functional-design(business-logic-model.md)。

## 設計

- PR-U1-1(線形増分)の実現機構: 既存 `discoverHarnessNames()` の走査+`buildTree` コピーをそのまま使う — **性能のための新規機構は設計しない**(要件が「既存特性の維持」であるため)。emit は emission table の単純 iterate(エントリ数 2 の O(n))
- PR-U1-2(専用ジョブなし)の実現機構: dist:check の自動編入(open-set の帰結)— CI 設定変更ゼロ

## 検証設計

ビルド時間の退行検知は既存 CI の実行時間観測に委ねる(専用ベンチマーク不設 — 目標値を持たない要件に検証機構を発明しない)。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
