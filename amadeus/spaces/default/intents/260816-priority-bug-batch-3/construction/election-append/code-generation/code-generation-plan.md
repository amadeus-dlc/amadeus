# Code Generation Plan — unit election-append(Bolt 5 / FR-5 / #3046)

方式 = decisions.md ADR-5(voter スコープ採番 + 複合一意 + 辞書式順序、選挙 2-0)。本計画は ADR-5 実装契約 1-6 の機械的射影。テスト戦略 = Comprehensive。TDD 必須。

トレーサビリティ: 全ステップ → FR-5(#3046)。

- [x] Step 1: Red — 異なる voter 2名の実プロセス並行 append(バリア同期)で readAllPending が `err("corrupt")` を返すことを統合テストで Red 実測(クロスレビュー r1 の driver 構成を雛形に。scratch store、env 隔離シーム使用)
- [x] Step 2: 採番の voter スコープ化 — `appendPending`(amadeus-election-store.ts:1063)の全体 max+1 を `readPendingVoter`(:1057-1061)結果からの voter ローカル max+1 へ置換。readAllPending を採番に使う経路を残さない(明示テストで pin — ADR-5 契約1)
- [x] Step 3: 一意性検査の複合キー化 — `readAllPending`(:545-547)を (voter, arrivalSequence) 複合一意へ。同一 voter ファイル内の重複は corrupt のまま(fail-closed 強度維持 — ADR-5 契約2)
- [x] Step 4: 全体順序の1定義集約 — (arrivalSequence, voter) 辞書式の比較関数を1箇所へ置き、readAllPending の sort(:548)と全消費点(mergePendingEvents :634-654 / materialize 系)で共有。voter ローカル単調性の厳密保存を明示 assert(ADR-5 契約2-3)
- [x] Step 5: D-09 設計コメント(:16-19)を新不変条件(voter 単位採番・voter 間独立・ロック不要)へ同一変更で書換(ADR-5 契約3)
- [x] Step 6: 同一 voter の並行二重投稿 = last-write-wins(store 非破壊)の明文化 + テスト(ADR-5 契約4)
- [x] Step 7: property テスト(fast-check、固定 seed・低 numRuns)— (i) voter ローカル単調 (ii) (voter, seq) 一意 (iii) 到着順非依存の順序決定性(同一入力集合 → 同一順序列)(ADR-5 契約6)
- [x] Step 8: 既存テスト追従 — t549 / t235 / t373 の前後 green(互換シム・移行コードは追加しない — 旧データが読めなくなるのは許容済み)
- [x] Step 9: 台帳 resync — 新規テストファイルの coverage-registry regen。`bun run build` + typecheck / lint / 対象テスト green。フルスイートは push 後 CI

除外(スコープ外): 選挙 CLI(amadeus-election.ts)側の変更(呼出契約不変)。並行 voter の実運用化(将来 intent)。
