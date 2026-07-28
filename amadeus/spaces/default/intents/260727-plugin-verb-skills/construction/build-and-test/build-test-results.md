# Build & Test Results — 260727-plugin-verb-skills(2026-07-28 実測、再接地後 HEAD)

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(U1〜U4 の各 code-generation 成果物 — 実装対応と検証エビデンスの正本)

## 実測結果(conductor 直接実行、exit code 転記)

| 検証 | 結果 |
|---|---|
| bun run typecheck | exit 0 |
| bun run lint | exit 0 |
| bun run dist:check | exit 0 |
| bun run promote:self:check | exit 0 |
| runner-gen check | exit 0(in sync、29 runners) |
| plugin 系テスト 7ファイル(t344/t345/t350〜354/t341) | 52 pass / 0 fail |
| bash tests/run-tests.sh --ci | exit 0 — 626 files / 0 failed files / 0 failed assertions |

## PR 別エビデンス(着地済み)

- #1611: patch 12/12 covered、CI green(2回目 — 初回は allowlist 行ピン無音転位の stale 検出 → 同 PR 是正)
- #1616: patch 95/95、CI green
- #1618: patch 18/18、stock バイト不変の機械実証、CI green
- #1624: patch 7/7、落ちる実証(マーカー注入 → t354 赤 → 復元 green)、CI green
