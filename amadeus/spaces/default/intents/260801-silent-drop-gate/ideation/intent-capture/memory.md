# Memory — intent-capture

## Interpretations

## Deviations

## Tradeoffs

## Open questions

- 2026-08-01T23:30:00Z — 起動時に caller-authorization が fail-closed で拒否（`.current-session` 欠落）。session-start hook を手動で1回実行して書き込み、解除。#1922 の再発/変種の可能性があり、要観察
