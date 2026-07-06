# Build vs Buy 判断 — Presence Evidence（260705-presence-evidence）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 判断

**Build（既存 ledger 述語の再利用または文書化）** とする。

| 選択肢 | 評価 | 判断 |
|---|---|---|
| 外部の署名・認証基盤の導入 | ローカル CLI エンジンに対して過剰。オフライン前提とも不整合 | 却下 |
| 新規 presence 概念の発明 | #497 確定判断 8 の意味論と競合し契約級の混乱を生む | 却下 |
| **既存資産の内側で解決（採用）** | 候補 1 = humanActedSinceGate と同じ shard 読取の再利用、候補 3 = 既存文書への設計境界追記。いずれも既存概念の内側 | 採用 |

## 自作範囲

候補採否（人間個別確認）の結果により、(a) verifyDocsOnlyEvidence への相関検査追加 + eval、または (b) 設計境界の文書化、のいずれかに限定する。
