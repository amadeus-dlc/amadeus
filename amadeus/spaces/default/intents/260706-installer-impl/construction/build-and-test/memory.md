# Build and Test — Memory

## Interpretations

- 2026-07-07T15:00:47Z — Standard test strategy のため performance/security 専用手順書は生成せず、U7 CI gate と unit test で間接カバーと判断した。

## Deviations

- 2026-07-07T15:00:47Z — stage produces リストに `performance-test-instructions.md` / `security-test-instructions.md` があるが、Standard strategy では unit + integration のみ生成（stage-protocol §8 に従う）。

## Tradeoffs

- 2026-07-07T15:00:47Z — フル suite を 1 コマンドで実行し、個別 unit の並列 CI shard 分割は ci-pipeline ステージに委譲した。

## Open questions

- （なし — gate 承認可能）
