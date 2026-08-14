# Build and Test Summary — 260814-t99-copytree-race

上流入力: `code-generation-plan.md` / `code-summary.md`(consume 2 面)。

## 生成した指示書

| Artifact | 内容 |
|---|---|
| build-instructions.md | bun install / build、env 前提 |
| unit-test-instructions.md | real 呼出サイト回帰(t27/t80)、FR 対応 |
| integration-test-instructions.md | 患部直接検証 12/12・t99 17/17・フルスイート |
| performance-test-instructions.md | N/A 判定(適用 NFR なし、根拠と覆す条件) |
| security-test-instructions.md | N/A 判定(同上) |
| build-test-results.md | 実測(Red 9/2 → Green 12/0、フルスイート PASS、NFR-1 直接実測) |

## Verdict(検証面と未検証面の書き分け)

- **検証済み**: FR-1〜FR-7 / NFR-1〜3(code-summary + build-test-results の実測表)、ローカルフルスイート PASS(coverage gate 込み)、落ちる実証×2(md5 残渣ゼロ)
- **未検証(本ステージ時点)**: PR #3015 head dc6d5fed6 の必須リモート CI green(pr-convergence ステージで実測して収束させる)。受け入れ基準の内側であり pr-convergence の収束確認で閉じる
