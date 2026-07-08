# Shared Infrastructure — setup-foundation

> ステージ: infrastructure-design (3.4) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../nfr-design/logical-components.md`、U2〜U5 との統合ポイント

## Unit 間で共有されるインフラ面

| 共有物 | 提供元 | 消費者 |
|--------|--------|--------|
| Http ポート実装(タイムアウト焼き込み) | U1 | U2/U3(resolver/fetcher 経由) |
| FsRead/FsWrite/TmpWrite ポート | U1(型)/ cli(配線) | U2 applier(FsWrite)、U3(同) |
| OS 一時領域の清掃機構(SIGINT/SIGTERM) | U1 | 全経路 |
| CI 配線(tsconfig/lint スコープ) | U1(初回 PR) | U2〜U4 のテストすべて |
