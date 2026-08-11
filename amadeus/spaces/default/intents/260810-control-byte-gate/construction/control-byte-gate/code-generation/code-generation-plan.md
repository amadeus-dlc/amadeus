# Code Generation Plan — control-byte-gate(Issue #2814)

上流入力(consumes 全数): requirements.md(FR-CBG-1〜16 / NFR-1〜4 を各ステップの合否条件へ転写)、unit-of-work.md(U1 = control-byte-gate の境界と所有ファイル群)、business-logic-model.md(7段フローと in-process seam の意味論をステップ2の実装構造へ)、business-rules.md(BR-1〜11 をステップ2〜3の受け入れ述語へ)、domain-entities.md(Violation / GateResult / AllowlistEntry の readonly 形と不変条件をステップ2の型定義へ)、performance-design.md(直列同期走査と 30s 予算をステップ5の実測項目へ)、security-design.md(allowlist 悪用耐性・書込ゼロ・permissions をステップ3/4の設計制約へ)。条件解決で除外された consumes: deployment-architecture(required:false)— self-feature スコープで infrastructure-design が SKIP のため不在(設計上の期待どおり。本 Unit はデプロイ面を持たず CI ジョブ定義が唯一のインフラ面)。

## 実装形態

swarm batch 1(cap 1、単一 Unit)。worktree 分離で実装し、finalize 後に conductor ツリーへ `--no-ff` マージした。本成果物は `cid:code-generation:swarm-unit-artifact-backfill` に従い、着地実績に基づいて conductor が事後作成したものである。

## ステップ

### Step 1: 述語層(純関数)— `tests/lib/control-byte.ts`

- `isForbiddenControlByte(byte)` / `findControlByte(buffer)` を実装(component-methods.md の署名を正本とする)。
- 検出集合は BR-2 = `b < 0x20 かつ b ∉ {0x09,0x0A,0x0D}` または `b == 0x7F`(ADR-3 cr-excluded)。
- 導出コメント(FR-CBG-11 / BR-10): `isUtf8`(amadeus-migrate.ts:477)と `CONTROL_CHARS`(amadeus-lib.ts:4298)への出典参照、および CR 除外の意図的相違を明文化。import はしない。
- `Violation` / `GateResult` を domain-entities.md の readonly 形で **1定義**として置き、CLI とテストが共有する(BR-11 — 二重定義禁止)。
- 受け入れ: FS/process/env 非依存(NFR-1 の基盤)。制御バイトはソース上エスケープ表記のみ(ゲート自身が赤くならないこと)。

### Step 2: 走査エンジンと CLI — `tests/control-byte-gate.ts`

- `runControlByteGate({repoRoot, listFiles?})` に business-logic-model.md 段2〜5(allowlist 照合 → 読取 → 判定 → 集計)を実装。`listFiles` は port 注入の in-process seam(テストダブル分岐を本番経路へ置かない)。
- 列挙は `git ls-files -z` の spawn + NUL 分割(FR-CBG-2 — 日本語パスのバイト安全)。spawn 失敗・非0 exit は throw で fail-closed(BR-1)。
- `BINARY_ALLOWLIST: readonly AllowlistEntry[]` を in-script 定数として持つ(ADR-2)。初期1件 = `assets/AI-DLC-Workflows-2.0-Specification.pdf`。列挙集合に不在のエントリは `staleAllowlist` へ(BR-4 fail-closed)。
- 読取失敗は `readErrors` へ集計(BR-5 — skip・無音続行の禁止)。
- 診断書式は BR-6 の逐語形。全件列挙・打ち切りなし(NFR-2)。
- exit 契約は BR-7(3集合すべて空 → 0、いずれか非空 → 1)。
- 外部 grep 呼び出しゼロ(FR-CBG-13 / BR-9)。

### Step 3: 契約強化(監査で判明した不足の是正)

- `assertAllowlistWellFormed` を追加し、`reason` / `path` の空文字列(空白のみを含む)を load 時に throw で拒否する — domain-entities.md が規定する「reason は空文字列不可(実装で assert)」の充足。理由なき免除を構造的に不能にする。
- `scannedCount` の定義(列挙件数 − allowlist 命中件数。readErrors のファイルは「走査を試みた」として含む)をコード内コメントで固定。
- symlink の扱いを実測して確定する: git は symlink を「リンク先パス文字列を内容とする blob」として追跡するため、ゲートは `lstat` で symlink を判別し `readlink` の文字列を判定する(デリファレンスしない)。実測条項(business-rules.md 例外節)の充足。
- `main(args, repoRoot = REPO_ROOT)` として repo ルートを引数化し、CLI 経路をテストから in-process 駆動可能にする(coverage の spawn 盲点回避)。

