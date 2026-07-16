# RE スキャン記録 — 260715-opencode-cursor-harness

## 実行メタデータ

- **base**: `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`(前 intent 260713-swarm-driver-migration の observed。HEAD 祖先の observed のうち距離最小=65。E-L63)
- **observed**: `6a23b0ec2498915532ab40930f82cc7744aa15b7`(`git rev-parse HEAD` 実測)
- **base..observed コミット数**: 65
- **祖先性判定**: `git merge-base --is-ancestor cf3dc88 HEAD` → exit 0(祖先で採用可)
- **source 面等価性**: `git diff --stat origin/main HEAD -- ':!amadeus/'` = 空(HEAD と origin/main の差は record コミットのみ、source 面完全一致)
- **手法**: diff-refresh(cid:reverse-engineering:c1)。フォーカス面は observed HEAD 実コード直読で file:line 確定。真実源は本ファイルと `inception/reverse-engineering/scan-notes.md`。
- **intent 目的**: opencode / Cursor harness port(Issue #626)。既存 packaging seam のハーネス開放性を確定し、新ハーネス2種を最小差分で追加する。

## base 決定の実測根拠(E-L63)

`re-scans/*.md` 全 observed について HEAD 祖先性(`git merge-base --is-ancestor`)+ 距離(`git rev-list --count <sha>..HEAD`)を走査し、HEAD 祖先のうち距離最小=`cf3dc88`(距離65)を採用。base は本ファイル冒頭のとおり祖先性 exit 0 で確定。前 intent 260713 の observed がそのまま採用され、非祖先(squash 別 SHA)は候補から除外する E-L63 手続きに従った。

## 並行 intent 260709(canonical-settings)との調整

- 並行 intent 260709(canonical-settings)の scan 成果物は **PR #1011 未着地**(本ツリー未反映)。その scan の observed は `e55cc25143717d84b3e7f1a543151f0b7c99b96f`(260709-canonical-settings の record checkpoint コミット)。
- **区間整合の実測**:
  - `git merge-base --is-ancestor e55cc25 HEAD` → **NO**(e55cc25 は HEAD 非祖先。260709 の record ブランチ上のコミットで本 diff 区間には乗らない)。
  - `git diff --stat e55cc25 b67b329f9 -- ':!amadeus/'` = **空** → e55cc25 の source 面は `b67b329f9`(#1008 metrics snapshot)と等価。e55cc25↔b67b329f9 の差分は `amadeus/` の audit shard 1ファイルのみ(`git diff --name-only e55cc25 b67b329f9`)。
  - `b67b329f9` は base..HEAD 区間内(cf3dc88..6a23b0ec の65コミットに含まれる)。main 前進は本 intent の approval-handoff record checkpoint(#1010、`6a23b0ec` = memory/record 層のみで source 非改変)。
  - 含意: 260709 の scan が観測した source 面(e55cc25 相当)は、本スキャンの区間 `cf3dc88..b67b329f9` で自分で直読した面と同一実体。260709 の「packaging 面の構造不変」結論を鵜呑みにせず、フォーカス面ファイルを本スキャンで独立に直読して裏付けた(scan-notes フォーカス面8)。
- **read-only 参照**: 260709 の scan-notes / codekb 差分は read-only 参照に留めた(隔離規律)。
- **union 解消時の降格・アンカー衝突注意(shared-ledger-insert-collision)**: 並行 intent 260709 の PR #1011 は `code-structure.md` **冒頭(H1 直後)** に「canonical settings 観測面(…最新)」節を追加する予定。本 intent も同じ H1 直後に「harness port 開放性の観測面(…最新)」節を追加した。record-sync PR の union 解消時に:
  1. 同一アンカー行(H1 `# コード構造` 直後)への二重挿入で textual conflict になる。両節を時系列で並べる union 解消を行う。
  2. 後着地側は自節を「最新」のまま、先着地側の「最新」を「履歴」へ降格する(c3-relabel。同時に「最新」を名乗る節が2つ並ぶ状態を作らない)。
  3. `reverse-engineering-timestamp.md` の冒頭「最新」メタデータも同様に、後着地 intent が先着地の「最新」→「履歴」を降格する。

## フォーカス面(ハーネス開放性の現存確認)

open-set(自動発見)3層:
- build ターゲット発見 `discoverHarnessNames()`(`scripts/package.ts:68-73`)= `harness/` を readdirSync し `manifest.ts` 持ちの dir のみ返す(ハードコードなし、:63-67 コメント)。既定ターゲット :764、manifest フィルタ :769。
- runtime 解決 `harness.json`(`{harnessDir, rulesSubdir}`、`package.ts:438` writeHarnessData 生成)が権威。`amadeus-lib.ts:114` KNOWN_HARNESS_DIRS / `:170-172` KNOWN_RULES_SUBDIR は test-seam/fallback 専用(:109-114,:162-168)。
- skills 生成 runner-gen(`amadeus-runner-gen.ts:60,63`、出力先=`<harnessDir>/skills/`)。`skipRunnerGen`(`manifest-types.ts:119`)を true にすると codex 同様 emit で `.agents/skills/` へ自前生成。

HarnessManifest 契約(`scripts/manifest-types.ts:79-122`)全12フィールド: name:81 / harnessDir:83 / coreDirs:85 / harnessFiles:87 / frontmatterAdditions:101 / onboarding:106 / rulesRename:108 / authoredExempt:110 / skipRunnerGen:119 / emit:121。

閉じ列挙(手動追記)9ファイル台帳:
- installer 5必須(正しさ): harness.ts:9(union)/:19-24(all) ・ engine-layout.ts:8-12(ENGINE_DIR_BY_HARNESS)・ reporter.ts:24-25,137 ・ setup-harness.test.ts:13(契約テスト)
- runtime/advisory 2: amadeus-lib.ts:114,170-172(test-seam)・ amadeus-utility.ts:857(otherTrees)/:2000-2006(SCAN_EXCLUDE)/:696(doctor .claude 分岐)
- migration 1: amadeus-migrate.ts:71(INSTALLED_HARNESS_DIRS、ほか :383/:843/:1459/:2514)
- self-install 1: promote-self.ts:37-41(managedDirs)/:313-319(build 呼び出し)

promote:self: managedDirs は claude+codex ハードコード(:37-41)、build 呼び出しも明示ハードコード(:313-319)。新ハーネス非自動対応。dogfood 不要なら編集不要(dist 配布は package.ts discover で成立)。

version/doctor: `handleVersion`(:243-245)harness 非依存。`handleDoctor`(:676)は `:696` `if (harness === ".claude")` 専用ブロック + 汎用経路。新ハーネスは advisory 劣化(otherTrees/SCAN_EXCLUDE 非列挙)のみで動作、正しさ非影響。

## diff 実測(base→observed、フォーカス面)

| ファイル | 区間内変更 |
|---|---|
| `scripts/package.ts` | なし(discover/buildTree/checkHarness 契約不変) |
| `scripts/manifest-types.ts` | なし |
| `packages/framework/core/tools/amadeus-runner-gen.ts` | なし |
| `packages/setup/src/domain/harness.ts` | なし(閉じ列挙は base 時点のまま) |
| `scripts/promote-self.ts` | M(+30/-7、contributor skills projection 追加。**managedDirs のハーネス集合は不変**) |
| `packages/framework/core/tools/amadeus-utility.ts` | M(`handleDoctor` を export 化=in-process seam。ハーネス依存ロジック不変) |
| `packages/framework/core/tools/amadeus-lib.ts` | M(tool パス検査リストに .codex/.kiro tool 追記。harnessDir/rulesSubdir 解決 seam 不変) |
| `README.md` / `docs/` | 軽微更新はあり得るが対応ハーネス列挙(4)は不変 |

区間65コミットは packaging seam のハーネス開放性(discover ベース)を一切変えていない。本 intent は base 時点の設計を現 HEAD でそのまま踏襲してよい(scan-notes フォーカス面8で並行 intent 260709 の「構造不変」結論を独立に裏付け)。

## CodeKB 更新表

| 成果物 | 更新 | 内容 |
|---|---|---|
| `code-structure.md` | 追記+relabel | 「harness port 開放性の観測面(…最新)」節を H1 直後に新設。旧「swarm driver 変更面の配置境界」節の「最新」→「履歴」降格(c3-relabel) |
| `reverse-engineering-timestamp.md` | 追記+relabel | 「最新: 260715-opencode-cursor-harness」メタデータを先頭新設。旧「最新: 260713」→「履歴」ラベル化 |
| `re-scans/260715-opencode-cursor-harness.md` | 新規 | 本ファイル |

## 温存判断(churn 回避、cid:reverse-engineering:c1)

architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment の**7点は温存**。判定根拠: base→observed の区間65コミットで本 intent 観測面(packaging 開放性・閉じ列挙・doctor/version 依存性)のファイルは契約不変(フォーカス面8実測)であり、新ハーネス port は構造追加を伴うが本スキャン時点では設計未確定(application-design で確定)。挙動欠陥・構造変化を伴わないため body 成果物への追記は churn。

## 未解決ギャップ(設計判断へ持ち越し)

1. **installer 閉じ列挙の扱い**: install コマンドで opencode/Cursor を選択可能にするか(閉じ列挙5ファイル編集を本 intent スコープに含めるか)、配布(dist)のみに留めるか。
2. **promote:self 対象化の要否**: opencode/Cursor で amadeus 自身を dogfood 開発する必要があるか(managedDirs + build 呼び出し2箇所編集の要否)。
3. **Cursor hook seam / 探索規約**: opencode / Cursor の skills・agents・hooks 探索規約が `.claude` 型(薄 manifest)か `.agents/skills` 型(Codex emit.ts)か。manifest 系統・emit.ts 要否・rulesRename 要否を決める中核設計問い。application-design で確定する。
