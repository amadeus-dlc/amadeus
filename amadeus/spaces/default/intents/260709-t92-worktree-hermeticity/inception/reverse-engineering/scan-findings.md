# RE スキャン結果 — 260709-t92-worktree-hermeticity (#709)

スキャン方式: 差分リフレッシュ(codekb 観測 `22e3eb5aa` → HEAD `be205cfca`)。#709 に関わる tsc 解決機構はスコープのため差分に関わらず深掘り。

## (a) tsc 解決チェーン (file:line)

生産センサー `packages/framework/core/tools/amadeus-sensor-type-check.ts`(自己インストール `.claude/tools/amadeus-sensor-type-check.ts` と `diff -q` で完全一致 = ドリフトなし):

1. `main()` が `findTsconfig(filePath)` で `--file-path` から上方向に `tsconfig.json` を探索(`amadeus-sensor-type-check.ts:151-161`)。無ければ `no-tsconfig-found` で **exit 1**(`:316-320`)。
2. `resolveTscLauncher(tsconfigDir)` が起点 dir から上方向に `node_modules/.bin/tsc`(win は `tsc.cmd`/`tsc.exe`)を探索(`:182-201`)。見つかれば `{command: <その絶対パス>, shell: .cmd か否か}`、ツリー上端まで無ければ **`{command:"bunx", args:["tsc"]}`** にフォールバック(`:200`)。
3. `probeTscAvailable()` が同一 launcher の `--version` を実行し、非 0 なら **exit 127**(`:210-221`、dispatcher branch b → PASSED Note=tool-unavailable)。probe と本実行で同一 launcher を使う点が #657 の修正核心(`:338-344`)。
4. `runTsc()` が `<launcher> --project <tsconfig> --noEmit --pretty false --incremental --tsBuildInfoFile <...>` を実行(`:223-245`)。
5. `parseTscOutput()` が `PRIMARY_RE = /^(.+?)\((\d+),(\d+)\):\s+error\s+TS\d+:\s+(.+)$/` で診断行のみ抽出(line:col 必須)(`:254-281`)。
6. `filterToFilePath()` で `--file-path` 該当のみに絞り込み(`:286-304`)。

### 現在の worktree に node_modules が無い場合
`resolveTscLauncher` の `existsSync(node_modules/.bin/tsc)`(`:192`)はシンボリックリンク追従で判定するため、リンク先が欠落(未 `bun install`)だと false。上端まで無ければ `bunx tsc`(`:200`)へフォールバックし、グローバルキャッシュの別バージョン TS(観測 7.x)が走る。

## (b) exit-1 と exit-2 の分岐点

ステータスゲート `amadeus-sensor-type-check.ts:368-370`:
```
if (status !== null && status !== 0 && allErrors.length === 0) process.exit(status);
```
- **allErrors 空**(TS18003「No inputs were found」等、line:col を持たず PRIMARY_RE 不一致)かつ tsc 非 0 → tsc の生 exit code をそのまま伝播。この code が TS のバージョン/`--incremental` 有無で **2 か 1 に揺れる**(コメント `:51-58`, `:78-84` に記録)。
- **リポジトリ pinned tsc(typescript ^6, `node_modules/.bin/tsc → ../typescript/bin/tsc` 実在確認済)** → TS18003+`--incremental` で **exit 2** → dispatcher branch e が PASSED `Note=script-error: exit-2`。
- **bunx フォールバック(別 TS)** → 同条件で **exit 1** → `Note=script-error: exit-1`。

これが #709 の非対称性。分岐の根本は「exit code をそのまま流す」設計(`:368`)と「launcher が環境で変わる」(`:182-201`)の組合せ。

## (c) 同じ node_modules 前提を持つテスト

- `tests/integration/t92.test.ts` **test 44**(`:1160-1189`): 唯一 exit code(=2)を厳密ピン。`:1180` の `symlinkSync(REPO_ROOT/node_modules, proj/sub/node_modules)` が **リポジトリの node_modules が install 済である前提**。未 install の worktree ではリンクが壊れ → bunx → exit-1 → `Note` が `script-error: exit-2` を満たさず **失敗**。← #709 の非ヘルメチシティ本体。
- test 45(`:1206-1234`): 同様に temp project だが node_modules シンボリックリンク**なし**。allErrors 非空(other.ts の実型エラー)でゲート不発火のため exit code ドリフトに非依存 → **堅牢**(要修正外)。
- test 12/16(`:557-567`, `:666-668`): 実 tsc round-trip。フィクスチャに node_modules 無し → bunx 解決。pass/fail 件数のみ検証で exit code 非依存 → **堅牢**。
- `tests/unit/t202-sensor-type-check-tsc-launcher.test.ts`: `resolveTscLauncher` の純関数テスト。自前で temp ツリーを組み node_modules を作る/作らない両方を検証(`:37-101`)。リポジトリ node_modules に非依存 → **堅牢**。

grep 上 `tests/` で `node_modules` に触れる他ファイル(t69, gen-coverage-registry, t-test-size-drift, t52/t55 drift, t183, setup-bin-shim 等)は tsc 解決と無関係(パス除外/ドリフト集計用途)。tsc 解決を持つのは t92・t202 のみ。

→ **修正境界の候補**: test 44 単独。install 済 node_modules へのシンボリックリンク前提を、worktree の install 状態に依存しない形(例: install 有無を前提しない skip ガード、または launcher を明示注入して exit code 依存を除去)へ。requirements で確定。

## (d) codekb 更新リスト

- `code-quality-assessment.md`: #709 のテスト・ヘルメチシティ所見を追記(要更新)。
- `reverse-engineering-timestamp.md`: HEAD `be205cfca` へ更新(要更新)。
- 他 7 件(api-documentation, architecture, business-overview, code-structure, component-inventory, dependencies, technology-stack): 本 intent はテスト 1 件のヘルメチシティ修正に限局し、依存・構造・技術スタックは不変のため **更新不要**。
