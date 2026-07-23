# NFR Design Questions — status-registry

## Q1: 対話モードと設計方針

Guided mode を継続し、status-registry の NFR 設計を次の構成で確定するか。

- strict parser、限定 transition capability、one-shot migration を別コンポーネントに分ける。
- 既存 atomic writer と workspace lock を再利用し、database、cache、queue、cloud infrastructure は追加しない。
- 10,000-entry fixture の O(n) 処理、100回の child-process benchmark、64 MiB RSS budget を既存 CI に実装する。
- migration は対象 status token span だけを置換し、commit 前の全件 strict parse と byte-preservation 検査、commit 後の read-back を行う。
- malformed registry、symlink、巨大診断値、target欠落・重複、write/fsync/rename failure を failure domain として隔離する。
- core を正本とし、6 harness と self-install は生成・drift guard で同期する。

- [x] A. Guided mode と上記設計を採用する（推奨）
- [ ] B. 対話モードだけ変更する
- [ ] C. component boundary を変更する
- [ ] D. 性能・信頼性パターンを変更する
- [ ] X. その他

[Answer]: A
[Rationale]: 推奨選択として承認
[Respondent]: user
[Timestamp]: 2026-07-23T09:20:07Z
