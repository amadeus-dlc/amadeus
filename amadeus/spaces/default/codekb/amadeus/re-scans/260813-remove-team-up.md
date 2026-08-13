# re-scan: 260813-remove-team-up（Issue #2970、ミラー #2973）

**Date**: `2026-08-13`
**測定 ref**: observed = 本 worktree HEAD = `origin/main` 系譜 = `97581b3e39187b13413c046e86f820d290a389eb`（`git rev-parse HEAD` と `git rev-parse origin/main` が一致。`cid:reverse-engineering:c2-observed-mainline-commit`）
**Base**: `854692fd7a11b124236b0427fe3d59e2fe6bf785`（この intent に先行 re-scan は無い。`re-scans/*.md` の observed のうち **HEAD の祖先で距離最小**。`git merge-base --is-ancestor 854692fd7 HEAD` = **exit 0**、`git rev-list --count 854692fd7..HEAD` = **34**。`cid:reverse-engineering:rescan-base-ancestry`）
**Scope**: `self-fix`、Brownfield、単一 repo `amadeus`
**Focus**: 利用者指示「team-up.sh は利用しないので削除」+ [Issue #2970](https://github.com/amadeus-dlc/amadeus/issues/2970)（bash 3.2 空配列展開で `set -u` クラッシュ、`exit 0` のまま状態破損）
**Scan mode**: **focused differential refresh**（`cid:reverse-engineering:c1`）。xrev 2名は本 Issue に未確認のため一次入力にしない。区間 `854692fd7..97581b3e3` の `git diff --name-only | rg -i team-up` は **空**（team-up 実装面は base から無変更）
**副作用**: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作はゼロ。書き込みは codekb 配下のみ。Developer/Architect Task は Opus/Sonnet 使用上限で失敗し、conductor が同一測定手順をインライン実行した（`memory.md` Deviations）

---

## 検索述語（再実行可能）

すべて worktree ルート。除外は注記どおり。

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git rev-parse HEAD` / `git rev-parse origin/main` | 両方 `97581b3e39187b13413c046e86f820d290a389eb` |
| P1 | `git merge-base --is-ancestor 854692fd7 HEAD`; `git rev-list --count 854692fd7..HEAD` | exit 0 / **34** |
| P2 | `git diff --name-only 854692fd7..HEAD \| rg -i team-up` | **空** |
| P3 | `git ls-files \| rg -i 'team-up'` | **17**（intent record 3 + 正本 2 + tests/fixture 12） |
| P4 | `git ls-files \| rg -i 'team-up' \| rg -v '^amadeus/spaces/.*/intents/'` | **14**（正本 2 + tests 12） |
| P5 | `rg -l --glob '!amadeus/spaces/**' --glob '!dist/**' 'team-up\.sh'` | **21 files**（docs 8 + core 4 + tests 9。core 4 = `team-up.sh` / `team-msg.sh` / `amadeus-utility.ts` / `glossary.md`） |
| P6 | `rg -l --glob '!amadeus/spaces/**' --glob '!dist/**' 'team-up-codex-safety-wait'` | **5 files**（`team-up.sh` + unit 1 + integration 2 + e2e 1） |
| P7 | `rg -l 'src: "tools"' packages/framework/harness/*/manifest.ts` | **8**（全 harness の `coreDirs` が `tools` を投影） |
| P8 | observed で `team-up.sh:3` / `:1167-1170` / `:1409-1420` / `:1697-1698` を直読 | #2970 機序 **現存**（下表） |

---

## 1. #2970 機序は observed で現存

Issue 本文の file:line を observed で直読した。区間内に team-up 差分は無い（P2）ので、起票時の機序は HEAD でもそのまま残る。

| 引用 | observed verbatim |
|---|---|
| `:3` `set -euo pipefail` | EXACT |
| `stack_column` `:1167-1170` | `local members=("$@")` の直後 `for mem in "${members[@]}"; do` — bash 3.2 + `set -u` で空配列が unbound |
| 呼び出し `:1697-1698` | `stack_column "$P_TOP_LEFT" "${left[@]:1}"` / 右列同様。2 エンジニア構成では片側 `[@]:1` が空 |
| `handle_exit` `:1409-1420` | `local rc=$?` のあと `exit "$rc"`。`set -u` 即死は通常失敗経路を通らず、trap が直前成功の 0 を掴みうる（Issue の `bash -x` と整合。本セッションでは bash 3.2 再現コマンドは再実行していない — 静的現存のみ PROVEN） |
| 状態書込 `:1702-1710` | `current-run` / `active-run` / `status` は `stack_column` **の後**。クラッシュすると未到達 |

**完了条件の読み替え**: Issue はクラッシュ修正を求める。利用者指示は「もう使わないので削除」。後者が Intent の作業対象。クラッシュ修正は削除により経路ごと消滅する（仮説ではなく、呼び出し元削除の論理帰結。削除後の回帰は build-and-test の所掌）。

---

## 2. 消費者棚卸し（二重キー）

キー A = パス名 `team-up`。キー B = リテラル `team-up.sh` / `team-up-codex-safety-wait`。

### 正本（削除候補の核）

| パス | 役割 |
|---|---|
| `packages/framework/core/tools/team-up.sh` | Team Mode ランチャ正本 |
| `packages/framework/core/tools/team-up-codex-safety-wait.ts` | Codex safety-wait supervisor。**本番呼び出しは `team-up.sh:59` の `SAFETY_WAIT_HELPER` のみ**（P6） |

### テスト（名前付き 12 + 非名前付き 3）

P4 の 12 に加え、P5 が拾う非名前付き:

- `tests/integration/t266-team-launcher-prerequisites.test.ts`
- `tests/integration/t226-migration-doctor-heartbeats.test.ts`（doctor の fix 文字列に `team-up.sh`）
- `tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts`

### 文書・知識（ユーザー向けに「現行機能」として残っている）

`docs/guide/20-team-mode.md` と対訳、`team-messaging.md` 対訳、`glossary.md` 対訳、`docs/guide/harnesses/codex-cli.md` 対訳、`packages/framework/core/knowledge/amadeus-shared/glossary.md`（**stale path** `scripts/team-up.sh`）。

### 隣接で残すもの

- `packages/framework/core/tools/team-msg.sh` — メッセージング専用。`:57` はコメントで `team-up.sh member_role` の逆写像と述べるだけ。実行時 import は無し
- 過去 Intent record / codekb 履歴 — 削除対象外

### 配布

全 8 harness manifest が `coreDirs: { src: "tools", dst: "tools" }`。正本を消すと `bun run build` 後の dist / self-install から消える契約（`cid:code-generation:harness-tools-placement` の逆。生成物を手で消さない）。

### doctor

`amadeus-utility.ts:964` の Codex project-trust 修復文が `bash <harness-dir>/tools/team-up.sh` を指名。ランチャ削除時は **fix 文言の置換が必須**（テスト `t226` が文字列をピン）。

---

## 3. 「使っていない」と「コード上は現行」のギャップ

利用者は利用停止を宣言した。観測事実としては:

- ランチャは core tools 正本として残存し、全 harness に投影される
- ユーザーガイド `20-team-mode.md` は起動手順の正として `bash {{HARNESS_DIR}}/tools/team-up.sh` を掲載
- #2970 はフルスイートで恒常赤（Issue 本文。本セッションでは当該テストを再実行していない — UNMEASURED）

すなわち **製品文書・配布面では現行機能、運用判断では廃止**。削除 Intent はコードだけでなく docs / doctor 文言 / テストを同一変更に含めないと配送面が残る（`cid:requirements-analysis:c2-acceptance-at-delivery-tree`）。

---

## 4. 推奨削除集合 vs 残置（RE の列挙。設計裁定は RA）

**削除（証拠つき）**

1. `team-up.sh` 正本
2. `team-up-codex-safety-wait.ts` 正本（P6: 本番消費者はランチャのみ）
3. P4 の tests/fixture 12 + `t266` + `t267` のランチャ駆動部 + `t226` の fix 文字列ピン更新
4. `docs/guide/20-team-mode.md` 対訳の廃止または「removed」化、glossary / team-messaging / codex-cli の起動手順
5. core glossary の `scripts/team-up.sh` 行

**残置**

- `team-msg.sh`（独立 CLI）
- swarm / election / herdr 一般言及（ランチャ専用ではない）
- 履歴 Intent / 旧 codekb 節

**未決（RA）**: Team Mode 概念そのものをドキュメントから消すか、「ランチャ廃止・手動 herdr は対象外」と残すか。`team-msg.sh` を同 PR で残すか。

---

## 5. 事実 / 仮説 / 未測定

**事実**: P0–P8、#2970 サイトの verbatim、P6 の safety-wait 消費者 5 files、8 harness の tools 投影、docs が現行手順として掲載。

**仮説**: trap が bash 3.2 unbound で rc=0 になることは Issue の `bash -x` に依拠し、本セッションでは未再実測。

**未測定**:

1. `bun test` による #2970 対象 18 件の再現（Issue が main で報告。P2 により区間無変更なので再現可能性は高いが未実行）
2. dist / self-install 上の実コピー数（gitignored。build 後に数える）
3. Issue #2970 のクロスレビュー 2 名（本 RE は xrev を一次入力にしていない）
4. 開いている関連 Issue #1250 / #998 / #1136 / #1087 の close 方針

---

## 6. 共有 codekb 8 成果物の扱い

| 成果物 | 判定 |
|---|---|
| architecture.md | **更新** — ランチャ起動シーケンスと #2970 失敗点 |
| component-inventory.md | **更新** — 正本・テスト・docs・doctor の棚卸し |
| code-quality-assessment.md | **更新** — bash 3.2 + trap の偽成功、スイート恒常赤 |
| code-structure.md | **更新** — tools 配置と投影 |
| api-documentation.md | **更新** — CLI 面と `SAFETY_WAIT_HELPER` |
| business-overview.md | レビュー済み無変更 — 業務ドメインはワークフローエンジンであり Team Mode は任意起動器 |
| technology-stack.md | レビュー済み無変更 — Bun/TS/Biome 不変 |
| dependencies.md | レビュー済み無変更 — package.json エッジ不変（herdr/agmsg はランチャ前提の外部ツール） |
