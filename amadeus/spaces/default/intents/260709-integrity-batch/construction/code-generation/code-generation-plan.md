# Code Generation Plan — integrity-batch

## 方針

units-generation は bugfix スコープで SKIP(consumes_absent expected: true)のため、Bolt = バグ単位(4件独立)で編成する。team.md 並行実装ノルム(cid:requirements-analysis:parallel-bolts)に従い、worktree 隔離のサブエージェント fan-out で並列実装する。walking-skeleton は bugfix スコープにつきセレモニーなし(org.md、stance: scope-dependent を報告済み)。

## Bolt 編成

| Bolt | Issue | ブランチ | worktree | 実行 |
|---|---|---|---|---|
| B1 | #708 P1 mint-presence 偽陽性 | bolt/708-mint-presence | 後発(実機キャプチャ待ち) | FR-1 |
| B2 | #707 P2 codekb 並行リフレッシュ | bolt/707-codekb-refresh | 並列実行中 | FR-2 |
| B3 | #705 P2 calibration 管理外+doctor drift | bolt/705-sdk-drive-calibration | 並列実行中 | FR-3 |
| B4 | #706 P3 knowledge 参照 | bolt/706-knowledge-reference | 並列実行中 | FR-4 |

ベース: origin/main `0ba5aaaf2`(Add Codecov coverage gate #687)。各 Bolt は独立ブランチ→個別 PR→スカッシュマージ(main 直行)。PR 作成時に codex メンバーへ直接レビュー依頼、マージは人間承認後に leader 執行。

## B1(#708)の段取り — FR-1.2 実機キャプチャ先行

1. conductor 本線ツリーの live フック `amadeus-mint-presence.ts` に**未コミットの一時キャプチャ**を挿入済み(stdin ペイロードを scratchpad へ dump、スモーク済み)。
2. 次以降のターン開始注入(monitor task-notification / 人間プロンプト)で実ペイロードを採取し、機械注入と人間タイプの判別可能性を確定する。
3. 判別材料あり → FR-1.1/1.2/1.4 の実装 Bolt をディスパッチ。判別材料なし → FR-1.3(harness 制約の文書化 + delegate provenance 正道の明文化)に切り替え。
4. キャプチャ用の一時編集は Bolt ディスパッチ前に revert(コミットに混入させない)。
5. 編集順合意(claude-3、2026-07-09): mint-presence.ts は本 intent 専有。amadeus-state.ts / amadeus-lib.ts の presence 関数群は最小変更、シグネチャ/意味変更は PR 時に差分直送。

## 隔離規律(cid:code-generation:c2 準拠)

- 各ディスパッチプロンプトに conductor 本線ツリーのパスを書かない(worktree 内相対パスのみ)
- 割当 worktree 以外での git 操作禁止を毎回明示
- push は conductor が差分検分+検証再実行後に行う(evidence-discipline 準拠)

## 検証基準(全 Bolt 共通)

- 赤先行の落ちる実証(修正前に失敗を実測、exit code 記録)
- `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`(該当プロファイル)
- core/harness 編集時は package.ts + promote:self を同一コミットに含める(Mandated)
- 後方互換シム・検証劇場の禁止(Forbidden)
