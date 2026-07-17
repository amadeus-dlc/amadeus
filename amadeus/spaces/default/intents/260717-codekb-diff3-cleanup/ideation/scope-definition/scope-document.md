# Scope Document — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): `intent-statement.md`、`feasibility-assessment.md`、`constraint-register.md`。

## In Scope — Initiative Outcome

- Issue #1129 の問題・対象者・成功指標・制約を intent record として確定し、Ideation を検証済み状態で park する。
- 修正 commit `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` と対象 CodeKB 2ファイルの clean 状態を trace する。
- park 後に、現在の branch から [record PR #1181](https://github.com/amadeus-dlc/amadeus/pull/1181) で record review を開始する。
- bug Issue-first の既決運用に従い、重複 Issue を作らず、既存 [Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129) へ record link と状態を同期する。
- 人間承認による main 着地後、対象2ファイルで sentinel 0件・最新ヘッダ各1件を再計測し、その後に Issue を close する。

## Current Conductor Boundary

本 conductor の実行範囲は、Ideation 全stage、phase verification、park、各stageの gate-ready commit / push、leaderへの証拠報告までである。record review の作成、既存 Issue への同期、main 取り込み、着地後の Issue close は park 後の leader 執行へ handoff する。

## Out of Scope

- CodeKB 2ファイルへの追加修正。4行削除は修正 commit で完了済みである。
- application code、API、schema、CI、AWS infrastructure の変更。
- 過去の履歴ブロックや per-intent `re-scans` の書き換え。
- `cid:reverse-engineering:diff3-marker-vocab` と同内容の規範・sensorの再設計または重複 persist。
- AI による main merge、着地未確認の Issue close、bug用の重複ミラー Issue 作成。
- Inception / Construction の実行。本件は Ideation record と下流の着地作業で完結する。

## Minimum Viable Scope

最小成立範囲は、(1) review可能な parked intent record、(2)修正 commit と clean 条件のtrace、(3)record reviewと既存Issue同期、(4)人間merge後のmain再計測、(5)実測後close の5点である。どれか1点を欠くと「修正済みbranchをmainへ安全に着地させ、Issueを正しい順序で閉じる」という価値が未完になる。

## Prioritization(MoSCoW)

- **Must**: Ideation成果物とpark、修正commit trace、record review、既存Issue同期、人間merge provenance、着地後の0/1再計測、Issue close。
- **Should**: record review / Issue本文に測定refと責任境界を明示し、cleanな現mainと未着地commitを混同させない。
- **Could**: なし。追加作業は本件の価値に寄与しない。
- **Won't**: 機能実装、AWS変更、重複bug Issue、既決diff3ノルムの再設計、AI merge。

## Value Stream Map

| Step | 入力 | 活動 | 出力 / handoff | Go / No-Go |
|---|---|---|---|---|
| V1 | Issue #1129、修正 commit | Ideation成果物と制約を確定 | parked intent record | phase verification PASS |
| V2 | parked record、pushed branch | record reviewを作成 | 起票者以外2名が独立レビュー可能な変更集合 | record artifacts実在 |
| V3 | review URL、record path | 既存Issueへrecord linkと状態を同期 | Issueから正本recordへ到達可能 | 重複Issueなし |
| V4 | review READY、人間承認 | mainへ着地 | landing state | no-AI-merge provenanceあり |
| V5 | landed main ref | sentinel / headerを全数再計測 | 0/0・1/1の証拠 | 条件不一致ならclose禁止 |
| V6 | post-landing証拠 | Issueをclose | Issue #1129 CLOSED | 着地状態実測済み |

## Acceptance Boundary

initiative 全体の完了は、main 着地状態の実測と対象2ファイルの `0 / 0`・`1 / 1` が揃い、Issue #1129 がその後に close された時点である。本 conductor の完了は、その下流作業を未実施のまま、必要な入力と順序制約を含む verified Ideation record を park した時点である。
