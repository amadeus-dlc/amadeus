# Requirements Analysis Questions

## Q1. solo modeで複数の有効なstanding grantが同じ失効時刻を持つ場合、route時にどのgrantを選択しますか？

現行のteam modeは失効時刻が最も遅いgrantを選びますが、同時刻の場合の完全な優先順位は契約化されていません。team modeの挙動を変えず、solo modeだけに決定的な完全順序を定めます。

- A. 失効時刻が遅い順、同値なら発行監査時刻が新しい順、さらに同値ならGrant Idの辞書順昇順（推奨。現行の第一優先条件を維持し、常に1件へ決定できる）
- B. 失効時刻が遅い順、同値なら発行監査時刻が古い順、さらに同値ならGrant Idの辞書順昇順（先に発行したgrantを優先する）
- C. 失効時刻が同じ最上位grantが複数あれば自動承認せずhuman gateへフォールバックする（最も保守的だが、有効grantがある場合も自動承認しない）
- X. Other (please specify)

[Answer]: A（E-1466-RA-Q1 user ruling 2026-07-25T05:20:42Z）— 失効時刻が遅い順、同値なら発行監査時刻が新しい順、さらに同値ならGrant Idの辞書順昇順。solo modeだけに適用し、team modeの既存探索順序は変更しない。（**Mode:** chat）

## 設計へ送る未決事項

Grant Id carrier の具体的な型、exact-ID lookup の配置、typed fallback directive の形は要求ではなく方式選択であるため、Application Design の比較対象とする。
