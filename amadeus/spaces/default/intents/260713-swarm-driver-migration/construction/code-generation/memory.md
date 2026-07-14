## Interpretations

- 2026-07-14T08:51:16Z — Ultra Codeのexact provider-state surfaceは存在する; Workflow tool resultの`runId` / `transcriptDir`からsnapshotとjournalをroot scanなしで導出し、2 workerのagent IDをSubagent hookと独立に照合できた。

## Deviations

## Tradeoffs

## Open questions

- 2026-07-14T08:51:16Z — Agent Teams用interactive PTY transportをApplication Designから再設計する必要がある; Claude Code 2.1.205はnon-interactive `claude -p`でsession team初期化をskipするため、現行の共通`claude -p` / stream-json契約ではAgent Teamsのprovider-state + hook ANDを構築できない。
