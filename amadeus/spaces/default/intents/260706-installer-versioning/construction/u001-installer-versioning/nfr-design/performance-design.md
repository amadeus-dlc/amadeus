# Performance Design — u001-installer-versioning（260706-installer-versioning）

上流入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)

PERF-1（SLO なし）に対する設計上の配慮は 2 点のみとし、計測機構は作らない（Right-Sizing）。

1. ハッシュは書き込み内容（メモリ上の Buffer）から計算し、書き込み後の再読込をしない（1 ファイル 1 read + 1 write + 1 hash）。
2. 導入先現状の読み込みは current が存在する場合の一致 / 不一致判定に必要なときだけ行う。存在しないファイルは stat 失敗で早期に restored / created へ分岐。例外: settings.json（AD-6）は merge 計算のための既存 read があるため実質 2 read になる（1 個の小ファイルのみで許容）。
