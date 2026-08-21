# Delivery Planning Questions — 260821-fmc-retirement

Intent: 260821-fmc-retirement / Depth: Standard(予算 最大8問、本ステージは1問で構成)
承認エビデンス: full autonomy grant(grant_id intent-grant-b79b828bb98fb4abcaaf2dd74c1a6a44、2026-08-21T03:22:00Z コミット)。[Answer] は既決裁定の機械適用。

## Q1: Bolt 分割は単一で確定か?

- A) 単一 Bolt(ADR-6 のまま)
- B) docs を第2 Bolt に分離
- X) その他

[Answer]: A — ADR-6(承認済み application-design)の機械適用。B は services.md が「docs 部分除去のみ分離可」と許容線を残すが、分離の必要(規模超過・レビュー不能)が現時点で観測されておらず、必要が生じた場合のみ services.md の許容線内で分割する(その場合も bolt-plan の改訂を経る)。
