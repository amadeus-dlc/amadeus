> **起票済み(2026-07-09、ユーザー承認)**: https://github.com/amadeus-dlc/amadeus/issues/656

# 起票待ち GitHub Issue(権限拒否により保留 — 2026-07-09)

**Title**: setup: Installation.detect evidence gap makes LegacyLayout condition (b) unreachable and misclassifies anchor-less legacy layouts as partial (BR-U07 gap)

**Body 要旨**:
- Bolt 3 で発見、レビュアーがコード読解で両方とも真と確認(コミット 360e919a4)
- (1) LegacyLayout 条件(b)は実経路から到達不能(manual-or-unknown は両アンカー真のみ、evidence.paths に緩い amadeus-* が入らない)
- (2)「manifest 残置の partial」は到達不能(manifest 可読なら無条件 manifested、ディスク実在照合なし)
- **実害(BR-U07)**: アンカーなしの真に非対応な旧レイアウトが partial に分類され、--force で partial-forced として進行してしまう(BR-U07 の意図は無条件 hard-refuse)
- 是正は U2 凍結の installation.ts の evidence 収集拡張が必要 — Bolt 3 スコープ外、独立スライス/intent 判断が必要
