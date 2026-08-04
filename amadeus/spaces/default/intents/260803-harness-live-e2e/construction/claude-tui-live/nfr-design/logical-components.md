# Logical Components — claude-tui-live

## 上流入力

`business-logic-model.md:7-35`のTUI C5/C6を共通lifecycleへ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-CT-01 | `TuiCapabilityProbe` | Claude/tmux/version/private socket/auth |
| LC-CT-02 | `PrivateTmuxIdentity` | nonce/socket inode/session/server identity |
| LC-CT-03 | `ClaudeTuiSpawnSpec` | project settings、safe argv/env/cwd |
| LC-CT-04 | `TmuxCommandPort` | private `-S` commands only |
| LC-CT-05 | `BoundedPaneCollector` | byte/line limits、digest、sanitization |
| LC-CT-06 | `TuiJourney` | prompt、tool/state/audit/file anchors |
| LC-CT-07 | `TmuxCleanupCoordinator` | session→server→group termination |

## Ownership

C5 owns probe/identity/spec/tmux protocol/pane normalization、C6 owns journey、C4 owns supervisor/process handles/deadline/credential/cleanup ordering。C5はOS handleを所有せずborrowed capture viewだけを読む。

## Failure Domains and Handoff

private socket/sessionがrun failure domain、Claude paneがtransport domain、ledgerがevidence domainである。U02 common assertionsとClaude family settings seamを再利用し、SDK streamやprint JSON componentは共有しない。
