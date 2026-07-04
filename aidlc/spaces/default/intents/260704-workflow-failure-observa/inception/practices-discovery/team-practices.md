# Team Practices

## Way of Working

GitHub Issue と Intent artifacts を接続し、phase gate ごとに validator と検証結果を記録する。
validator pass は成果物構造の検証であり、内容承認や merge 承認として扱わない。
PR の単位、検証結果、例外理由は Intent artifacts または PR 説明から追跡できるようにする。

## Walking Skeleton

最初の Bolt は、#431 engine error audit、#432 hook drop doctor、OpenTelemetry no-op default 計装を束ねた最小縦断 slice とする。
この slice で、失敗の記録、doctor での可視化、計装の非送信既定を同時に確認する。
以降の Bolt は gated に分け、#433、#435、追加の実装範囲を段階的に確認する。

## Testing Posture

実装前に、失敗する eval または deterministic test を追加する。
PR 前に `npm run test:all`、対象 Intent の validator、parity、stdout JSON 契約、OpenTelemetry no-op default 非送信を確認する。
OpenTelemetry の collector、dashboard、外部送信は core 計装の検証対象ではなく、後続 scope の対象とする。

## Deployment

GitHub Actions は `pull_request` と `main` push で `npm run test:all` を実行する。
PR 監視では CI failure を review comment より先に解消する。
collector と dashboard の deploy は今回の必須 gate に含めない。

## Code Style

TypeScript は strict typecheck を通す。
stdout JSON 契約を壊さず、`skills/` 配布境界、`.coderabbit.yml` 非変更、source skill と昇格先 skill の境界、parity lock を守る。
後方互換は、明示的な互換性維持対象がある場合だけ残す。