### Step 4: テスト — `tests/unit/t-control-byte-predicate.test.ts` / `tests/integration/t-control-byte-gate.integration.test.ts`

- unit 層は純関数のみ(検出集合の境界値: 0x00 / 0x08 / 0x09 / 0x0A / 0x0B / 0x0C / 0x0D / 0x0E / 0x1F / 0x20 / 0x7F / 0x80、空バッファ、エスケープ表記の非検出)。
- 実 FS を使う検証は integration 層(`cid:code-generation:fs-tests-integration-first`)。scratch 一時ディレクトリに実 git リポジトリを作り、既定の `git ls-files -z` 経路を駆動する。
- 生バイトは実行時生成(`Buffer.from([...])` / `Uint8Array`)— 生バイトを含む恒久 fixture をツリーへ置かない(Q3 裁定 temp-commit。置けばゲート自身が赤くなる)。
- カバー範囲: clean コーパス / 制御バイト検出と診断文言 / 0x10 未満の2桁大文字 HEX 書式 / stale allowlist 単独 / 読取不能(fail-closed)/ 列挙失敗の loud / usage(exit 2)/ 空ファイル / 日本語パス / CRLF / symlink / allowlist 命中 skip / `assertAllowlistWellFormed` の3ケース。

### Step 5: CI 配線 — `.github/workflows/ci.yml`

- 独立ジョブ `control-byte-gate` を新設(ADR-1 independent-job)。`needs` も `if` も付けず**常時実行**する — 経路フィルタを付けた瞬間、フィルタが除外した経路から混入が着地しうるので、それこそが本ゲートの塞ぐ死角である。
- step は checkout → setup bun → `timeout --signal=TERM --kill-after=5s 30s bun tests/control-byte-gate.ts --check`(no-silent-drop step のコマンド形を同形再利用、FR-CBG-14)。
- ビルド生成物を読まないため `bun install` / `bun run build` を必要としない。
- ci.yml 変更に伴い `tests/fixtures/formal-verif-ci-baseline.sha256` と `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` を同一変更で同期する(ci.yml をピンする既存ベースライン)。

### Step 6: 落ちる実証(FR-CBG-9)— 注入 → 赤 → 復元 → 残渣ゼロを不可分1セット

- 先に注入面を実測して確定する(`cid:code-generation:injection-surface-verify`)。
- 注入はコミットしない。復元確認のバイト走査は grep 系を使わず python 直走査で行う(`grep` は binary 化で偽陰性、ugrep ラッパは無音脱落)。

### Step 7: sweep と実測記録(FR-CBG-10 / FR-CBG-14)

- 全 tracked コーパスへ適用して exit 0 と `scanned N` を取得し、`git ls-files | wc -l` との整合(N = 列挙件数 − allowlist 命中件数)を照合する。
- 実行時間とコーパス総バイト数を実測記録する(performance-design.md の実測条項 — 「数百 MB 未満」の規模前提の裏取りを含む)。

### Step 8: 検証

`bun run typecheck` / `bun run lint` / ゲート自身の `--check` / 対象テスト / `bun tests/complexity-gate.ts --check` / `bun run build` 後の追跡ファイル差分ゼロ / フルスイート `bash tests/run-tests.sh --ci` を、1コマンドずつ直書きで実行し exit code を個別に読む(パイプ越しの `$?` 取得は対象の失敗を無音で隠すため禁止)。

## 実測結果

Step 6〜8 の実測値・exit code・診断文言の逐語は `code-summary.md` に記録する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-11T01:35:41Z
- **Iteration:** 1
- **Scope decision:** none

Implementation matches its declared design closely (BR-1..BR-11, the byte predicate, allowlist handling with assertAllowlistWellFormed, fail-closed enumeration and read paths, the verbatim diagnostic wording, the exit contract, and the in-process seam all verified against the real code). Two blockers stand: the new CI job is structurally excluded from ci-success, which the repository ruleset names as the only required check, so FR-CBG-7's blocking requirement is unmet despite the job going red on detection; and code-summary.md's measured tables are stale against the merged state. Both are closeable with bounded, concrete fixes.

### Findings

