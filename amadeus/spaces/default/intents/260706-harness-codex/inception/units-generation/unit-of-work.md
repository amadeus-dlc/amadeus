# Unit of Work — 260706-harness-codex（Issue #552 Phase 1）

上流入力: [requirements.md](../requirements-analysis/requirements.md)（FR-1〜FR-6、NFR-1〜3）。

## Unit 一覧

| Unit ID | 名称 | 責務 | 対応 FR | 配備モデル | 規模 |
|---|---|---|---|---|---|
| u001-harness-codex | harness/codex 取り込み | 上流 dist/codex の openai.yaml 群の純正取得・写像・適応取り込み・promote 昇格・harness/codex 2 文書の新設・検出器追従・検証の全体 | FR-1〜FR-6 | 埋め込み（単独デプロイなし。repo 内の契約文書 + 設定ファイル + データ宣言 1 行。実行時配布は既存 installer が knowledge / skills をコピーする経路のまま） | S（設定ファイル群 + 文書 2 件 + 1 行。単一 worktree 直列で完了） |

## 単一 Unit の根拠

- 全 FR が「上流取得 → 写像 → 取り込み → 昇格 → 検証」の直列パイプラインを構成し、途中成果物（写像表）を分割境界にすると provenance の一貫性（NFR-2）が壊れる。
- 変更対象（skills/amadeus-*/agents/、harness/codex/、allowlist.json 1 行）に他 Intent との接触がなく、並行分割の便益がない（engineer3 / engineer1 と非接触確認済み）。
- 規模は設定ファイル群 + 文書 2 件 + データ宣言 1 行であり、単一 worktree 直列で完了できる。

## Unit 境界

- 含む: FR-1〜FR-6 の全作業と検証記録。
- 含まない: scope-document のスコープ外表 5 項目（Phase 2、emit.ts、独自 skill 付与、Codex 実挙動、team.md 変更）。
