# Scalability Design — U2-mirror-skill

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SCD-U2-1: manifest駆動のハーネス追加(SC-U2-1)

SKILL本文はハーネス名を列挙せず、正本1ファイルをcoreDirs manifestが投影する。ハーネス追加時の変更点をmanifestへ限定し、SKILLの条件分岐を増やさない。

## SCD-U2-2: findingと案内の1対1写像(SC-U2-2)

Step 2は`mirror-missing`、`stale-status-line`、`issue-drifted`の静的な案内表とする。verb追加時は表の1行を追加し、ネストしたハーネス別分岐や動的ディスパッチを導入しない。`stale-status-line`はdetailを解析せず、常にsync/closeの両候補を提示する。

## 容量の扱い

SKILLは単一Markdownで状態を保持しないため、水平スケール、キャッシュ、キュー、データ分割は適用外である。
