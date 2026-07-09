# u701-package-check-orphan コード生成サマリ

対象バグ: GitHub #701 / FR-701
ブランチ: `fix/701-package-check-root-orphan`(`origin/main` から分岐)

## 変更内容(file:line)

### 1. リグレッションテスト(先行作成・赤先行)
- 新規: `tests/integration/t-package-check-root-orphan.test.ts`(+96 行)
  - (a) `dist/kiro/STALE_ROOT_FILE.md`(ルート直下)を植え込み → `bun scripts/package.ts kiro --check` が exit≠0、かつ出力に `ORPHAN in dist: kiro/STALE_ROOT_FILE.md` を含むことを検証。
  - (b) `dist/kiro/stale-subdir/nested.md`(未宣言サブディレクトリ配下)を植え込み → 同様に検出されることを検証。
  - (c) クリーンツリー → `--check` が exit 0、出力に `[kiro] --check: OK` を含む(偽陽性なし)。
  - 植え込みファイルは各テストの `try/finally` と `afterEach` バックストップで必ず除去し、失敗時もツリーを汚さない。`env: { ...process.env }` を渡し、`bun test <file>` 単独実行でもハーメティックに緑になる。
  - `tests/integration/t145-packaging-parity.test.ts` は無改修。

### 2. 修正本体
- `scripts/package.ts` の `checkHarness()`(`--check` パスのみ、+21 / -11 行)
  - 従来の orphan(committed→built)走査は (a) harness dir サブツリー(:575-582)と (b) ハードコードされた `[".agents","amadeus"]` サブツリー(旧 :611-618)に限られ、projectRoot 出力は built→committed 片方向 diff のみ(:586-592)だった。このため `dist/<name>/` 直下・未宣言サブディレクトリに居座る stale ファイル(削除・改名された旧 projectRoot 出力など)がどの走査にも乗らず `--check` を通過していた。
  - 旧 `[".agents","amadeus"]` ループを **`dist/<name>/` 全域走査**に置換。期待集合 = harness dir サブツリー(上流の自前 orphan パスが担当のため除外)+ 宣言済み projectRoot 出力(`m.harnessFiles` の `projectRoot` + `m.onboarding.projectRoot`)+ emit 済み集合(`committedEmitSet`: emit 出力 + 再配置された method ツリー)。期待集合に属さない committed ファイルを `ORPHAN in dist: <name>/<rel>` として報告し exit 1。
  - harness サブツリー判定は既存 import 済みの `sep` を用いた前置詞一致(`m.harnessDir + sep`)。projectRoot dst は `relative(committedDistRoot, join(committedDistRoot, dst))` で OS セパレータ正規化。
  - 新走査は旧 `[".agents","amadeus"]` 走査の厳密な上位集合であり、既存の orphan 検出挙動を保持したまま被覆域を拡張(surgical、buildTree/emit 不変)。
  - 注: `scripts/package.ts` はビルドスクリプトであり dist ツリーの一部ではないため、この修正に伴う dist 再生成は不要(`dist:check` / `promote:self:check` は緑を維持)。

## 赤先行エビデンス(red-first)

### 修正前(unfixed code、test 単独実行)
```
bun test tests/integration/t-package-check-root-orphan.test.ts  → rc=1
 1 pass 2 fail
(a): package kiro --check output: [kiro] --check: OK  → expect(status).not.toBe(0) 失敗(受領 0)
(b): package kiro --check output: [kiro] --check: OK  → expect(status).not.toBe(0) 失敗(受領 0)
(c): pass
```
テストは先に単独コミット(`b53a6ac58`)し、未修正コードに対して赤を実測。

### 修正後
```
bun test tests/integration/t-package-check-root-orphan.test.ts  → rc=0
 3 pass 0 fail
```

## 検証コマンドの exit code

| コマンド | exit code |
|---|---|
| `bun test tests/integration/t-package-check-root-orphan.test.ts`(修正前) | 1(赤: (a)(b) 赤 / (c) 緑) |
| `bun test tests/integration/t-package-check-root-orphan.test.ts`(修正後) | 0 |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun test tests/integration/t145-packaging-parity.test.ts` | 0 |
| `bun scripts/package.ts --check`(全 harness、クリーンツリー) | 0 |
| `bash tests/run-tests.sh --ci`(全スイート) | 1(下記の既存赤 t92 のみ、本変更と無関係) |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |

## 全スイート rc=1 の内訳(本変更と無関係の既存赤)

`bash tests/run-tests.sh --ci` の唯一の失敗は `tests/integration/t92.test.ts` の1アサーション:

```
(fail) t92 Group N: type-check status gate (config-load failure)
 > 44: tsc non-zero + zero parseable diagnostics -> Note=script-error: exit-2 (not false PASS)
 Expected: "script-error: exit-2"   Received: "script-error: exit-1"
```

- 内容は `tsc` の終了コード意味論(exit-2 期待 vs exit-1 受領)に関するゲートで、TypeScript バージョン/環境依存。`scripts/package.ts` の orphan 検出とは無関係であり、t92 は本修正が触れたコードを一切 import しない。
- **ベースライン確認済み**: `origin/main` を素の使い捨て worktree にチェックアウトして `t92` 単独実行しても同一アサーションで赤(exit-2 期待 vs exit-1 受領、44 pass / 1 fail)。すなわち本変更投入前から赤い既存の失敗。
- team.md テスティング方針に従い、リスク・環境依存性の高い tsc ゲートを本 PR スコープ(u701)に取り込まず、**別課題としてトリアージ/Issue 起票を要フラグ**として conductor/leader へ報告する(本 PR では修正しない)。

## 変更ファイルと行数

| ファイル | 変更 |
|---|---|
| `tests/integration/t-package-check-root-orphan.test.ts` | 新規 +96 |
| `scripts/package.ts` | +21 / -11(`checkHarness` の `--check` パスのみ) |
