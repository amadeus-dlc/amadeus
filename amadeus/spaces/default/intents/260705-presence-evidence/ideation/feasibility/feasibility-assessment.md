# 実現可能性評価 — Presence Evidence（260705-presence-evidence）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[build-vs-buy.md](../market-research/build-vs-buy.md)

## 論点 c: presence ledger の再利用可否 — 可能

相関検査は `humanActedSinceGate`（amadeus-lib.ts:1470）と同じ機構（readAllAuditShards + auditBlockField による Event/Timestamp 抽出と時系列整列）で実装できる。新規概念・新規ストレージは不要。

## 論点 a: Cursor presence hook 不発火との整合 — 手動 mint 前提なら整合

Cursor では presence hook が発火しない（project.md Corrections）。多体運用では中継承認受信直後の手動 mint が規律化済みであり、相関検査はこの規律の内側で成立する。単独セッションの Cursor 利用者は手動 mint を知らなければ宣言が拒否される（環境差の運用コスト）。

## 実測で発見した制約（本ステージの主要発見）

本 Intent 自身の audit shard の時系列（実測）:

```text
23:24:58 DECISION_RECORDED (state-init)   ← ディスパッチ承認転記。先行 HUMAN_TURN なし
23:27:05 HUMAN_TURN                        ← 最初の mint は intent-capture の中継承認受信時
23:27:15 DECISION_RECORDED (intent-capture) / HUMAN_TURN（同秒）
23:28:18 DECISION_RECORDED / GATE_APPROVED / HUMAN_TURN（同秒・順序は記録順）
```

1. **候補 1 は現行運用の最頻 evidence を拒否する**: docs-only 宣言の evidence として最も使われるのはディスパッチ承認転記（state-init 宛 DECISION_RECORDED）だが、mint 規律（#497 確定判断 8）は中継承認定型文の受信時だけを対象とし、ディスパッチ受信時の mint を含まない。したがって新 Intent の shard には転記時点で HUMAN_TURN が存在せず、「decision の前に HUMAN_TURN」を要求する相関は必ず fail する。解消には mint 規律の拡張（ディスパッチ受信時も mint = #497 判断 8 の変更 = 契約級）が別途必要になる。
2. **同秒ティアで厳密順序が壊れる**: mint → decision → gate が同一秒に収まる実例が既にあり、Timestamp 順の厳密な「前後」判定は不安定。相関は秒窓（例: decision の Timestamp ± N 秒に HUMAN_TURN が存在）にせざるを得ず、意味論が緩む。

## 論点 b: 候補 2 と承認転記運用の衝突 — 実例で確認

本 Intent 自身が「state-init 宛 DECISION_RECORDED を承認の記録とする」現行運用の実例である。候補 2（GATE_APPROVED 限定）では、この転記を evidence にできず、docs-only 宣言は最初の gate 承認後まで不可能になる。さらに GATE_APPROVED は「その stage の成果物の承認」であり「docs-only であることの承認」ではないため、意味論の適合も候補 1 より悪い。

## 結論

3 候補とも技術的には実現可能。ただし候補 1 は「単独では成立せず、mint 規律の拡張（契約級）とのセット採用が必要」+「同秒ティアによる秒窓化で意味論が緩む」という実測制約を持つ。この事実を採否判断（人間個別確認）の入力とする。
