# リバースエンジニアリング実施記録

## 実行メタデータ(最新: 260709-packaging-repair-batch)

- Date: 2026-07-09
- Intent: `260709-packaging-repair-batch`
- Scope: `bugfix`
- Repository: `amadeus`(origin remote 由来、#693 で統一。物理チェックアウトは worktree `claude-engineer-2`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `a1c79dc12`(前回 intent `260709-bug-zero-batch` のスキャン観測コミット)
- Observed commit: `22e3eb5aa414d427ba29e4884487e3cb9b0581db`
- Focus: パッケージング/リリース同期の2バグ — #701(`scripts/package.ts` `--check` の orphan スキャンが dist ルート平坦面を見ない盲点)、#702(`scripts/release-version-sync.ts` の prerelease バッジが前進不能・half-applied)
- ベースにした codekb: 本ディレクトリ `amadeus/spaces/default/codekb/amadeus/`(2026-07-09、intent `260709-bug-zero-batch`、観測 `a1c79dc12`)

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
