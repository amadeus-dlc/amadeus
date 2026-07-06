# dependencies — 260706-rename-lint-fixes

正本は [codekb/amadeus/dependencies.md](../../../../codekb/amadeus/dependencies.md)（更新時刻 2026-07-06T01:53:29Z、対象コミット 33c40271）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

2a0a784b 正本に対し #536/#539/#542 の差分更新を本 Intent で実施。本 artifact への変更内容: 上流依存の基準 commit を fde1e1af（初版）から b67798c3（2.2.0 Adaptive Workflows）へ更新（PR #539）。その他の依存関係（エンジン内部・source skill → 昇格先・method rules → graph・registry docsOnly → workspace_requires ガード・codekb reference-stub → codekb 正準ファイル・board 一方向・インストーラ）は変更なし。
