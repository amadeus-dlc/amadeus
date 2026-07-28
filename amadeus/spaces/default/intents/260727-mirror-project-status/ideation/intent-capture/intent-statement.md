# Intent Statement — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。入力は GitHub Issue #1560 とユーザーとの Grill me 対話)

## Problem Statement(解決する業務課題)

Intent Mirror は Intent record を正本として lifecycle 進捗を GitHub Issue 本文へ一方向投影しているが、Mirror Issue が GitHub Project に所属していても Project 側の `Status` フィールドは同期されない。その結果、Issue 本文は自動で最新化される一方、Project ボード上の Status だけが手動更新として残り、ボードの表示が Intent の実状態から乖離する。

投影するのは Intent の**作業進行状態ではなく AI-DLC lifecycle フェーズ**である: `IDEATION`→`Ideation`、`INCEPTION`→`Inception`、`CONSTRUCTION`→`Construction`、`OPERATION`→`Operation`、Intent `Completed` 時のみ終端 `Done`、`parked` は現在 Status 維持。`Backlog / In Progress / Review` のような一般的な作業ボード状態への写像は行わない(2026-07-27 ユーザー訂正、Issue #1560 本文も同時改訂)。

さらに **Project への item 追加も Amadeus が行う**(2026-07-27 仕様変更 B): GitHub 側の auto-add workflow には依存せず(ユーザーが無効化)、mirror create チェーン内で設定済み対象 Project へ mirror Issue を追加し、現在フェーズの Status(`Ideation`)まで即設定する。追加は冪等(既所属ならスキップ)。Project からの削除・アーカイブは引き続き行わない。

出典: GitHub Issue #1560(https://github.com/amadeus-dlc/amadeus/issues/1560、2026-07-27 改訂版)。

## Target Customer(誰がどう恩恵を受けるか)

Intent Mirror を有効にし、GitHub Projects ボードで複数 intent の進捗を俯瞰する運用者(Q1 裁定)。

- **一次ユーザー(当面)**: 本リポジトリのソロ運用者自身。
- **将来ユーザー**: Amadeus 配布先のチーム利用者(mirror capability は配布 framework runtime に含まれるため)。

恩恵: Project ボードを開くだけで各 intent の実状態が反映済みであり、手動 Status 更新の作業と更新漏れによる誤読が消える。

## Success Metrics(成功指標)

主軸は**収束性**とする(Q2 裁定):

- Mirror 対象 intent のライフサイクル節目(create / sync / close)の後、所属し権限のあるすべての GitHub Project の Status が**手動編集ゼロ**で期待値に収束している(drift 0)。

支持条件(主軸を成立させる前提であり、独立指標としては従属):

- **安全性**: completion 時、対象 Project の Status 同期が `Done` へ完了するまで Mirror Issue を close しない。Status 選択肢を解決できない構成エラーは `safety-blocked` として close へ進まない。
- **診断可能性**: read-only の `repair status` が Project Status drift・権限不足・部分成功を検出できる。

## Initiative Trigger(なぜ今か)

Intent Mirror が直近の intent 群(mirror-productization、mirror-auto-modes、mirror-state-split 等)で実運用段階に入り、Issue 本文の同期は自動化された一方、GitHub Projects ボード上の Status 更新だけが手動作業として残った運用ギャップの解消(Q4 裁定)。市場圧力や規制ではなく、自プロダクトの運用完成度向上が動機。

## Initial Scope Signal(初期スコープシグナル)

- **スコープ**: `amadeus-feature`(Amadeus 自体の新機能。project.md § Scope Overrides 準拠)。
- **境界**: Issue #1560 の受入条件**全体**(2026-07-27 改訂版で17項目)を本 intent で扱い、段階分割しない(Q3 裁定)。部分実装(同期だけで診断なし等)は close 阻止・部分成功の扱いが宙に浮き、分割点が不自然なため。
- **非対象**(Issue の非対象欄を境界とする。2026-07-27 仕様変更 B で「Project への自動追加」は非対象から撤回し In Scope 化): 一般的な作業進行状態(Backlog/In Progress/Review)の同期、Project からの削除/アーカイブ、GitHub Actions・daemon・polling、PR/release/deploy の Status 管理、双方向同期。
- **Construction 上の含意**: 最初の Bolt は walking skeleton(org.md 準拠)。
