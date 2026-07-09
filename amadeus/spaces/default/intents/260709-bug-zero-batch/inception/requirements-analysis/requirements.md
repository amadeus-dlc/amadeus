# Requirements — bug-zero-batch

> 上流入力: `codekb/claude-engineer-1/`(business-overview.md、architecture.md、code-structure.md — 2026-07-09 差分リフレッシュ、6バグの実在を行番号付きで確認済み)。修正方式は各 Issue の深掘り分析コメント+エージェント間選挙(Q1-Q4、`requirements-analysis-questions.md`)で確定。各バグは起票者以外2名のクロスレビュー CONFIRMED 済み。テスト態勢は org.md の bugfix デフォルト(対象バグへのリグレッションテスト+既存スイートのグリーン維持)に従い、すべての回帰テストは**修正前に赤・修正後に緑**を実測する(落ちる実証)。

## 共通要件(全バグ)

- CR-1: 各修正は対象バグへの回帰テストを伴い、修正前コミットで赤・修正後で緑であることを exit code 付きで実証する
- CR-2: `packages/framework/core/` 配下を触る修正は `bun scripts/package.ts` + `bun run promote:self` を同一コミットに含め、`dist:check` / `promote:self:check` を通す
- CR-3: 検証は `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` の実測 exit code で報告する
- CR-4: 1バグ = 1 Bolt = 1 PR。PR は独立レビュー可能な surgical な差分に保つ

## FR-674: swarm finalize の merge-back 失敗反映(P1)

**修正方式(選挙 Q1=A、全会一致)**: merge-back 失敗時に該当 unit の `results` エントリを `status: "failed"` 系へ更新し、既存の audit 経路に流す。audit taxonomy は変更しない。

受け入れ基準:
- AC-674-1: `finalize` で merge-back が失敗した unit は `SWARM_UNIT_CONVERGED` を emit しない。`SWARM_UNIT_FAILED` + `SWARM_BATON_RETURNED` が emit される
- AC-674-2: `SWARM_COMPLETED` の converged/failed tally は merge 結果を反映する(merge 失敗 unit は converged に数えない)
- AC-674-3: stdout envelope の `merge_failures` フィールドと exit code 2 は互換のため維持する
- AC-674-4: 回帰テストは `tests/e2e/t134-swarm-referee.test.ts` に追加し、実 merge conflict(worktree 側と main 側の add/add または content conflict)で再現する。`hold-merge` fixture は finalize 自身が release-merge を呼ぶため使用しない(深掘り分析の注意点)

## FR-675: reject への human-presence guard 配線(P1)

**修正方式(選挙 Q2=A、5:1)**: `handleApprove` と同じ3段ガード(`isAutonomousMode` → `humanPresenceGuardDisabled` → `humanActedSinceGate`)を共通ヘルパー(例: `assertHumanPresentForGateResolution`)に抽出し、`handleApprove` / `handleReject` の両方から呼ぶ。reject では `validateSlugInState` 後・`Revision Count` mutation 前に呼ぶ。

