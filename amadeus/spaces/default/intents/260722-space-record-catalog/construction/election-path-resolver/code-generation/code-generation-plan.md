# Code Generation Plan — U2 election-path-resolver

## 上流入力

`functional-design/`、`nfr-requirements/`、`nfr-design/`、U1 `elections-registry` の実装を入力とする。

## 実装対象

- `scripts/amadeus-election-store.ts`: registry-first resolver と loud legacy fallback
- `scripts/amadeus-election.ts`: 全 reader/create path の resolver 経由化
- `scripts/amadeus-leader-sync.ts`: 絶対パスのみ `electionsRoot()` へ統一し、Git pathspec 用相対定数を温存
- resolver/store/election loop/leader-sync の回帰テスト

## 検証

`bun run typecheck`、`bun run lint:check`、election 関連テスト、`bun run test:ci` を実行する。
