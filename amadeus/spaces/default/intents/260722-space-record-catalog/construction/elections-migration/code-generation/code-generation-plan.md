# Code Generation Plan — U3 elections-migration

## 実装範囲

1. `scripts/amadeus-election-migrate.ts` に dry-run 既定の移行計画器を追加する。
2. createdAt を timeline 最古、git 初回コミット、dry-run 時刻の順で導出し、MigrationPlan 全値へ固定する。
3. `--execute` の full clone、S2 着地、open/collecting 不在、撤去 Issue、ユーザー承認、approved-plan SHA-256 束縛を fail-closed で検査する。
4. 単体テストで計画合成と全前提拒否分岐、結合テストで実 FS dry-run とハッシュ不一致時の無変更を検証する。

## 非対象

- 既存選挙ディレクトリの本番 rename
- 本番 `elections.json` の生成
- `execution-approval.md` の生成

本番 `--execute` は leader 経由のユーザー個別承認後に限るため、本 Bolt では実行しない。

## 成功条件

- dry-run が全選挙を列挙し、rename map、衝突件数、degraded 件数、plan ハッシュを出力する。
- plan は election.json の electionId を identity とし、既存 registry 行を尊重する。
- execute 前提のいずれか一つ、または plan ハッシュが不一致なら適用前に拒否する。
- 対象テスト、typecheck、lint が成功する。
