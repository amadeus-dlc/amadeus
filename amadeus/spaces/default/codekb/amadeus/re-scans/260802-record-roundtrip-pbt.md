# RE 差分リフレッシュ記録: 260802-record-roundtrip-pbt

上流入力(consumes 全数): なし(RE は起点ステージ。入力は intent-statement と Issue #1980 本文、およびクロスレビュー 2 名の CONFIRMED_WITH_REFINEMENTS verdict)

- Date: `2026-08-02T16:39:04Z`
- Base commit: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`(前回 observed = 260802-scope-grid-face-sync。祖先性実測: `git merge-base --is-ancestor 47574fbab HEAD` exit 0)
- Observed commit: `9750f8aea0763eb10572b27b900c435de0146e86`(`fix(plugin): persist opt-in selection across harnesses (#2049)`、origin/main 系譜かつ HEAD 祖先 = `merge-base(HEAD, origin/main)`)
- Distance: `13 commits`(`git rev-list --count 47574fbab..9750f8aea`)
- 区間規模: `574 files changed, 51854 insertions(+), 2012 deletions(-)`(`git diff --shortstat 47574fbab..9750f8aea`)
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: Issue #1980 — 記録系 4 境界(mirror / state / audit / election)の write⇔read round-trip PBT + fail-closed PBT 導入と読み側バリデータ一本化。実対象は state / election の各 1 境界以上(新規)+ mirror / audit は既存被覆の外側のみ

## Scan mode 申告

`cid:reverse-engineering:c1-xrev-scan-mode` に基づく **differential refresh + クロスレビュー一次入力**:

- 一次入力: reviewer-1 / reviewer-2 の verdict(いずれも `CONFIRMED_WITH_REFINEMENTS`、対象 SHA `8e5dc6c47a71011099fb0096d6fb7a09f5aa7927`、HEAD 祖先)。全文は Issue #1980 のコメント 2 件
- 二重化: conductor が observed で verbatim スポット再実測 + 患部区間 touch 判定を実施。Architect が全 file:line を observed で再解決し、下記「引用再確認」の値だけを成果物へ転記
- base 選定: `re-scans/` の observed を新しい順に確認し、直近かつ HEAD 祖先である 260802-scope-grid-face-sync の `47574fbab` を採用(`cid:reverse-engineering:rescan-base-ancestry`)
- 行番号再解決の免除条件は適用しない — 患部の一部(`amadeus-lib.ts` / `amadeus-audit.ts`)が区間内に touch を持ち、レビュー対象 SHA `8e5dc6c4` と observed で行がずれるため、全引用を observed で再解決した

## 患部 touch 判定(`47574fbab..9750f8aea`)

| パス | 区間内コミット数 | 内容 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-election.ts` | 0 | 無変更 |
| `packages/framework/core/tools/amadeus-election-store.ts` | 0 | 無変更 |
| `packages/framework/core/tools/amadeus-election-model.ts` | 0 | 無変更 |
| `packages/framework/core/tools/amadeus-mirror-state-codec.ts` | 0 | 無変更 |
| `packages/framework/core/tools/amadeus-state.ts` | 0 | 無変更 |
| `packages/framework/core/tools/amadeus-lib.ts` | 1 | #2031、+1 行のみ |
| `packages/framework/core/tools/amadeus-audit.ts` | 1 | #2031、+5 行(`EXECUTION_EVENT_SET_COMMITTED` 追加、audit event types 79→80) |
| `packages/framework/core/tools/amadeus-journal.ts` | 0 | 無変更 |
| `tests/run-tests.ts` | 0 | 無変更 |
| `tests/callsite-guard.ts` | 0 | 無変更 |

コマンド: `git log --oneline 47574fbab..9750f8aea -- <path> | wc -l` を 10 パスへ個別適用。

**結論**: 乖離は区間内に新規導入されたものではなく、`47574fbab` 以前からの残存。区間の主変更(#2031 execution observability baseline / #2041 scope-grid face sync / #2044 glossary 単一所有化 / #2049 plugin opt-in persist / #2053 PBT posture ノルム)はいずれも患部外。ただし #2053 は `project.md` § Testing へ `cid:build-and-test:pbt-developer-testing-posture` を追加しており、本 intent の直接の上位規範として区間内に着地している(レビュー対象 SHA `8e5dc6c4` には不在 — 参照時は ref 明記が要る)。

## 引用再確認(observed `9750f8aea` 実測)

### 行がずれたもの(下流成果物はこの再解決値を使う)

| 引用 | Issue / レビュー記載 | observed 実測 | シフト量・源 |
| --- | --- | --- | --- |
| `amadeus-state.ts` `parseMirrorBoundaryReceipts` | `:238` | `:239` | +1 |
| `amadeus-state.ts` `serializeMirrorBoundaryReceipts` | `:277` | `:278` | +1 |
| `amadeus-lib.ts` `setField` | `:5236` | `:5237` | +1(#2031) |
| `amadeus-audit.ts` `escapeAuditValue` | `:355` | `:360` | +5(#2031) |
| `amadeus-audit.ts` `unescapeAuditBody` | `:362` | `:367` | +5(#2031) |
| `packages/framework/harness/claude/manifest.ts` `coreDirs` の tools 行 | `:52` | `:53` | +1 |

### ずれなしを実測確認したもの

`amadeus-election.ts:310`(open が `Election.parse`)/ `:433`(vote が `Ballot.parse`)、`amadeus-election-store.ts:60` `writeStoreFile` / `:71` `readJson` / `:80` 無検査キャスト / `:503-510` `Store.load`、`amadeus-lib.ts:5179` `getField`、`tests/run-tests.ts:117`、`tests/unit/t274-amadeus-mirror-state-codec.test.ts:58` / `:341`。

### verbatim 断片(`cid:requirements-analysis:verbatim-quote-with-cite`)

- `packages/framework/core/tools/amadeus-election-store.ts:80`: `    return ok(JSON.parse(text) as T);`
- `packages/framework/core/tools/amadeus-state.ts:248`: `` `Mirror Boundary Receipts has duplicate phase "${phase}"` ``
- `tests/unit/t274-amadeus-mirror-state-codec.test.ts:58`: `  test("round-trip: render -> parse -> equal snapshot", () => {`
- `tests/unit/t274-amadeus-mirror-state-codec.test.ts:341`: `describe("property: arbitrary surrounding bytes round-trip", () => {`
- `tests/unit/t204-audit-escape.pbt.test.ts:41`: `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };`
- `tests/callsite-guard.ts:21-22`: `// WHY COUNTS AND NOT LINE PINS. An allowlist of file:line identifiers goes` / `// stale the moment an unrelated edit shifts a file, and every later PR then`
- `tests/callsite-guard.ts:4`: `// WHAT THIS IS. A deterministic shrink-only ratchet over the legacy audit and`

## 4 境界の seam ペア(observed 実測)

| 境界 | 書き手 | 読み手 | 読み側の検査 | 既存 PBT |
| --- | --- | --- | --- | --- |
| mirror | `amadeus-mirror-state-codec.ts:1898` `renderMirrorStateJson` / `:1927` `renderMirrorStateBlock` | `:1666` `parseMirrorStateDocument`(`:1695` で `:153` `parseJsonStrict` を適用) | あり | 半分(`t274:58` は example-based、property は `:341` の周辺バイト保存のみ) |
| state(構造フィールド) | `amadeus-state.ts:278` `serializeMirrorBoundaryReceipts`(正規化書き手 — `:225` `MIRROR_BOUNDARY_PHASES` 順へ並べ替え) | `:239` `parseMirrorBoundaryReceipts` | あり(`:248` 重複 phase / `:257` 不正 JSON / `:261` 非オブジェクト / `:266` 未知 phase / `:270` 不正 status を throw) | なし |
| state(テキストフィールド) | `amadeus-lib.ts:5237` `setField`(フィールド不在で無変更返却 = サイレント no-op)/ `:5271` `setFieldStrict`(同状況で throw) | `:5179` `getField`(値を `.trim()` して返す) | 実質なし | なし |
| audit | `amadeus-audit.ts:360` `escapeAuditValue` | `:367` `unescapeAuditBody` | 可逆符号化(検査ではない) | あり(`t204` P-AE1、`t352`、`t364`) |
| election | `amadeus-election-store.ts:60` `writeStoreFile`(tmp→rename) | `:71` `readJson<T>`(`:80` 無検査キャスト)、`:503-510` `Store.load` | **なし** | なし |

### 発行側のみがバリデータを通る非対称

測定: `grep -rn "Election\.parse|Ballot\.parse" packages/framework/core/tools/ scripts/` → 発行側 2 件(`amadeus-election.ts:310` / `:433`)、消費側(status / tally / verify)0 件。

#1459 が `amadeus-election-model.ts` へ入れた硬化は `:65` `hasDuplicates` / `:77` 空 choices 拒否 / `:96` 重複 internalNo 拒否 / `:109` 重複 voter 拒否 で、いずれもディスク読み戻し経路(`Store.load` → `readJson`)を通らない。

## 既存 PBT 棚卸し

測定: `grep -rln "fast-check" tests/` = **10 パス**(内訳: `tests/unit` 7 / `tests/integration` 1 / `tests/helpers` 2、observed `9750f8aea`)。

| パス | 領域 |
| --- | --- |
| `tests/unit/setup-semver.pbt.test.ts` | setup(#697、canonical PBT 規約定義) |
| `tests/unit/setup-manifest.pbt.test.ts` | setup(#697) |
| `tests/unit/setup-plan-decisions.test.ts` | setup(#697) |
| `tests/unit/t204-audit-escape.pbt.test.ts` | audit(#697 Phase B B4、P-AE1 条件付き round-trip) |
| `tests/unit/t352-journal-codec.pbt.test.ts` | journal |
| `tests/integration/t364-journal-v2.pbt.test.ts` | journal(バイト水準) |
| `tests/unit/t274-amadeus-mirror-state-codec.test.ts` | mirror(`.pbt.` 命名でない) |
| `tests/unit/t275-amadeus-mirror-state-reducer.test.ts` | mirror reducer(`:373` に property、`.pbt.` 命名でない) |
| `tests/helpers/arbitraries/manifest.ts` | arbitrary ヘルパ |
| `tests/helpers/arbitraries/semver.ts` | arbitrary ヘルパ |

**手法メモ(後続検証者向け)**: `.pbt.` 命名でのファイル探索は `t274` / `t275` を取りこぼし「mirror に PBT なし」という偽の不在主張を作る。棚卸しは `grep -rln "fast-check" tests/` で行う。`grep -rlin "round-trip" tests/` は coverage-registry / patch-allowlist をヒットさせるため `tests/unit/` `tests/integration/` に限定する。

state / election 領域(`t234-election-model.test.ts` / `t235-election-store.integration.test.ts` / `t238-election-record.test.ts` および amadeus-state 系テスト)の fast-check 使用は 0 件。

### PBT 実装規約の現況

- 固定 seed: `t204:38` `const PBT_SEED = 0xa0_d17;` / `t352:25` `= 16280702` / `t364:41` `= 26072903`。`numRuns` は fast-check 既定(100)
- 深掘り階層: `AMADEUS_PBT_DEEP=1` の実装は `setup-semver.pbt` / `setup-manifest.pbt` / `setup-plan-decisions` / `t204-audit-escape.pbt` の 4 ファイルのみ(`grep -n "AMADEUS_PBT_DEEP" tests/unit/*.ts tests/integration/*.ts` の全数)。`t352` / `t364` / `t274` / `t275` は固定 seed のみ
- import 面の 2 流儀: dist 出荷コピー = `t204:35` / `t352:23` / `t364:39`(`"../../dist/claude/.claude/tools/..."`)、core 正本 = `t274:13`/`:22` / `t275:13`/`:19`(`"../../packages/framework/core/tools/..."`)
- 実行到達: `tests/run-tests.ts:117` が `--ci` = `smoke + unit + integration` を宣言

## 静的ガードの候補母集団

単一行形の無検査キャスト: `packages/framework/core/tools/*.ts` に **8 箇所 / 5 ファイル**(測定: `grep -rnE "JSON\.parse\([^)]*\) as " packages/framework/core/tools/*.ts`、observed `9750f8aea`)。

| ファイル:行 | 断片 |
| --- | --- |
| `amadeus-election-store.ts:80` | `return ok(JSON.parse(text) as T);` |
| `amadeus-graph.ts:2004` | `parsed = JSON.parse(raw) as typeof parsed;` |
| `amadeus-graph.ts:2523` | `const parsed = JSON.parse(gridOnDisk) as ScopeGrid;` |
| `amadeus-includes.ts:80` | `const json = JSON.parse(raw) as { resources?: unknown };` |
| `amadeus-lib.ts:849` | `const parsed = JSON.parse(output) as unknown;` |
| `amadeus-plugin-compose.ts:1302` | `const raw = JSON.parse(text) as { plugins?: Record<string, DropEntry[]> };` |
| `amadeus-plugin-compose.ts:1423` | `const o = JSON.parse(text) as { ledger: [string, Json][]; plugins: [string, Json][] };` |
| `amadeus-plugin-compose.ts:1479` | `const o = JSON.parse(text) as Record<string, unknown>;` |

**限界の明記**: 上記は単一行の正規表現による測定であり、複数行にまたがる形は捕捉しない。ガード実装時は AST 相当の走査か、複数行形の別途棚卸しが要る。本 intent の患部は 4 境界に限られるため 8 箇所全部が是正対象ではなく、`amadeus-election-store.ts:80` が患部、他は allowlist 初期値の候補である。

先例は `tests/callsite-guard.ts`(shrink-only allowlist ratchet、`tests/complexity-gate.ts` 様式)。file:line ピンではなく `(file, symbol)` 単位のカウントで単調減少性を保つ設計理由が同ファイルヘッダに明記されている(`cid:code-generation:allowlist-line-pin-stale`)。

## 本 intent の実対象(クロスレビュー是正済み本文の確定線引き)

- **必須(新規)**: state / election の各 1 境界以上に round-trip PBT + fail-closed プロパティ
- **mirror / audit**: 既存被覆の外側のみ(`t274:58` の render→parse を property 化 + 妥当 snapshot の arbitrary は「外側」に含む)
- 構造面: 発行⇔消費が同一バリデータを食う構造への収斂 + 読み側 fail-closed 化。4 境界とも既に core 内にあるため移設ではなく一本化、適用単位は境界ごと(4 境界を貫く単一の汎用バリデータは作らない)
- 静的ガード: 共有バリデータ非経由の読み戻し経路を検出する allowlist ratchet。落ちる実証必須
- 既知バグ再現候補: **#1459**(読み戻し経路の無検査キャストが現行で露出しているため pre-fix 面切替不要)/ **#1547**(CLOSED のため pre-fix 面切替が要る — `cid:code-generation:falling-proof-no-stash` に従い fix コミット後に対象ファイルのみ checkout で切替、stash は使わない)。**#1904 は round-trip の射程外**(消費側 env 述語の非対称で直列化を伴わない)につき候補から除外
- 投影コスト: core/tools 改修 → dist 7 ハーネス再生成 + `dist:check` / `promote:self:check` + coverage patch 母集団入り(spawn 盲点 → in-process seam 設計を実装時点で行う)+ `t258-boundary-guard`。テストは dist へ投影されない(`find dist -type d -name tests` / `find dist -name "*.test.ts"` ともに 0 件、observed 実測)
- import 面: dist 出荷コピー import と core 正本 import の 2 流儀に割れているため、新規分の統一方針を設計段で確定して成果物に明記する

## 設計段への申し送り(プロパティ設計上の落とし穴)

1. **state 構造フィールドの round-trip は「正規化後の同値」で張る** — 書き手 `serializeMirrorBoundaryReceipts` が phase 順を正規化するため、キー順が自由な生テキストに対する `serialize ∘ parse = id` は成立しない(偽の赤になる)。受理ドメイン上の `parse ∘ serialize = id` を使う
2. **state テキストフィールドの round-trip は trim 込み・フィールド存在前提の条件付き同値でしか成立しない** — `getField` が `.trim()` する、`setField` はフィールド不在でサイレント no-op(`setFieldStrict` は throw)
3. **round-trip 単独ではバリデータ自身の欠陥が恒真化する** — 発行⇔消費が同一バリデータを共有する構造へ収斂させた後は、述語の検証を fail-closed プロパティで別に張る
4. **fail-closed プロパティで棄却規則をテスト側に再実装しない** — オラクル相殺(`cid:build-and-test:pbt-oracle-cancellation`)に落ちる。arbitrary は非適合入力の生成に徹し、判定は被検バリデータ自身へ委ねる
5. crash-consistency(`writeStoreFile` の tmp→rename に対する読み側耐性)は本 intent では将来課題として記録のみ
