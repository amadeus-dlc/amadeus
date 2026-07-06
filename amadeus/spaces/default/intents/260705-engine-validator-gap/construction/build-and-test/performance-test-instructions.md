# Performance Test Instructions

## 適用判断

本 Intent の要求（requirements.md）に性能 NFR はなく、Test Strategy も Minimal のため、性能テストは実施しない。
修正は advance の stdout JSON の path 組み立て（code-generation-plan.md Step 3）と validator の checkbox 照合条件（同 Step 5）であり、性能特性を変える変更を含まない（code-summary.md 参照）。

## 再開条件

将来、validator の照合対象が大規模 record で遅延を示した場合に、別 Intent で性能検証を検討する。