受け入れ基準:
- AC-675-1: HUMAN_TURN(または #671 の委任行)がゲート開放後に存在しない状態での `reject` は、状態変更(`[R]` 遷移・Revision Count 増加)と `GATE_REJECTED` emit の**前に**明示エラーで拒否される
- AC-675-2: fresh human turn がある場合の reject は従来どおり成功する
- AC-675-3: ガードは presence 判定機構(`humanActedSinceGate` — #671 で委任行も認識する)を参照する共通ヘルパー経由とし、approve 側の挙動は変えない(委任行によるゲート開放が approve/reject 両方で同一判定を通ることをテストで確認)。設計ガイダンス(AC 外): 将来 delegate-rejection(#685)が導入された場合にヘルパーが自動継承する構造を優先する
- AC-675-4: 回帰テストは `tests/unit/t188-human-presence-gate.test.ts` に追加(深掘り分析の fixture 案 A/B: fabricated reject の拒否+fresh turn ありの成功)
- AC-675-5: **対称ギャップの Issue 起票**: agent-team トポロジーで遠隔 conductor の reject が構造的に成立しないギャップ(delegate-rejection の不在)を、本ガード配線の帰結として GitHub Issue に起票する(実装は本 intent のスコープ外)— **起票済み: #685**

## FR-676: bolt start の pre-audit 検証(P2)

**修正方式(選挙 Q3=A、全会一致)**: `start` の全経路(worktree / 非 worktree)で、`emitAudit("BOLT_STARTED", ...)` の前に `readStateFile(pd, flags.intent, flags.space)` による active workflow state の存在検証を必須化する。

受け入れ基準:
- AC-676-1: active workflow state が解決できない workspace での非 worktree `start` は、`BOLT_STARTED` の emit 前に拒否され、bare 監査シャード(`intents/audit/`)が作られない
- AC-676-2: `--worktree` 経路の既存挙動(`failJson("start-worktree", ...)`)は維持。非 worktree は通常 `error(...)` でよい
- AC-676-3: 明示 `--intent`/`--space` セレクタが有効な state に解決する場合は従来どおり成功する
- AC-676-4: 回帰テスト・fixture 更新は `tests/unit/t33.test.ts`: 既存の positive tests は state を seed した project へ更新(バグを固定していたテストの是正)し、state なし project での非 worktree start 拒否を negative test として追加

## FR-677: getJson の JSON parse 例外の Result 化(P2)

**修正方式(深掘り分析で一意収束)**: `getJson()` の `checked.value.json()` を try/catch で包み、パース失敗を `FetchError`(`payloadInvalid`)として `Result.err` で返す。

受け入れ基準:
- AC-677-1: 200 OK + 非 JSON ボディで `getJson()` は throw せず `Result.err` を返し、エラーは `payloadInvalid` に分類される(Issue の再現スクリプトで実測済みの `threw SyntaxError` が解消)
- AC-677-2: 既存の fetch 分類(ネットワーク/HTTP status)の挙動は変えない。`downloadArchive` は対象外(欠陥なしを確認済み)
- AC-677-3: 回帰テストは新規 `tests/unit/setup-http.test.ts`: `globalThis.fetch` を一時差し替えて `new Response('not-json', { status: 200 })` を返し、throw しないこと+`Result.err` を assert(既存 setup-resolver.test.ts は fake Http 注入のため本バグを捕捉できない — 深掘り分析の指摘)

## FR-678: tar extractor の拡張ヘッダのチャンク跨ぎ(P2)

**修正方式(深掘り分析で一意収束)**: 「PAX(`x`/`g`)/GNU longname(`L`)のヘッダブロックを読んだが本体が未着」という pending 状態を extractor の永続状態(carry/pendingLongName/current と同列)として保持し、次チャンク到着時に本体の続きから再開する。

受け入れ基準:
- AC-678-1: PAX 拡張ヘッダの本体+padding が gunzip チャンク境界を跨ぐ valid な tar.gz が正常に展開される(Issue の再現スクリプト — 31 filler で offset 15872 に PAX を配置 — で実測済みの `err malformed tar header` が解消)
- AC-678-2: GNU longname(`L`)の同型パスも同時に修正する
- AC-678-3: 既存の truncated archive 検出(`final` 時の `payloadInvalid`)は維持する
- AC-678-4: 回帰テストは PAX/GNU エントリを作れる fixture helper(`tests/lib/setup-tar-fixture.ts` への追加、または extractor テスト内 local helper)で、チャンク境界を跨ぐ配置を再現する

## FR-668: codekb repo 名の安定導出+既存分裂の統合(P1)

**修正方式(選挙 Q4=A、4:2)**: `codekbRepoName()` の 0-recorded-repos fallback を「git remote(origin)URL 由来の repo slug」に変更し、remote が取れない場合のみ従来の `basename(projectDir)` に落とす。加えて既存の分裂ディレクトリを本 intent で統合する。

受け入れ基準:
- AC-668-1: 単一 repo 未記録 intent + origin remote あり(SSH/HTTPS 両形式)で、`codekbRepoName()` は remote 由来の安定名(例: `amadeus`)を返す。worktree/クローンのディレクトリ名に依存しない
- AC-668-2: remote なし(sandbox/fixture)では従来どおり basename fallback を維持する(旧契約は「常に basename」ではなく「remote がない時のみ basename」として pin し直す)
- AC-668-3: `codekb-path --json` の `repo`/`dir` が安定名を返す
- AC-668-4: 既存分裂ディレクトリの統合: 最新スキャン(`codekb/claude-engineer-1/`、claude-leader 版ベースの差分リフレッシュで包含関係が明確)を正として `codekb/amadeus/` へ統合し、旧ディレクトリ(`installer-distribution/`、`claude-leader/`、`claude-engineer-1/`、および旧 `amadeus/` の stale 内容)は削除する(git 履歴で復元可能)。統合の根拠を PR 説明または成果物に記録し、レビュー基準として「削除対象ディレクトリにあって統合先に無い情報(ファイル・重点スキャン節)が存在しないこと」を PR レビュアーが diff で確認できる形にする
- AC-668-5: 回帰テストは `tests/unit/t182-codekb-placement.test.ts`: (1) 0 recorded repos + origin remote → remote slug(dir leaf は repo 名と異なる名前で seed)、(2) `codekb-path --json` の安定名、(3) remote なし → basename fallback の pin
- AC-668-6: `packages/framework/core/tools/amadeus-lib.ts` の修正は dist / self-install(`.claude/`・`.codex/`)への同期を同一コミットに含める(CR-2 の再掲。lib は複製箇所が多いため明示)

## スコープ外(明示)

- delegate-rejection の実装(AC-675-5 の Issue 起票まで)
- #676 深掘り分析の案 C(audit サブシステム側での bare fallback 拒否)— 別 Issue 判断
- intent birth 時の repos 記録の必須化(#668 深掘り分析の案2)— read 側 fallback 修正で今回の被害は解消するため
