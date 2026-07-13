# Incident Runbooks

## Context

`dashboards.md`、`alarms.md`、`reliability-design.md`、`security-design.md`、`deployment-architecture.md`が定義する実在境界はGitHub Actionsとrepository snapshotのみ。

## Red job

1. Run logからcollector/writer/git分類を特定する。
2. NFF上限・rebase conflict・認証は再生成せず原因を修正する。
3. collector/schema defectはtest/code修正と誤snapshot revertを同一PRにする。
4. 一時入力異常のみ単独revert PRを許容する。

## Safety

Force push、履歴rewrite、権限緩和、secret追加、外部resource操作を行わない。revert conflict時は停止する。
