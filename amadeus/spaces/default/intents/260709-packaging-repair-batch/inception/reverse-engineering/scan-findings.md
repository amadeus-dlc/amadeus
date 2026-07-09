# Reverse Engineering スキャン結果 — 260709-packaging-repair-batch

- 手法: diff-refresh(project.md 修正 cid:reverse-engineering:c1)
- ベースライン codekb: `amadeus/spaces/default/codekb/amadeus/`(観測コミット `a1c79dc12`)
- 現 HEAD: `22e3eb5aa`
- 対象スコープ: bugfix(パッケージング/リリース同期の2件のバグ = Issue #701 / #702)
- 注記: 本パスはスキャンのみ。合成は別途 Architect パスが実施する。

---

## 1. 差分サマリ(領域別)

`git diff --name-status a1c79dc12..HEAD` は 227 ファイル(A44 / D18 / M165)。大半は `amadeus/spaces/default/intents/`(工程記録)と `dist/`(再生成物)。codekb 観測面に効く実質差分は以下。

| 領域 | 変更 | codekb への影響 |
|---|---|---|
| `packages/framework/core/tools/` | `amadeus-audit.ts` `amadeus-bolt.ts` `amadeus-lib.ts` `amadeus-sensor-type-check.ts` `amadeus-state.ts` `amadeus-swarm.ts`(全 M) | architecture / component-inventory 更新要 |
| `packages/setup/src/` | `domain/installation.ts` `internal/tar-archive-extractor.ts` `ports/http.ts`(M) | component-inventory / code-structure 軽微更新 |
| `tests/`(48 unit + 10 integration + 3 lib + 2 e2e) | PR #703 hermeticity 修正、テストサイズドリフトガード、新規テスト群 | code-structure(テスト層目録)/ code-quality 更新要 |
| `docs/` | glossary(ja/en)、04-stages/inception(ja/en)、12-state-machine(ja/en) | 参照のみ、codekb 影響小 |
| `.github/workflows/release.yml` + `packages/setup/.release-it.json` | リリース配線(#702 の起動経路) | api-documentation(リリース契約)更新要 |
| `dist/{claude,codex,kiro,kiro-ide}/` | 上記 core 変更の再生成反映 | 生成物、codekb 直接記載なし |

新規テスト(A): `tests/lib/test-size.ts`, `tests/unit/setup-http.test.ts`, `tests/unit/t-test-size-drift.test.ts`, `tests/unit/t112-delegated-approval.test.ts`, `tests/unit/t202-hook-project-dir-worktree-marker.test.ts`, `tests/unit/t202-sensor-type-check-tsc-launcher.test.ts`。

---

## 2. フォーカス領域の詳細(file:line 付き)

### 2.1 `scripts/package.ts` — Issue #701(dist ルート直下の stale ファイルが --check をすり抜ける)

出力レイアウト(buildTree):
- projectRoot な harness ファイルは `outRoot`(= `dist/<name>/<dst>`、harness dir の**隣**)へ書く: `scripts/package.ts:356-363`(`harnessFiles` ループ、`outPath = projectRoot ? join(outRoot, dst) : join(treeRoot, dst)`)。
- onboarding も同様に projectRoot なら dist ルートへ: `scripts/package.ts:370-376`。
- メモリツリー(`amadeus/spaces/default/memory/`)と active-space カーソルも harness dir 外へ emit し、絶対パスを `outsideHarness` として返す: `emitMemory` 呼び出し `:383`、`emitActiveSpace` `:388`。

clean-sweep 範囲(writeHarness): harness dir(`treeRoot`)`:538` と workspace-root の `dist/<name>/amadeus/` `:542-543` の2つだけを掃く。**dist ルート直下(`dist/<name>/` の非 `amadeus/`・非 harness-dir ファイル)は sweep 対象外**: `scripts/package.ts:521-549`。

--check の3スキャン(checkHarness `:554-624`):
1. harness 内 built→committed(MISSING/DIFFERS): `:564-573`。
2. harness 内 committed→built orphan: `:575-582`(walk 対象は `committed = dist/<name>/<harnessDir>/` のみ、`:556`)。
3. projectRoot ファイルの明示 diff: `:586-592`。**built→committed 方向(MISSING/DIFFERS)のみで、committed→built の orphan 検査が無い**。
4. harness 外 emit ファイルの diff: `:595-604`(`committedEmitSet` に登録)。
5. harness 外 orphan スキャン: `:611-618`。**walk する subtree が `[".agents", "amadeus"]` のハードコード2件のみ**(`:611`)。

**バグの核心**: dist ルート直下(`dist/<name>/`)に居座る stale ファイルで、(a) `<harnessDir>/` 配下でない、(b) `.agents/` / `amadeus/` 配下でない、(c) 現行 manifest が宣言する projectRoot 出力でない — の3条件を満たすものは、上記どのスキャンにも当たらず --check を通過する。典型: manifest から削除/改名された projectRoot ファイル(旧 `AGENTS.md` / `CLAUDE.md` / onboarding 等)の旧コピーが `dist/<name>/` に残っても検出されない。orphan スキャンのルート集合 `:611` が dist ルート平坦面を含んでいないことが原因。

### 2.2 `scripts/release-version-sync.ts` — Issue #702(prerelease バッジが前進できない)

- version 受理正規表現 `:22`: `/^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/` — **prerelease サフィックスを受理する**(例 `1.2.3-rc.1`)。
- patchFile 適用順: (1) `amadeus-version.ts` を先に `:47-51`、(2) README バッジを後に `:52-56`。
- バッジ正規表現 `:53-54`: `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+-blue/` — **`X.Y.Z` の直後に即 `-blue` を要求し、prerelease サフィックスを許さない**。version 受理側(`:22`)と非対称。
- patchFile のパターン不一致時挙動 `:34-45`: `!pattern.test(src)` で `console.error` → `process.exit(1)`(`:37-40`)。

**バグの核心 (2つ)**:
1. **前進不能**: prerelease 版へ bump するとバッジは `version-1.2.3-rc.1-blue` になる(または replacement 自体が `-` を単一のまま書くため shields.io 的にも不正)。次回実行時、`:54` の正規表現は `1.2.3` の直後が `-rc` で `-blue` でないため一致せず、バッジ patchFile が `:39` で exit 1。以後どの版へも進めなくなる。
2. **中間状態(half-applied)**: version.ts の patchFile が先(`:47-51`)に走って**ディスクへ書き込み済み**の後に、バッジ patchFile が `:39` で exit 1 する。→ version.ts は前進済み・バッジは据え置きの半適用。冪等性も破綻: 再実行では version.ts は既に目標値(`changedVersionTs=false`)だがバッジは依然一致せず、再び exit 1 に張り付く。

### 2.3 リリース配線

- `packages/setup/.release-it.json`: `hooks.after:bump` が `bun ../../scripts/release-version-sync.ts ${version} && git add -A :/`。`git.tagName` = `v${version}`、`requireBranch: main`、`github.release:false` / `npm.publish:false`(publish は workflow 側)。
- `.github/workflows/release.yml`: `workflow_dispatch`(inputs: `bump`, `dry-run`)。`npx release-it "${args[@]}"`(`:114` 付近)で bump→commit→tag→push を main へ直接。bootstrap 時は `--no-increment`。→ release-version-sync は release-it の after:bump 経由でのみ起動し、#702 はこの1ボタン運用を止める。

---

## 3. 既存テストカバレッジの実測

### `scripts/package.ts --check`
- `tests/integration/t145-packaging-parity.test.ts`: `package.ts --check` が exit 0(全ツリー byte 一致)を主張 `:46-56`、`package.ts claude --check` が `[claude] --check: OK` を含むことを主張 `:59-69`。
- **性質: 正の drift ガードのみ**。dist ルート直下に stale orphan を注入して --check が赤くなることを実証する負のテストは**存在しない**。→ #701 のギャップは未カバー(team.md「落ちる実証」規範の対象)。

### `scripts/release-version-sync.ts`
- `tests/unit/t68-version-changelog-sync.test.ts`: 静的3点同期を主張 — version.ts の `AMADEUS_VERSION` 代入が1つで SEMVER `[0-9]+\.[0-9]+\.[0-9]+`(`:40`, `:46-50`)、CLI `version` が `amadeus <ver>` を出力(`:56-60`)、`packages/setup/package.json` == version.ts(`:67-72`)、README バッジ一致 `/badge\/version-([0-9]+\.[0-9]+\.[0-9]+)-blue/`(`:77-83`)。
- **性質: release-version-sync.ts を実行しない静的検査**。prerelease を扱わず、**t68 自身のバッジ正規表現も非 prerelease 前提**(`:81`)なので、prerelease バッジが入ると t68 も赤くなる。→ #702 は未カバー、かつ修正時は t68 の正規表現も同時更新が必要。

---

## 4. codekb 更新が必要な箇所のリスト

| 成果物 | 更新要否 | 理由 |
|---|---|---|
| `reverse-engineering-timestamp.md` | **必須** | 観測コミットを `a1c79dc12` → `22e3eb5aa` へ更新 |
| `code-quality-assessment.md` | **必須** | #701(--check orphan 盲点)/ #702(prerelease 前進不能・half-applied)を品質欠陥として追記。PR #703 hermeticity 修正・test-size ドリフトガード導入も反映 |
| `architecture.md` | 要 | delegated-approval provenance(t112 / human-presence gate)、sensor-type-check の tsc launcher 化(t202)、swarm/state/bolt/audit の core 変更 |
| `component-inventory.md` | 要 | core tools 6件の M、setup src 3件(http port / tar extractor / installation)、新規テストコンポーネント |
| `code-structure.md` | 要 | `tests/lib/test-size.ts` 追加、テスト層再編(hermeticity)、新規テストファイル群の目録 |
| `api-documentation.md` | 軽微 | リリース契約(release.yml / .release-it.json / release-version-sync CLI)、package.ts CLI 契約の追補 |
| `technology-stack.md` | 軽微/不要 | 依存マニフェスト変更は差分に現れず(要 Architect 確認) |
| `dependencies.md` | 不要見込み | 依存グラフ変更なし(要 Architect 確認) |
| `business-overview.md` | 不要 | プロダクト価値の変更なし |