- BLOCKER | .github/workflows/ci.yml:790-802 — the new `control-byte-gate` job is absent from `ci-success`'s `needs:` (changes, typecheck, lint, distribution-contract, plugin-conformance-e2e, tests, reproducible-build, drift-check, coverage) and from the require_result assertions at :805-860. The repository ruleset (id 18843917, enforcement ACTIVE) lists exactly one required status check: "CI Success". Therefore a red Control byte gate does not block merge, and FR-CBG-7 (requirements.md:31-32 "検査は CI の blocking step として実行する") is unsatisfied. The falling-proof shows the job CAN go red, not that a red job blocks. Closed by adding control-byte-gate to ci-success needs plus an unconditional require_result branch.
- BLOCKER | code-summary.md:19,21,26,100 — the measured tables are stale relative to the merged state. At the declared measurement ref (bolt-control-byte-gate head b5e514dd8) `git diff --stat cac41363a b5e514dd8 -- tests/ .github/` yields 199 / 319 / 674 as written, but the branch advanced afterwards (5197a16af, 901af89c8, 4133e8cc0, a6496fd2c) and at merged HEAD `wc -l` reports tests/control-byte-gate.ts = 246 and tests/integration/t-control-byte-gate.integration.test.ts = 381 (new-file total 756). The 33-test verification row likewise predates the final edits. The numbers were true when measured and the ref is declared, so this is staleness rather than fabrication, but the summary purports to describe what shipped. Closed by re-measuring against the merge commit cc775f87b and correcting the tables, or by explicitly scoping each table to its ref and adding a merged-state row.
- FOLLOW-UP | business-rules.md 例外・エッジケース vs tests/control-byte-gate.ts:22-30,153-160 — the FD still says dereference failure (dangling / directory) is loud via BR-5, but the implemented design never dereferences a symlink (lstatSync + readlinkSync on the link text), so that failure mode is structurally unreachable. Behaviour is correct and tested (t-control-byte-gate.integration.test.ts:134-149). Recommend updating the FD so it stops describing a path the implementation deliberately does not take.
- NIT | code-generation-plan.md:13 — cites component-methods.md as the signature source of truth, but that artifact is not among this stage's declared consumes; the equivalent signature is available via the declared domain-entities.md.

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-11T02:17:18Z
- **Iteration:** 2
- **Scope decision:** none

BLOCKER 1 (FR-CBG-7 blocking wiring) is CLOSED on independent evidence: ci-success's needs includes control-byte-gate and require_result sits ahead of all three case blocks, so every change class is held to it; both pin tests match the live workflow. BLOCKER 2's originally-cited stale numbers are gone. The reviewer raised a new BLOCKER on a 426-vs-381 line count, but conductor re-measurement at the row's declared ref (cc775f87b) reproduces 381 exactly; 426 is the current worktree including this follow-up's own +45 lines. The reviewer has no shell and could not resolve the file at that ref. The finding is not sustained as stated, though it correctly points at a residual gap: the table does not yet account for this follow-up PR's delta.

### Findings

- BLOCKER | code-summary.md:21 — reviewer measured tests/integration/t-control-byte-gate.integration.test.ts at 426 lines against a table row claiming 381, and concluded the shipped-state table is still stale. CONDUCTOR VERIFICATION REFUTES THIS: the row declares its ref as the shipped boundary (merge commit cc775f87b) and `git show cc775f87b:<file> | wc -l` = 381, `git diff --stat cc775f87b~1 cc775f87b -- <file>` = 381 insertions(+). 426 is the CURRENT worktree, which includes the +45 lines this very FR-CBG-7 follow-up adds. The reviewer had no shell tool and could not resolve the file at the declared ref, so it compared HEAD against a historical section (cid:requirements-analysis:historical-section-cite-check-at-observed, read-side). The finding is not sustained as stated.
- FOLLOW-UP | code-summary.md §変更面 — the residual gap the reviewer's instinct was tracking is real in a different form: the table accounts only for the shipped boundary and does not tabulate this follow-up PR's own delta, so a reader at the current tree cannot reconcile the file sizes they see. Closed by naming both refs explicitly and adding the follow-up delta.
- FOLLOW-UP | reviewer tooling — the architecture-reviewer profile is Read/Grep/Glob only, so re-measurement tasks phrased as `git diff --stat` / `wc -l` cannot be executed as written and get substituted with worktree counts. Dispatches that ask for measurement at a historical ref must either grant a shell or supply the pre-measured values for the reviewer to check.
