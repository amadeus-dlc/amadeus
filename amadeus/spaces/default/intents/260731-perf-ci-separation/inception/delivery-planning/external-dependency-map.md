# External Dependency Map — 260731-perf-ci-separation

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md

## 外部依存

| 依存 | 利用 Bolt | 性質 | リスク・注記 |
|---|---|---|---|
| GitHub Actions schedule トリガー | Bolt 2 | 新規利用(repo 初 — requirements.md FR-2a 注) | 発火遅延は仕様(混雑時)。60日無活動 suspend(R-3、docs 注記) |
| GitHub-hosted runner(ubuntu) | Bolt 1/2 | 既存 | 機種不均質は前提 A-1 — perf は非 blocking のため合否に波及しない |
| bun 1.3.13 / oven-sh/setup-bun@v2 | 全 Bolt | 既存ピン | 変更なし |
| actions/checkout@v4, upload-artifact@v4 | Bolt 2 | 既存 | ci.yml と同版を使用 |
| branch protection ruleset 18843917 | Bolt 3 | 読み取りのみ | required check は「CI Success」のみ(gh api 実測)— 変更不要・変更しない |

## 非依存(明示)

- 新規 GitHub App / secrets / token: 不要(components.md C-3 の意図的相違 — 既定 GITHUB_TOKEN)
- 外部 SaaS(Codecov 等): 本 intent の変更面では新規依存なし(coverage gate はローカル/CI 内完結)
- npm 新規パッケージ: なし(Forbidden 準拠)
