# RE scan — 260814-coverage-quick-norm

**観測 ref**: observed = `d7ffaa5442266508d8e67babc3e0b947fb4c1637`（`git rev-parse HEAD` = `git rev-parse origin/main`）。差分 base = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`（直前 timestamp の observed。`git merge-base --is-ancestor 5f6b5bf97 HEAD` = exit 0、`git rev-list --count 5f6b5bf97..HEAD` = **10**）。

**副作用**: git 状態変更・GitHub 書込・engine 操作・coverage 実行はすべてゼロ（`cid:code-generation:c1-coverage-single-owner`）。

## Scan mode

通常の差分リフレッシュ。xrev は採らない — 本 intent はクロスレビュー済み Issue の再実装ではなく、着地済みツーリング(#2965)の運用ノルム追記である。#2933 のクロスレビューは背景としてのみ用い、主張は observed で取り直した。

## 患部の実測

### 1. coverage-patch-quick は advisory であり blocking ではない

- `plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts:254-255` 逐語: `EXIT_ADVISORY = 0`（完了した近似は gate verdict に依らず 0）。
- 同 `:266-284` `renderAdvisoryBanner()` 逐語: `This is NOT the gate. The CI Patch Coverage Gate ... is canonical`。
- `plugins/coverage-patch-quick/README.md` Exit contract: 0 = 近似完了（PASS/FAIL とも push をブロックしない）。
- 有効化: `amadeus/config.json` `plugin.activation.names` = `coverage-patch-quick` / `formal-model-check` / `pr-convergence`（`python3` で読取）。

### 2. CI の正本はフル合流 lcov + `-P 4`

- `.github/workflows/ci.yml:466` 逐語: `bun run coverage:ci -- -P 4`
- 同 `:550` も同コマンド。
- Issue #2933 が引く job 94095568607 を本セッションで再取得: `Generate coverage reports` 2026-08-12T11:15:45Z→11:26:48Z（11 分 03 秒）、`Patch coverage gate` 11:26:48Z→11:26:51Z（3 秒）。コマンド: `gh api repos/amadeus-dlc/amadeus/actions/jobs/94095568607`。

### 3. 既存ノルムとの関係（矛盾なし）

| 既存則 | 所在 | 本追記との関係 |
|---|---|---|
| coverage single-owner | `project.md:136` `cid:code-generation:c1-coverage-single-owner` | フル計測の直列化と「実行中は重い並行禁止」を繰り返す。quick は専用 temp coverage-dir（README）で既定 `coverage/` を触らないため、single-owner を緩めない |
| numbers-from-command-output-only | `team.md:68` | 追記が引く 11:03 / 3 秒 / PR 番号はコマンド出力からの転記を義務づける。矛盾なし |
| TDD 適用外 | `team.md` Testing Posture (1) 文書・書式だけ | Inbox 1 行は適用外。矛盾なし |
| advisory vs blocking | `project.md:124` `cid:code-generation:c1-2814-aggregate-needs-is-blocking` | quick を blocking 集約へ入れない。矛盾なし |
| load-sensitive 帯 | `tests/run-tests.ts:56-58` `#1331/#1326` | フル `coverage:ci` を `-P 4` で回すときの負荷帯。single-owner と両立 |
| Inbox と本文の分離 | `project.md:146-148` | 追記先は Inbox。蒸留済み本文へ直接書かない |

### 4. Inbox に当該運用ノルムは未存在

述語（固定文字列、大小文字区別、対象 = `amadeus/spaces/default/memory/project.md`）:

```
git grep -n "coverage-patch-quick を pre-push\|coverage-patch-quick の advisory" -- amadeus/spaces/default/memory/project.md
```

出力 0 行。`git grep` の不一致は exit 1（エラー時は exit 2）。本セッション実測: 0 行 / exit 1。

`base..observed` の focus 差分は `amadeus/spaces/default/memory/project.md` のみ（他 intent の Inbox 追記）。`plugins/coverage-patch-quick` は区間内無変更。

## 申し送り

- RA は Inbox 1 件の受け入れ基準を、上表の既存則を緩めない述語で書く。
- 後続は `business-overview.md` / `code-structure.md` 等の無変更面から本 intent の事実を引かない（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）。引けるのは本 re-scan と architecture の本 intent 節、および一次資料(#2933/#2965/job 94095568607)。
