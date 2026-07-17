# Scalability Requirements — U1 opencode-skeleton

intent: `260715-opencode-cursor-harness` / Unit: U1
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(NFR チェックリスト「規模増」)、application-design の components.md。

## 要件

- SC-U1-1: ハーネス数 4→5(本 Unit 時点)の増加に対し、package.ts の走査・ビルドは件数線形で上限機構なし(requirements NFR チェックリストの実測済み)— 新規のスケーラビリティ機構は不要かつ導入しない
- SC-U1-2: dist リポジトリサイズ増は既存ハーネス実績(各 5-8MB 級)の範囲 — 実測値を code-summary に記録(将来のサイズ監視の基準点)

## N/A(反証可能根拠付き)

- 負荷スケーリング(同時利用者・スループット): **N/A** — 配布物は静的で、実行は利用者ローカルの bun プロセス(サーバ資源なし)
