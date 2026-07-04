# Performance Test Instructions

## 適用判断

本 Intent の要件（requirements.md）に性能 NFR はなく、Test Strategy も Minimal のため、性能テストは実施しない。
修正はエンジンの書き込み値と validator の照合ロジックであり、性能特性を変える変更を含まない（code-generation-plan.md、code-summary.md 参照）。

## 再開条件

将来、validator の照合対象が大規模 record で遅延を示した場合に、別 Intent で性能検証を検討する。
