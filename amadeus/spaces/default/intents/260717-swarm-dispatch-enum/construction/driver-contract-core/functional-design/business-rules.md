# Business Rules — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## ルール(検証可能形)

- BR-1(三値閉包): `DriverName` の値集合は `subagent`/`claude-ultra`/`codex-ultra` のみ。旧 `ultracode` は型・`DRIVER_VALUES`・`--degraded-from` 検証・エラーメッセージ文字列から全撤去(受け入れ = repo 全域 grep 0。dist は U3 で追随)
- BR-2(fail-closed 前置): rejected は dispatch・worktree 作成・spawn・`SWARM_STARTED` のいずれよりも前(受け入れ = rejected ケースで audit シャードに SWARM_ 行が増えない・`git status` 差分ゼロ・worktree 一覧不変)
- BR-3(degrade の一致): degraded の requested 値は raw そのまま(写像なし)。利用者向け表示(C3〜C5 prose)と `SWARM_DEGRADED` の Requested driver は同一値(受け入れ = t134 系 fixture で audit 行と CLI 出力の同値検査)
- BR-4(emit 非重複): resolve は emit しない。`SWARM_DEGRADED` の唯一の emit 経路は prepare `--degraded-from`(既存 :402-407)— resolve 導入で経路を増やさない(受け入れ = resolve 実行前後で audit 行数不変)
- BR-5(Fallback 固定): `emitSwarmDegraded` の Fallback driver は `"subagent"` 固定(:291 維持 — ADR-3)。Requested driver のみ三値化
- BR-6(referee 不変): prepare/check/finalize の引数・出力・exit code 契約は driver 語彙の値域以外変更しない(受け入れ = t134/t135/t207/t211 green、diff は語彙行に限定)
- BR-7(エラー様式): rejected のエラーメッセージは許可値の列挙を含む(既存 `--degraded-from must be one of: ...` と同型の `DRIVER_VALUES.join(", ")` 由来 — 新しいマジック文字列を作らない)。文言の最終形は実装時に既存 idiom へ揃え、テストは許可値 3 語の包含で検証(文言 verbatim 固定はしない — 脆いテストの回避)
- BR-8(seam 設計): `resolveDriver`・`DRIVER_VALUES`・型は export し、テストは in-process で駆動(bun-coverage-spawn-blindspot 回避)。resolve の CLI 配線行も handler export(seam-export-handler-amend)で patch gate 対象を被覆する
