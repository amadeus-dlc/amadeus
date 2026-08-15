# Build & Test Results — intent 260814-open-bug-batch-6

> 実測のみ。5 unit は park 前に個別 PR で着地済み(いずれも merge queue 経由・必須 CI green)。

| 検査 | 結果 | ref |
|---|---|---|
| Bolt PR 着地 | #3080 / #3081 / #3086 / #3089 / #3092 すべて MERGED | park 前実測(record checkpoint #3100 に記録) |
| 現 main 断面 | CI green(#3105 の merge group で全必須 check 通過) | main `b9615ffb8` |
| typecheck | exit 0 | resume 断面(record-ckpt branch = main + record)、2026-08-15 実測 |
| lint | exit 0(既存警告 466 のみ) | 同上 |
| producer-outcome-pending の解消 | `next` が build-and-test directive を返却(修正 #3105 の前向き settle 5 行・冪等再入で 5 行のまま・pool イベント 0) | 本 record audit 実測 2026-08-15T11:21Z |
