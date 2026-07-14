## Interpretations

- 2026-07-14T08:51:16Z — Ultra Codeのexact provider-state surfaceは存在する; Workflow tool resultの`runId` / `transcriptDir`からsnapshotとjournalをroot scanなしで導出し、2 workerのagent IDをSubagent hookと独立に照合できた。
- 2026-07-14T12:00:40Z — 承認済みの再設計ではAgent Teamsをinteractive PTY、Ultra Codeをheadless stdio-jsonとし、closed transport／capture lifecycleはU-02 owner moduleが完成させてU-03は消費する。
- 2026-07-14T13:30:00Z — event-bound captureはbinding event streamの完了ではなく、最初の相関済みbindingを監査保存してobserverへ適用した時点でfenceが成立する。

## Deviations

- 2026-07-14T12:00:40Z — orchestratorのCurrent UnitはU-03だがproduction code生成を開始せず、U-02補完PRを先行する; upstream再設計後も既存U-02実装に`pty-interactive`とcapture contractが存在せず、そのままU-03で追加するとUnit境界に違反するため。
- 2026-07-14T13:30:00Z — U-02の元計画は1 Unit = 1 PRだったが、既存U-02 PRのmerge後に発見した追補をreview可能な2つのstacked PRへ分ける。先行PR単体ではU-02完了を主張しない。

## Tradeoffs

- 2026-07-14T12:00:40Z — U-03 PRへgeneric lifecycle修正を同梱する短さより、U-02専用スタックPRによる所有境界とレビュー可能性を選んだ。
- 2026-07-14T13:30:00Z — production supervisorまで1つの巨大差分にせず、closed seamを先に固定してから実I/Oとparent-crash recoveryを積むレビュー容易性を選んだ。

## Open questions

- 2026-07-14T08:51:16Z — Agent Teams用interactive PTY transportをApplication Designから再設計する必要がある; Claude Code 2.1.205はnon-interactive `claude -p`でsession team初期化をskipするため、現行の共通`claude -p` / stream-json契約ではAgent Teamsのprovider-state + hook ANDを構築できない。
- 2026-07-14T12:00:40Z — なし; stale NFR／Code Generation planをmode-specific transportへ修正し、U-02補完をU-03の明示的な前提とした。
- 2026-07-14T13:30:00Z — U-02補完をreview可能な2つのstacked PRへ分ける。先行PRはclosed contract／lifecycle seam、後続PRはproduction supervisor／active parent-crash recoveryを閉じる。後続PRがgreenになるまでU-02完了を主張しない。
