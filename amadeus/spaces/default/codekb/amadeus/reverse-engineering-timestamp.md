# リバースエンジニアリング鮮度ポインタ

> このファイルは鮮度ポインタ(共有・last-writer-wins)であってベース点ではない。各 intent 固有の base/observed の真実源は `codekb/amadeus/re-scans/<intent>.md`(#707 新契約)。以下は最新 intent の記録で、旧 intent の節は参照用に温存する。

## 実行メタデータ(最新: 260710-kiro-stale-hooks)

- Date: 2026-07-10
- Intent: `260710-kiro-stale-hooks`(#719 / P3: Kiro CLI が unshipped な stale `.kiro.hook` を source に保持し、orphan 免除がそれをマスクしている source hygiene バグ)
- Scope: `bugfix`
- Repository: `amadeus`(origin remote 由来、#693 で統一。物理チェックアウトは worktree `codex-engineer-1`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正事項 cid:reverse-engineering:c1)。Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)。
- Base commit: `24197d755a51712c1bfd6fa405f709c070c61f0d`(前 intent `260709-dynamic-test-size` の観測コミット。本 intent に prior re-scan 記録なし → re-scans/ 内最新 observed を base に採用。真実源は `re-scans/260710-kiro-stale-hooks.md`)
- Observed commit: `e1a07fada340bb4691d8ce8d576cbf96345f9395`(現 HEAD、`git rev-parse HEAD` 実測)
- Focus: #719 — kiro ハーネスの hook 出荷経路(`manifest.ts` / `agents/amadeus.json` adapter 登録)・`scripts/package.ts` の orphan 検査機構・2層マスキング(source 側検査機構の不在=1層目 + kiro CLI authoredExempt regex3 の空振り exemption=2層目)

## 分析範囲(260710-kiro-stale-hooks)

`git diff --name-status 24197d75..e1a07fad -- ':!amadeus/' ':!dist/'` の差分は13ファイルで、いずれも本フォーカス面(`harness/kiro*`・`scripts/package.ts`・harness `manifest.ts`)に**非関与**(監査エスケープ #204/#205 とテストサイズ動的計測系)。したがってフォーカス面は前回 codekb の理解がそのまま有効で、本スキャンは現行コードの直読で file:line を確定した(`scripts/package.ts:554-633`・`harness/kiro/manifest.ts`・`harness/kiro-ide/manifest.ts`・`harness/kiro/agents/amadeus.json`・`dist/kiro` 出荷実態・t147/t148)。詳細は `re-scans/260710-kiro-stale-hooks.md`。

## 合成方針(Architect 実施 / 260710-kiro-stale-hooks)

Developer スキャン結果を受け、9アーティファクトのうち2件を diff-refresh 更新した: `code-quality-assessment.md`(#719 の 2層マスキング drift-guard 穴を1節追加 — source 側 orphan 検査機構の不在=1層目・kiro CLI authoredExempt regex3 の空振り exemption=2層目、および #701 記述の stale 行番号を whole-tree 化 `:605-628` へ是正)、本ファイル `reverse-engineering-timestamp.md`(鮮度ポインタ更新)。残る7件(api-documentation / architecture / business-overview / code-structure / component-inventory / dependencies / technology-stack)は本 intent が source hygiene に限局し API 契約・アーキ・依存・構造・スタックがいずれも不変のため温存。以下の dynamic-test-size 以降の節は前 intent の記録であり参照用に温存する。

## 実行メタデータ(260709-dynamic-test-size)

- Date: 2026-07-09
- Intent: `260709-dynamic-test-size`(#699 / #684 Phase D: テストランナーにおけるテストサイズの継続的動的計測)
- Scope: `feature`(既存コードベースへの計測機構追加)
- Repository: `amadeus`(origin remote 由来、#693 で統一。物理チェックアウトは worktree `claude-engineer-1`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正事項 cid:reverse-engineering:c1)
- Base commit: `9a2f5c7205795a255f258628710820def2ab3f8c`(前 intent `260709-pbt-small-band` の観測コミット。本 intent に prior re-scan 記録なし → re-scans/ 内最新 observed を採用。真実源は `re-scans/260709-dynamic-test-size.md`)
- Observed commit: `24197d755a51712c1bfd6fa405f709c070c61f0d`(現 HEAD、`git rev-parse HEAD` 実測)
- Focus: #699 Phase D — runner の per-file wall-clock 永続化経路、`test-size.ts` 安定出力契約、drift guard、t112 copy 制約、CI(ubuntu-latest)artifact 配線、gen-coverage-registry 合流点

## 分析範囲(260709-dynamic-test-size)

`git diff --name-status 9a2f5c72..24197d755 -- ':!amadeus/' ':!dist/'` の実質コード差分は5ファイルのみ(`bun.lock`/`package.json`/`tests/helpers/arbitraries/semver.ts`[A]/`tests/integration/t92.test.ts`[M, #709 対応]/`tests/unit/setup-semver.pbt.test.ts`[A]、#721/#722 由来)で、いずれも #699 のフォーカス面(`run-tests.ts` 計測ライフサイクル・`test-size.ts` 分類契約・`t-test-size-drift`・`bun-junit-to-meta.ts`・t112 copy・CI・`gen-coverage-registry.ts`)に**非関与**。したがってフォーカス面は前回 codekb の理解がそのまま有効で、本スキャンは現行コードの直読で file:line を確定した。fast-check `^4.9.0` の devDependencies 追加のみ technology-stack へ反映。

## 合成方針(Architect 実施 / 260709-dynamic-test-size)

Developer スキャン結果を受け、9アーティファクトのうち4件を diff-refresh 更新した: `code-quality-assessment.md`(#699 観測面 4節 — 永続化経路不在・合流点/隔離契約・t112 copy 伝播/registry 直交・CI 配線)、`architecture.md`(テストピラミッド節へ「ランナー計測ライフサイクルと #699 Phase D の結合点」の3層構造を追補)、`technology-stack.md`(fast-check 追加を反映)、`code-structure.md`(新規 PBT 2ファイル + `tests/helpers/arbitraries/` ディレクトリの目録追記)。残る4件(`api-documentation.md` / `business-overview.md` / `component-inventory.md` / `dependencies.md`)は本 intent が計測機構の観測に限局し API 契約・ビジネス面・コンポーネント目録・依存マニフェストがいずれも不変のため温存(本ファイル `reverse-engineering-timestamp.md` は鮮度ポインタとして更新済み、5件目の更新)。以下の t92-worktree-hermeticity 以降の節は前 intent の記録であり参照用に温存する。

## 実行メタデータ(260709-t92-worktree-hermeticity)

- Date: 2026-07-09
- Intent: `260709-t92-worktree-hermeticity`
- Scope: `bugfix`
- Repository: `amadeus`(origin remote 由来、#693 で統一。物理チェックアウトは worktree `claude-engineer-1`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `22e3eb5aa`(前回 intent `260709-packaging-repair-batch` のスキャン観測コミット)
- Observed commit: `be205cfca`
- Focus: #709(t92 test-44 の tsc 解決ヘルメチシティ — sensor-type-check の exit-code 伝播設計と環境依存 launcher の非対称、test 44 の install 済 node_modules へのシンボリックリンク前提)
- ベースにした codekb: 本ディレクトリ `amadeus/spaces/default/codekb/amadeus/`(2026-07-09、intent `260709-packaging-repair-batch`、観測 `22e3eb5aa`)

## 分析範囲(260709-t92-worktree-hermeticity)

`git diff --name-status 22e3eb5aa..be205cfca` の差分区間で、#701/#702 の正本(`scripts/package.ts`・`scripts/release-version-sync.ts`)が PR #711/#712 として修理・マージされたことを確認した(両バグは解消済み。code-quality-assessment.md に反映)。本 intent のフォーカス #709 は tsc 解決チェーンに限局するため、差分に依らず生産センサー `packages/framework/core/tools/amadeus-sensor-type-check.ts`(自己インストール `.claude/tools/` と `diff -q` 一致=ドリフトなし)とテスト `tests/integration/t92.test.ts` test 44・関連テスト(45/12/16・t202)を直接読解し file:line を確定した。依存マニフェスト・コード構造・技術スタックはこの差分区間・本フォーカスを通じて不変(実測)。

## 合成方針(Architect 実施 / 260709-t92-worktree-hermeticity)

Developer スキャン結果を受け、9アーティファクトのうち `code-quality-assessment.md` に #709 の tsc 解決ヘルメチシティ所見を追記し、#701/#702 を PR #711/#712 マージ済みとして解決状態へ更新した。他 7 件(api-documentation / architecture / business-overview / code-structure / component-inventory / dependencies / technology-stack)は本 intent がテスト1件のヘルメチシティ修正に限局し依存・構造・スタックが不変のため温存。以下の「分析範囲(260709-packaging-repair-batch)」以降は前 intent の記録であり参照用に温存する。

## 分析範囲(260709-packaging-repair-batch)

`git diff --name-status a1c79dc12..22e3eb5aa` で227ファイルの差分を確認した(A44 / D18 / M165)。大半は `amadeus/spaces/default/intents/`(工程記録)と `dist/`(再生成物)。codekb 観測面に効く実質差分は次の通り。

- `packages/framework/core/tools/` の6ファイル(全 M): `amadeus-audit.ts`・`amadeus-bolt.ts`・`amadeus-lib.ts`・`amadeus-sensor-type-check.ts`・`amadeus-state.ts`・`amadeus-swarm.ts`。前 intent(bug-zero-batch)の修理と、delegated-approval provenance / sensor-type-check の tsc launcher 化などの反映。
- `packages/setup/src/` の3ファイル(M): `domain/installation.ts`・`internal/tar-archive-extractor.ts`・`ports/http.ts`。
- `tests/` の再編(PR #703 hermeticity 修正、class-B 14ファイル)と新規テスト群: `tests/lib/test-size.ts`、`tests/unit/setup-http.test.ts`、`tests/unit/t-test-size-drift.test.ts`、`tests/unit/t112-delegated-approval.test.ts`、`tests/unit/t202-hook-project-dir-worktree-marker.test.ts`、`tests/unit/t202-sensor-type-check-tsc-launcher.test.ts`。
- `docs/`(glossary ja/en、04-stages/inception、12-state-machine)は参照のみで codekb 影響小。

本 intent が対象とする2バグの正本(`scripts/package.ts`・`scripts/release-version-sync.ts`)およびリリース配線(`.github/workflows/release.yml`・`packages/setup/.release-it.json`)は、この差分区間 `a1c79dc12..22e3eb5aa` では**変更されていない**(`git diff --name-status` で当該パスに差分なしを実測)。したがって #701/#702 はこの差分区間の前後を通じて存在し続けている既存欠陥であり、本スキャンは現行コードを直接読解して file:line を確定した。

重点スキャン対象(すべて現 HEAD の実コードを直接読解):

- `scripts/package.ts` `checkHarness`(L554-624)— #701。orphan スキャンのルート集合が `[".agents", "amadeus"]` のハードコード2件のみ(L611)、projectRoot ファイルの diff(L586-592)は built→committed 方向のみで committed→built orphan 検査が無い。
- `scripts/release-version-sync.ts`(L22 version 受理正規表現、L47-51 version.ts patch、L53-54 badge 正規表現、L34-45 patchFile の pattern 不一致 exit(1))— #702。

## 鮮度に関する注記

前 intent(`260709-bug-zero-batch`、観測 `a1c79dc12`)の codekb は #674/#675/#676/#677/#678/#668 の6バグを主眼に書かれていた。それら6件は本差分区間で該当コアツールが Modified されており(bug-zero-batch ワークフロー完了済み)、本スキャンの重点ではないため状態確定は行わず、記述は前 intent の記録として温存する。本スキャンは新規フォーカス #701/#702 を追記し、コアツール6件・setup src 3件・tests 再編の差分レベル更新を各成果物に折り込んだ。

## 合成方針(Architect 実施)

Developer スキャン結果を受け、9アーティファクト(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / reverse-engineering-timestamp)を diff-refresh 方式で更新した。#701/#702 を code-quality-assessment.md に確認済み欠陥として追記、リリース契約と `package.ts --check` 契約を api-documentation.md に追補、コアツール/ setup src / tests 再編を architecture.md・component-inventory.md・code-structure.md に差分レベルで折り込んだ。依存マニフェスト変更はこの差分区間に現れず(実測)、technology-stack.md・dependencies.md・business-overview.md は変更不要と判断して温存した。

## 更新した成果物(260709-packaging-repair-batch)

- `reverse-engineering-timestamp.md`(メタデータ更新)
- `code-quality-assessment.md`(#701/#702 + PR #703 / test-size ガード)
- `architecture.md`(コアツール差分・tests 再編)
- `component-inventory.md`(コアツール6件 M・setup src 3件・新規テスト)
- `code-structure.md`(tests 層目録・hermeticity 再編)
- `api-documentation.md`(リリース契約・package.ts --check 契約)
- 温存(変更なし): `technology-stack.md`・`dependencies.md`・`business-overview.md`

未更新(差分に実質変更なし): `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md`。
