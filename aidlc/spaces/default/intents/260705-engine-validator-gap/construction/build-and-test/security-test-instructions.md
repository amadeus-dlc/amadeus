# Security Test Instructions

## 適用判断

本 Intent の要求（requirements.md）にセキュリティ NFR はなく、Test Strategy も Minimal のため、セキュリティテストは実施しない。
修正はローカル record への path 文字列の組み立て（code-generation-plan.md Step 3）と validator の照合条件（同 Step 5）であり、外部入力、認証、権限、ネットワーク境界に触れない（code-summary.md 参照）。
devsecops 観点の確認として、`memory_path` は record 内の相対 path のみを組み立てており、外部由来の値を path に混入させる経路がないことを diff で確認した。

## 再開条件

エンジンが外部入力（リモート registry、ネットワーク経由の payload）を扱う変更が入った場合に、別 Intent で脅威分析とセキュリティ検証を検討する。
