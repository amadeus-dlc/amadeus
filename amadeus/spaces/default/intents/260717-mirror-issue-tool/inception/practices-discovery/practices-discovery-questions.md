# Practices Discovery — Questions(260717-mirror-issue-tool)

モード: Guide me

## 上流入力

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md(codekb — 証跡スキャンは同日 RE の diff-refresh を代用、practices-discovery:c1)

E-OC1 証跡: ソロモード — ユーザーの AskUserQuestion 直答(実 HUMAN_TURN)による裁定であり選挙不要。ユーザー承認タイムスタンプ: Q1 2026-07-17T13:44:57Z(AskUserQuestion 直答)

## Q1. 外部 CLI(gh)への新規依存の扱い

RE 実測により gh CLI 呼び出しは repo 初導入(前例なし)。project.md Forbidden「配布フレームワークへ runtime dependency を追加しない(文書化なしに)」との関係を整理する必要がある。

A. scripts/ ローカルツール限定の依存として許容 — gh は配布フレームワーク(packages/framework、dist)には持ち込まず、scripts/ の開発支援ツールに限る。未認証・不在時は loud エラー(exit 1)。この境界を discovered-rules.md に明文化
B. gh 依存自体を避ける(GitHub REST API を直叩き)— トークン管理を自前実装することになり複雑化
X. Other (please specify)

[Answer]: A(gh は scripts/ 限定の依存として許容。配布フレームワークへ持ち込まない境界を明文化、未認証・不在は loud エラー)— 2026-07-17T13:44:57Z, Mode: guided
