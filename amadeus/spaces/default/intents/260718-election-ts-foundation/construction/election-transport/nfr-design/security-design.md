# Security Design — election-transport(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## blind 性の型設計(中核)

security-requirements.md の構造保証を次で実現する:

- `ShortNotification` 型は electionId+配布ビューパス参照のみのフィールド構成(business-logic-model.md — BR-T1 のキー全数 assert が消費者)。質問文・選択肢・推奨・先行票のフィールドを型宣言に持たない(parse-don't-validate の対偶 — 持てない型で送る)
- `DeliveryDirective` も同水準の blind(票・集計情報のフィールドなし)。配信 payload の生成関数は ShortNotification のみを入力に取り、Election 全体を受けない(過剰情報への到達経路を関数シグネチャで遮断)

## コマンド境界の設計

- send.sh 呼び出しは Bun.spawnSync の**配列引数**(シェル非経由 — security-requirements.md の実装時実測要件を設計で固定: sh -c を使わない)。env: process.env 明示(business-logic-model.md BR-T3)。性能面の spawn 1回/voter(performance-requirements.md)・単一プロセス実行(scalability-requirements.md)・send-failed の fail-closed(reliability-requirements.md)と同一フローの各面。実装は tech-stack-decisions.md の spawn 選定に従う
