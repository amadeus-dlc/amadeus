# Build and Test Summary — 260814-copytree-guard-boundary

上流入力: `code-generation-plan.md` / `code-summary.md`(consume 2 面)。

## 生成した指示書

| Artifact | 内容 |
|---|---|
| build-instructions.md | bun install/build、dist 前提 |
| unit-test-instructions.md | unit 回帰(t80)、FR 対応 |
| integration-test-instructions.md | 経路 4/4・患部 12/12・消費 12/12・フルスイート |
| performance-test-instructions.md | N/A 判定(根拠と覆す条件) |
| security-test-instructions.md | N/A 判定(同上) |
| build-test-results.md | 実測(Red→Green、pred-a2、exists、フルスイート PASS、CI green) |

## Verdict(検証面と未検証面の書き分け)

- **検証済み**: FR-1〜FR-7 / NFR-1〜2(実測表)、ローカルフルスイート PASS、PR #3030 の CI 全 green(現 head)
- **未検証(本ステージ時点)**: 最終 record checkpoint push 後の head での CI green(pr-convergence の収束確認で閉じる — 受け入れ基準の内側)
