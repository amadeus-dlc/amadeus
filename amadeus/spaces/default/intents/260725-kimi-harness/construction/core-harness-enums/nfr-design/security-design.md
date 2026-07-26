上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Security Design — core-harness-enums

> 上流入力の使用箇所: security-requirements.md の3基準(読むだけ・probe は advisory・固定引数)を設計の対象とする。

## 対象の概要

security-requirements.md のとおり、doctor arm は書き込みを行わない。

## 設計

- **読み取りのみ**: config の参照は存在・マーカー検出までとし、内容の表示・変更を行わない(security-requirements.md §脅威モデルと基準)
- **probe**: advisory とし、ユーザーの実セッションに影響する操作を含めない
- **spawn**: `kimi --version` は固定引数の配列で起動し、シェル経由の文字列結合を使わない(security-requirements.md §脅威モデルと基準)
