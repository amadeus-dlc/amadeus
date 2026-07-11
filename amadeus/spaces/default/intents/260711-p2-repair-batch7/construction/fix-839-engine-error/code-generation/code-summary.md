# code-summary — fix-839-engine-error(Issue #839)

## 概要

エンジン(`amadeus-orchestrate.ts`)の2つのエラー出口 — (a) error directive の発行、(b) トップレベル catch による未捕捉例外 — が監査証跡 `ERROR_LOGGED` を残さなかった欠陥を修正した。他の全ツール(utility/state/bolt/worktree、lib の `emitError`)には `ERROR_LOGGED` 契約が実在し、エンジンだけが emit⇔terminal の非対称(PM1-6 類型)になっていた。由来は restart-loss — archive `460f56ba0`(Issue #431)の修正が 2026-07-06 の repo restart で新系譜へ移植されず喪失した。

## 変更

### 正本: `packages/framework/core/tools/amadeus-orchestrate.ts`

1. **`recordEngineError(message: string): void`(新設・export)** — best-effort の `ERROR_LOGGED` 追記。
   - `--project-dir` を `process.argv` から独自抽出(main の flag parse の前/外、例えば top-level catch からも呼べる)。
   - `resolveProjectDir(flag)` で解決し、`existsSync(stateFilePath(pd))` が false(state 不在=pre-init)なら no-op。
   - `require("./amadeus-audit.ts")` の遅延ロードで lib の `emitError` と同じ循環回避様式。
   - `appendAuditEntry("ERROR_LOGGED", {Tool, Command, Error}, pd)` を追記。
   - 記録失敗は `catch {}` で swallow(エンジン自身の失敗を隠さず・増幅しない)。`_engineErrorInProgress` 再入ガードは `emitError` の `_errorEmitInProgress` を踏襲。
2. **配線 (a): `emit()` の `kind === "error"` 分岐** — JSON 出力の**前**に `recordEngineError(directive.message)` を呼ぶ。error directive の発行箇所は 30 超あるため、`emit()` 単一箇所への集約で計装漏れを構造的に防ぐ(archive の設計判断を踏襲)。stdout の directive JSON・exit code は不変。
3. **配線 (b): トップレベル catch** — `recordEngineError(errorMessage(e))` を既存の `console.error` + `process.exit(1)` の**前**に追加。
4. **`runEngineMain()`(新設・export)** — 従来 `if (import.meta.main) { try { main() } catch {...} }` とインラインだった try/catch を関数へ抽出し、shim は `if (import.meta.main) runEngineMain()` の薄い呼び出しにした。これは兄弟ツール(`amadeus-utility.ts` の `if (import.meta.main) main()`)の薄 shim イディオムに揃える意味と、後述の catch を in-process で被覆可能にする意味の両方を持つ。

### テスト

- `tests/integration/t214-engine-error-logged.test.ts`(mechanism=cli/spawn) — 両エラー出口の end-to-end 配線を実 dist ツールの spawn で実証。directive JSON・exit code の不変も固定。`env: { ...process.env, CLAUDE_PROJECT_DIR }` を明示(spawn-blindspot 規律)。
- `tests/unit/t214-engine-error-logged-seam.test.ts`(mechanism=none/in-process) — `recordEngineError` 本体・`emit()` error 分岐(`handleNext` 経由)・トップレベル catch(`runEngineMain` + `process.exit` スタブ経由)を in-process 駆動し lcov を被覆(seam-export-handler-amend)。
- `tests/.coverage-registry.json` を再生成(audit:ERROR_LOGGED の coveredBy に2ファイル追記、FRESHNESS green)。

### dist 同期

`bun scripts/package.ts` + `bun run promote:self` を同一コミットに含める(dist:check / promote:self:check green)。

## 設計確定事項の根拠(E-B7-Q0)

lib の `emitError` は返り値 `never`(state があれば必ず `process.exit`、無ければ throw)である。error directive の emit 分岐は directive JSON を stdout に出して**exit しない**(exit code は非エラーのまま conductor が directive を処理する)経路のため、`emitError` は型上・意味上ともに使用不能。したがって「exit しない best-effort 記録関数」= `recordEngineError` の移植が機構的に一意の選択肢である。archive `460f56ba0` が同じ結論に到達していた設計を踏襲した。

## RED → GREEN 実測

修正前(dist 未再生成=旧バイト)に t214 integration を実行 → ERROR_LOGGED を主張する3アサーションが fail、directive/exit の不変を主張する2アサーションは pass(不変性が修正前後で保たれることの対照)。dist 再生成後 → 全 pass。

閉包実測(scratch + `CLAUDE_PROJECT_DIR` 明示、#839 の症状を verbatim 再適用):
- grep: `recordEngineError|ERROR_LOGGED` が orchestrate 内で 7 ヒット(起票時 0)。
- (a) `next --scope zzznotascope` → directive JSON 不変・exit 0 不変・ERROR_LOGGED が新規に1件記録。
- (b) 不正 `AMADEUS_STAGE_GRAPH` → stderr メッセージ・exit 1 不変・ERROR_LOGGED が新規に記録(累計2件)。

## 同根棚卸し(修正はスコープ外)

エンジン内の `process.exit(1)` を伴う terminal error 出口を全数 grep(`amadeus-orchestrate.ts` に3箇所):

| 箇所 | 内容 | ERROR_LOGGED 配線 | 判定 |
|---|---|---|---|
| `emit()` :157-162 | malformed directive 拒否ガード | 非配線 | エンジン固有の防御ガード(validateDirective がエンジン自身の構築した directive を拒否=内部配線バグ、実運用では到達しない stdout 前ガード)。兄弟に同型なし。記録のみ、本 Bolt 修正外。 |
| `main()` default case :2973 | Unknown subcommand → `console.error` + `process.exit(1)` | 非配線 | **同根の真の非対称**。兄弟(例: `amadeus-state.ts` :343 default)は同じ unknown-subcommand を `error()` → `emitError` 経由で `ERROR_LOGGED` 記録する。エンジンだけ非記録で、#839 と同じ emit⇔terminal 非対称クラス。ただし本 Bolt のスコープは (a)(b) の2配線に限定(逸脱回避)。→ 別 Issue 化を推奨。 |
| top-level catch :2990 | 未捕捉例外 | **配線済み(本 Bolt)** | — |

`:2973` は #839 と同型の残存非対称のため、フォローアップ Issue 化を leader へ推奨する(本 Bolt では未修正)。

## 検証(全 exit code = 0、特記なき限り)

- `bun run typecheck` = 0
- `bun run lint` = 0
- `bun run dist:check` = 0
- `bun run promote:self:check` = 0
- `bun tests/complexity-gate.ts --check` = 0(新設 `recordEngineError`/`runEngineMain` は CCN 表示下限=11 未満、baseline 無変更。`emit()` は CCN 2→3 で閾値15を大きく下回る)
- `bun tests/gen-coverage-registry.ts --check` = 0(再生成後)
- t214 unit+integration = 10 pass / 0 fail
- 関連スイート(t-batch3-orchestrate-seam / t114 / t116 / t127 / t120 / t137 / t47 / t179)= 104 pass / 0 fail
- local lcov: 追加ソース行(:172-173, :190-228 の `recordEngineError` 本体, :2990)は seam テストの in-process 実行で全て被覆済み(DA:0 の追加行なし)。core と dist は当該関数群で行番号一致のため codecov の dist→core remap も整合。

## 非交差(兄弟 PR)

対象範囲(:170 近傍の `emit()`、:190 新設、:2974 近傍の shim)は #867(:1640-1737/:2687-2708)・#875(:1254 guard 1行)のいずれとも非交差。
