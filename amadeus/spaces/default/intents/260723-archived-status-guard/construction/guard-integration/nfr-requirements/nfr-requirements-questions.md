# NFR Requirements Questions — guard-integration

## Interaction mode

このステージで選択済みの Guided mode を継続する。

## Q1: ガード統合の NFR 計画

FR-05〜FR-07 と NFR-04 を実装可能かつ検証可能にするため、次の一組を採用するか。

- 性能: archived rejection の追加処理を既存 CLI の基準処理との差分 p95 で 100 回測定し、`select`、`next`、`unpark` の各入口で追加遅延を 100 ms 以下、peak RSS 差分を 16 MiB 以下とする。
- セキュリティ: status は preflight recovery 後に strict parse し、拒否時に秘密情報や任意ファイル内容を出力せず、resolved dirName と固定された復旧 command だけを示す。selector、alias、symlink、TOCTOU を境界として fail closed にする。
- スケーラビリティ: 同一 workspace に対する 8 並行 process で lock timeout 約 5 秒の既存契約を維持し、archived 対象への全操作を副作用 0 で拒否する。待機順序は保証せず、試験 fixture 内の starvation は 0 件とする。
- 信頼性: archived + stale cursor、archived + parked、archived + unparked、selector 解決後の消失・状態変化を網羅し、registry、cursor、state、marker、audit の対象 bytes が拒否前後で不変であることを確認する。
- 観測性: 常駐監視、paging、tracing は対象外とし、CLI の typed fatal diagnostic に intent、status、operation、実行可能な unarchive command を含める。
- 技術選定: TypeScript / ESM、Bun、既存 workspace lock・preflight・AST corpus analyzer・既存 CI を再利用し、新規 runtime dependency と迂回 option を追加しない。

- [x] A. この計画を採用する（推奨）
- [ ] B. 性能目標だけ変更する
- [ ] C. セキュリティまたは診断境界だけ変更する
- [ ] D. 並行性・信頼性の検証条件だけ変更する
- [ ] X. その他

[Answer]: A
[Rationale]: 推奨選択として承認
[Respondent]: user
[Timestamp]: 2026-07-23T09:09:19Z
