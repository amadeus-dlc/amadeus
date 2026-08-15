# リバースエンジニアリング差分スキャン — 260815-per-unit-outcome

- **Date**: 2026-08-15
- **Intent**: `260815-per-unit-outcome`（scope `self-fix`、depth Minimal、Brownfield、単一 repo `amadeus`）
- **Base commit**: `9ba8170bb03996fb98b497cfcbac3d207795018d`（前回スキャン = 260815-priority-bug-batch-2 の observed）
- **Observed commit**: `78146f435a66680055a24144937b5aa03d48bfb4`（`origin/main` tip）
- **Focus**: [Issue #3099](https://github.com/amadeus-dlc/amadeus/issues/3099)（P1 — per-unit run-stage で完走した Construction が `producer-outcome-pending` で build-and-test へ到達不能）の患部、および `base..observed` 全域の差分棚卸し
- **Scan mode**: 通常の差分リフレッシュ（xrev differential は不採用。理由は §1）

---

## §1 Scan mode の選択

Issue #3099 はクロスレビュー 2 名が CONFIRMED_WITH_REFINEMENTS で確定済み（凍結断面 `1fc4ad83f`）だが、本スキャンは **xrev differential scan mode を採らず通常の差分リフレッシュ**とした。

理由: 患部 5 ファイルは base..observed 区間で完全に無変更（§3 の実測）であり、verdict が引く行番号は現行断面でそのまま解決できる。表現形式の移行も挟まっていない（`cid:reverse-engineering:c5-xrev-currency-schema-migration` の不成立条件に該当しない）。ただし本スキャンは verdict を一次入力として複製せず、**全 file:line を observed で再解決して転記**した。クロスレビューの内容（同根の `ci-pipeline.md` enterprise-only consume、ラベル S1/P0 の疑義、solo projection が failure 経路にのみ配線されている点）は背景としてのみ扱う。

## §2 測定述語（再実行可能な形）

すべて worktree `/Users/j5ik2o/orca/workspaces/amadeus/bugfix-0815-0` の observed 断面で実行。

| 目的 | 述語 | 結果 |
|---|---|---|
| base の祖先性 | `git merge-base --is-ancestor 9ba8170bb03996fb98b497cfcbac3d207795018d 78146f435a66680055a24144937b5aa03d48bfb4` | **exit 0** |
| 区間距離 | `git rev-list --count 9ba8170bb..78146f435` | **12** |
| 区間規模（全域） | `git diff --shortstat 9ba8170bb 78146f435` | **103 files / +3091 / −182** |
| 区間規模（非 record） | `git diff --shortstat 9ba8170bb 78146f435 -- ':!amadeus/' ':!metrics/'` | **40 files / +874 / −97** |
| コア実装の変更 | `git diff --numstat 9ba8170bb 78146f435 -- 'packages/framework/core/tools/*.ts'` | 4 ファイル（§3 の表） |
| 非テスト非 record 面 | `git diff --name-only 9ba8170bb 78146f435 -- ':!amadeus/' ':!metrics/' ':!tests/'` | **12 行** |
| 新規テスト | `git diff --name-status --diff-filter=A 9ba8170bb 78146f435 -- 'tests/**'` | **4** |
| 変更テスト | `git diff --name-only --diff-filter=M 9ba8170bb 78146f435 -- 'tests/**' \| wc -l` | **24** |
| 患部の可動性 | `git diff --quiet 9ba8170bb 78146f435 -- <path>` を患部 5 パスへ個別適用 | **全件 exit 0** |
| 消費者エッジ数 | `awk 'NR>=91 && NR<=109' packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts \| grep -c '^\s*\['` | **19** |
| 消費者数 | 同範囲へ `grep -oE '^\s*\["[a-z-]+' \| grep -oE '[a-z-]+$' \| sort -u \| wc -l` | **7** |
| pool 生成点 | `grep -rn "createAuditUnitPoolRepository" packages/framework/core/tools/*.ts` | 14 行（うち import / 定義 3 行）。`amadeus-swarm.ts` は `grep -c` で 10 = import 1 + **9 call site** |
| per-unit 経路の pool 書込 | `awk 'NR>=4574 && NR<=4725' packages/framework/core/tools/amadeus-orchestrate.ts \| grep -n "UnitPool\|unitPool\|UNIT_POOL"` | **exit 1（0 hit）** |
| 母集団を駆動するテスト | `grep -rln "readPerUnitConsumePopulation" tests/` | **1 ファイル** |
| t533 ケース数 | `grep -c 'test("\|it("' <unit> <integration>` | unit **8** / integration **14** |
| 依存宣言の変化 | `git diff --stat 9ba8170bb 78146f435 -- package.json bun.lock '**/package.json'` | **出力なし**（exit 0） |
| model-map のピン | `grep -c "amadeus-orchestrate.ts" amadeus/spaces/default/specs/tla/model-map.json` | **2** |
| 同（患部他 3 ファイル） | `grep -c "unit-pool-runtime\|per-unit-consume-fanout\|construction-outcome-projection" <同上>` | **0**（exit 1） |
| allowlist 総数 / 該当 | `tests/.coverage-patch-allowlist.json` を `json.load` で全走査 | **448 件 / 患部関数は 1 件**（`readUnitPoolEventSetsFromAudit`、class `catch-arm`） |
| registry の可動性 | `git log -1 9ba8170bb..78146f435 -- tests/.coverage-registry.json` | **出力なし**（最終更新 `7711246fd`、2026-08-14） |

## §3 区間で動いたもの

コア実装は PR #3101 の 4 ファイルのみ。

| ファイル | ± | 内容 |
|---|---|---|
| `packages/framework/core/tools/amadeus-election.ts` | +21 / −5 | `runPreservedDigest()` 新設、3 呼び出し点の統一（#3077） |
| `packages/framework/core/tools/amadeus-graph.ts` | +30 / −6 | `loadSensors` → `mergeSensorsFromDir`、plugin host sensor のマージ（#3026） |
| `packages/framework/core/tools/amadeus-lib.ts` | +16 / −4 | `assertRecomposeAllowed` が `lifecyclePhase` を取り、`autonomous && construction` のみ拒否（#3074） |
| `packages/framework/core/tools/amadeus-utility.ts` | +1 / −1 | 上記へ `Lifecycle Phase` を渡す |

残る非 record 面は plugin 6（formal-model-check の sensor 宣言、github-pr-convergence の landed report）、docs 2（`06-sensors.md` / `.ja.md` の実在コーパス同期 = #3028）、tests 28（新規 4 = t3026 / t3028 / t3062-landed-finalization / t3077-election-full-retally、変更 24）。`amadeus/` 側では RFC-0001 intent-autonomy-modes が approved へ（+52/−17）、`specs/tla/model-map.json` が実装ハッシュピン 1 行の resync を受けた。

**患部は 1 バイトも動いていない**（§2 の `git diff --quiet` 全件 exit 0）。

## §4 中核知見（要約 — 詳細は本体成果物へ）

1. **読み口の 2 系統分裂**。正準射影は 5 イベントを読むが、per-unit fanout の母集団取得は 1 イベントしか読まない。→ `architecture.md` の対応節。
2. **per-unit dispatch 経路は pool へ書かない**（`emitPerUnitRunStage` 内 0 hit）。pool の単一 writer は `amadeus-unit-pool-runtime.ts:152-161`、変異源は swarm 9 箇所と `handleFailureRuling` のみ。→ `code-structure.md` / `component-inventory.md`。
3. **新規に確定した再現条件**: `amadeus-lib.ts:8416` により幅 1 バッチは plan-integrity redirect を素通りする。直列 Unit 計画は autonomy に関わらずこの経路へ落ちる。受け入れ基準はこの条件を符号化すべき。→ `architecture.md`。
4. **保存すべき不変量**: `amadeus-orchestrate.ts:2461-2463` のバッチ所属フィルタ。
5. **テスト空白**: 非 pool 由来の母集団を張るテストがゼロ件。#3099 のシナリオ（units-generation EXECUTE + per-unit dispatch → build-and-test）に再現テストがない。→ `code-quality-assessment.md`。
6. **台帳**: `model-map.json` に `amadeus-orchestrate.ts` のピンが 2 件、allowlist に患部関数のセレクタが 1 件。registry は本区間で無変更（新規テスト 4 件を伴っても）。→ `code-quality-assessment.md`。
7. **degrade スコープは免疫**（`amadeus-orchestrate.ts:2451` の早期 return）。患部は units-generation を EXECUTE した intent に限られる。

是正方式（(a) fanout 側で正準射影を読む / (b) per-unit 経路から pool イベントを発行する / (c) 折衷）は**本スキャンでは決めない**。構造的整合は (a) が高く、直近の前例（PR #3101 の `runPreservedDigest`）も同型だが、方式の選択は後続の裁定事項（`memory/team.md` P1）。

## §5 上流報告からの訂正（申し送り）

Developer scan 報告のうち、本スキャンの再実測と一致しなかった 3 点。**いずれも結論は不変**で、数値のみの訂正である。

| 項目 | 上流報告 | 再実測 | 述語 |
|---|---|---|---|
| t533 unit のケース数 | 9 | **8** | `grep -c 'test("\|it("' tests/unit/t533-per-unit-consume-fanout.test.ts` |
| t533 integration のケース数 | 15 | **14** | 同述語を integration ファイルへ |
| 区間の変更テスト数 | 23 | **24** | `git diff --name-only --diff-filter=M 9ba8170bb 78146f435 -- 'tests/**' \| wc -l` |
| `planIntegrityVerdict` の定義行 | （未記載） | **`:8412`**（幅判定は `:8416`） | `grep -n "export function planIntegrityVerdict"` |

あわせて `memory/project.md` Learnings Inbox の `cid:build-and-test:c1`（「新規テストファイルを追加する PR は coverage-registry の regen を同梱する」）は、本区間の実測（新規テスト 4 件・registry 無変更）と文面が整合しない。registry の鍵はソース側ユニットであり、次回蒸留ラウンドでの文面訂正候補である。

## §6 構造補修

直前 intent `260815-priority-bug-batch-2` の現在時制マーカー **4 件**を履歴へ降格した（`cid:reverse-engineering:c1` / `c3-relabel`）。本文と当時の行番号は保持している。

- `architecture.md:5353` / `code-structure.md:343` / `component-inventory.md:2776` / `code-quality-assessment.md:3726`
- `reverse-engineering-timestamp.md:3` の見出しも `（現在: …）` → `（履歴: …）` へ

`business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` は前 intent が節を持たないため降格対象なし。

## §7 更新した成果物

- 本体 8 面すべて（`architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` は実質内容の節、`api-documentation.md` / `dependencies.md` / `technology-stack.md` / `business-overview.md` は差分デルタの短節）
- `reverse-engineering-timestamp.md`（共有 freshness ポインタの最新ブロック）
- 本ファイル

## §8 Verification

読取専用。git 状態変更（commit / branch / checkout / stash / merge）、GitHub 書込、engine/state ツール実行（`amadeus-orchestrate` / `-state` / `-log` / `-bolt`）、`bun run build`、テスト実行はいずれも**ゼロ**。書き込みは `amadeus/spaces/default/codekb/amadeus/` 配下のみで、intent record・state へは一切書き込んでいない。
