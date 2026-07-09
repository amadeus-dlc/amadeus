# Developer スキャン — 260709-pbt-small-band (#697 / #684 Phase B)

> reverse-engineering (2.1) の Developer スキャン成果物。Architect が合成・最終化する。
> file:line はすべて実コード照合。推測は「推定」と明記。

## スキャン契約メタ (#707 新契約の初運用)

- **base**: `none`。`amadeus/spaces/default/codekb/amadeus/re-scans/` は存在せず(`ls` で不在確認)、他 intent レコードにも re-scan 記録が皆無のため、新契約の「最新 observed が皆無なら none」に該当。
- **observed (現 HEAD)**: `9a2f5c7205795a255f258628710820def2ab3f8c`(`git rev-parse HEAD` 実測)
- **prior codekb 本文**: `codekb/amadeus/`(observed `162553b99` 時点)を prior として利用。
- **162553b99..HEAD 差分の焦点影響**: `git diff --name-status` で4修正相当を確認。焦点領域(`packages/setup/**`、`tests/unit/setup-*`、`tests/lib/test-size.ts`、`amadeus-audit.ts`)への**変更はゼロ**。差分は framework 側(reverse-engineering.md ステージ・mint-presence フック・re-artifacts ナレッジ・amadeus-lib/utility・CI・release-sync・codecov.yml・新テスト t203/t-release-sync 系)に限局。よって焦点領域は prior codekb がそのまま有効で、本スキャンは実コード直読で足りる。

## 焦点領域 1 — packages/setup ドメイン型

対象は class-free / type+コンパニオン namespace / ブランド型+スマートコンストラクタ / 判別ユニオン Result スタイル(project.md の DECIDED スタイル)で書かれており、PBT との親和性が高い。

### 1a. semver.ts — PBT 第一候補(spawn/FS ゼロ)

- `packages/setup/src/domain/semver.ts:16` `SEMVER_PATTERN`(`^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$`、"v" 前置は任意で正規化)
- `:19-28` `SemVer.parse` — スマートコンストラクタ。`Result<SemVer, VersionError>`。無効入力は `VersionError.invalidFormat`
- `:30-37` `SemVer.latestStableOf` — prerelease 除外(BR-F02)で `isLaterThan` 最大を返す
- 比較律の実体は `packages/setup/src/internal/semver-factory.ts:15-27`:
  - `isLaterThan:15-21` 数値順序(major→minor→patch、等値は false)— BR-F03「v1.10.0 > v1.9.0」
  - `equals:22-24`、`isStable:12-14`(prerelease===null)、`format:25-27`
- 依存: `node:fs`/`child_process`/`net` いずれも不使用。**純関数**。

**PBT プロパティ候補**(generator は `SemVer.parse` を通す=ブランド型を破らない、#688 生成器所有権規約と整合):
- roundtrip: 任意の stable な `major.minor.patch` に対し `parse(format(v))` が同値(`equals`)
- "v" 前置正規化の冪等: `parse("v"+s).equals(parse(s))`
- `isLaterThan` の狭義全順序: 非反射(`v.isLaterThan(v)===false`、既存 test:73 が例示)・非対称・推移。ただし現実装は**同 major.minor.patch では prerelease 順序を比較しない**(factory:20 コメント「out of scope」)ため、prerelease 違いの2値は互いに `isLaterThan===false`=同順位。プロパティは stable 同士に閉じるか、この同順位を明示的に許容する形で書く必要がある(**推定**: prerelease を跨ぐ全順序を主張すると反例が出る)
- `latestStableOf(list)` は list 内 stable 集合の `isLaterThan` 最大に一致し、stable 皆無なら `undefined`

### 1b. version-spec.ts — SemVer.parse に閉じる smart constructor

- `packages/setup/src/domain/version-spec.ts:11-21`。`VersionSpec.latest()`(:12)と `VersionSpec.exact(raw)`(:16-20、`SemVer.parse` に委譲しエラー型を継承)
- `admits(candidate)`/`describe()` を持つ(型 `:5-9`)。純関数。
- PBT: `exact(raw)` の成否が `SemVer.parse(raw)` の成否と常に一致(委譲不変)。`admits` は exact なら等値判定・latest なら常に真(**推定**: 実装は `version-spec-factory.ts` 未読、Architect 合成前に確認推奨)。

### 1c. manifest.ts — roundtrip + 重複 path 不変条件(FS ゼロ、PBT 向き)

- `packages/setup/src/domain/manifest.ts:28-37` `ManifestFiles.fromEntries` — 重複 path で `ManifestError.duplicatePath`(`:31-34` `Set` 走査)。**不変条件 PBT**: 任意のエントリ列で、path が全ユニークなら ok、1つでも重複すれば err。
- `:23-26` `dispositionFor(path, actualMd5)` — FR-008 Tell-Don't-Ask(owned→overwrite / shared は md5 一致で overwrite・不一致で backup-then-copy / user-preserved→preserve)。純関数、既存 test(setup-manifest.test.ts:38-64)は example-based。
- `:77-92` `Manifest.build` / `:125-187` `parseManifestJson`(Parse-Don't-Validate を JSON 境界で実施、BR-F12)/ `toJSON`(型 `:53-61`)。**roundtrip PBT**: `build(...).toJSON()` を `parse` すると同値(既存 test:66-79 が1例のみ固定)。生成器はスキーマ準拠 JSON と、フィールド欠落/型違い/未知 harness/schemaVersion≠1 の否定系を網羅できる。
- FS/spawn 不使用。**純関数**。

### 1d. plan.ts — FS 依存。純判定 seam のみ抽出(全体 Small 化しない)

FS 使用箇所(実測):
- `plan.ts:235-249` `walkFiles` — `readdirSync`/`statSync`(`:238`,`:240`)
- `:256-270` `md5OfFileSync` — `openSync`/`readSync`/`closeSync`(`:258`,`:262`,`:267`)
- `:145` `buildEntries`・`:181` `buildUpgradeEntries` — `existsSync`
- import 元 `:2` `node:fs` から6 API

**抽出候補の純判定 seam(現状すべて private、未 export)**:
- `:227-233` `classify(relPath): FileClass` — basename が `amadeus-` 前置→owned / セグメントに `memory`→user-preserved / それ以外→shared。**純**(文字列のみ)
- `:162-168` `classifyAction(exists, force, cls): PlanAction` — install 側の add/conflict/update/skip/backup 分岐。**純**(bool/bool/enum)
- `:209-218` `toPlanAction(disposition): PlanAction` — upgrade 側の Disposition→PlanAction 写像(BR-U10)。**純**(判別ユニオン)

**seam 抽出の難易度: 低**。3関数はいずれもプリミティブ/enum/判別ユニオンのみを引数に取り、FS も this も掴まない。`Plan` namespace 配下に export(例: `Plan.classifyPath` / `Plan.actionForInstall` / `Plan.actionForDisposition`)するか、`plan-classify.ts` へ切り出せば、`buildEntries`/`buildUpgradeEntries` は FS 走査+seam 呼び出しに縮む(surgical、既存 API 契約は不変)。**トレードオフ**: seam を public 化すると `plan.ts` の公開面が広がる。Architect は「ドメイン API を汚さない sub-namespace か internal 併置か」を functional-design で確定する必要あり。
- FS を伴う `buildEntries`/`buildUpgradeEntries`/`walkFiles`/`md5OfFileSync` は medium のまま(in-process 化しない)。

**PBT プロパティ候補**:
- `classify`: `amadeus-` 前置は必ず owned(パスの他セグメントに依らず);`memory/` 配下の非 `amadeus-*` は必ず user-preserved
- `classifyAction`: `exists===false` なら常に add;`exists && !force` なら常に conflict;`force` 時は cls により update/skip/backup に MECE 分岐(全域性=どの入力でも5アクションのいずれか)
- `toPlanAction`: Disposition 3 変種の全域写像(overwrite→update / backup-then-copy→backup / preserve→skip)、未定義入力なし

## 焦点領域 2 — 既存テストの in-process 化の距離

| テスト | size 注釈 | 依存 | in-process 化の距離 |
|---|---|---|---|
| `tests/unit/setup-semver.test.ts:2` | `// size: small` | domain 直 import、FS/spawn なし | **ゼロ(既に Small)**。PBT を追記するだけ |
| `tests/unit/setup-manifest.test.ts:2` | `// size: small` | domain 直 import + fixtures lib | **ゼロ(既に Small)**。roundtrip/重複 PBT を追記 |
| `tests/unit/setup-plan.test.ts:1-2` | **注釈なし** | `mkdtempSync`/`writeFileSync`/`rmSync`(`:10`,`:29-37`)=実 FS | 派生 medium。seam 抽出後に別ファイル(Small)で `classify`/`classifyAction`/`toPlanAction` を in-process テスト。既存 FS 統合テストは medium のまま残す |

### 監査エスケープ(t111 + amadeus-audit.ts)

- 実装: `packages/framework/core/tools/amadeus-audit.ts:295` `const safeValue = String(value).replace(/\r?\n/g, "\\n");`(セルフインストール鏡像 `.claude/tools/amadeus-audit.ts:295` も同一)。`:287-298` `appendAuditEntry` の**インライン**処理で、独立関数として export されていない。
- 既存テスト: `tests/unit/t111.test.ts:227-270` — example-based。CR/LF→`\n` 1文字化(`:246-247`)、CRLF→単一 `\n`・lone CR は素通し(`:258-274`、正規表現 `/\r?\n/` の両半分をピン留め)。
- **PBT プロパティ候補**: 任意文字列 `value` に対し、`escape(value)` は物理改行を含まず(=偽造 `**Event**:` ブロックを開けない)、`\n`/`\r\n` は `\\n` に、lone CR は保存。これは #688 が挙げた「監査ブロックのエスケープ不変条件」に対応。
- **難易度: 低〜中**。エスケープを純関数として export する必要あり(現状 `appendAuditEntry` 内インライン)。ただし `amadeus-audit.ts` は framework core であり、`core/` 編集→`bun scripts/package.ts`(dist 再生成)+`bun run promote:self`(セルフインストール昇格)を**同一コミット**に含める Mandated 制約が効く(setup 配下と違い波及が広い)。t111 自体は `appendFileSync` を使うため派生 medium で、Small 化には escape 関数を独立ファイルへ切り出して純テストする形が要る。**#697 の第1弾スコープに含めるかは Bolt 粒度の判断事項**(setup ドメインより波及コスト大)。

## 焦点領域 3 — #700 / #696 の size 土台

- 分類器: `tests/lib/test-size.ts` が単一のソースオブトゥルース。
  - `classifyTestSize(source):49-62` — 静的シグナル proxy(`SIGNAL_PATTERNS:35-40`: network→large / spawn・filesystem・timer→medium)。コメント除去後に正規表現マッチ。Phase A は動的観測ではなく静的近似(`:9-14`)。
  - `parseSizeAnnotation(source):74-86` — 先頭 ~40 行の `// size:` ヘッダを読む。
  - `SIZE_ORDER:28`(small<medium<large)。
- レポート: `tests/run-tests.ts:891-947` `printSizeMatrix` — scope×size 行列と `size-annotated files: N/total` を出力。**非ゲート**(`:894`「it does not gate」)。
- ドリフトガード: `tests/unit/t-test-size-drift.test.ts`。契約は「**宣言 size が計測 size より小さい**ときのみ CI 失敗」(`test-size.ts:17-21`)。注釈=約束、分類器=検査。注釈なしは計測が権威で失敗なし。
- **現状の実測**:
  - `// size: small` ヘッダを持つファイル: **28**(`grep -rl "// size: small" tests/`)。task 記載「28/339」の 28 と一致(annotated small)。
  - codex-3 レビュー計測(#697 コメント): unit 141 中 **派生 Small 23 / Medium 118**。annotated(28)と derived(23)が食い違うのは、annotation が計測値以上を宣言しても drift ガードは咎めない(宣言≥計測は許容)ためで正常。
- **Small band を育てる機構**: 新規 Small テスト(seam + PBT)を注釈付きで追加すると annotated small が増える。第一里程標 Small≥90 は milestone であり個別 PR の hard gate ではない(#697 本文)。

## 焦点領域 4 — fast-check 統合の設計材料

- **現状**: fast-check はリポジトリ内に**一切存在しない**(`grep -rn fast-check` 該当ゼロ、`package.json:28-34` devDependencies に不在)。
- **依存追加位置**: ルート `package.json` の `devDependencies`(現在: claude-agent-sdk / xterm-headless / bun-types / node-pty / release-it / typescript)。新設 `packages/*` ではないためパッケージ別 CI 配線ルールの対象外だが、runtime dependency ではなく devDependency である点を明記(project.md Forbidden「runtime 依存追加は Bun-only 前提の変更根拠を要す」に抵触しない)。
- **lint/typecheck 面**: `package.json:18` lint スコープは `tests/ packages/setup/`。PBT を `tests/unit/setup-*` 配下に置けば既存 lint スコープ内。`:17` typecheck は `tsconfig.json` + `tsconfig.tests.json` の2構成。
- **bun test との統合**: `import fc from "fast-check"` → `fc.assert(fc.property(arb, pred), { numRuns, seed })`。ランナーは `tests/run-tests.ts` が各ファイルを `bun test <file> --coverage` で spawn(後述 focus 5)。
- **#688 で確定した実装に効く決定**(コメント実読):
  1. **分類**: PBT は Developer Testing に軸足。置き場所=既存 unit スイート内。QA 的深掘り(高 numRuns)は**新規 CI ジョブを作らず既存 `--release` テスト層**(`run-tests.ts:69` smoke+unit+integration+e2e)に接続。
  2. **numRuns 層別**: 通常 CI = 既定(秒単位、~低)/ release 層 = 高 numRuns。予算は #684 の size 軸と同じ表で定義(タイムアウト由来の根拠強制)。
  3. **固定シード / 再現性**: 失敗時 fast-check の seed + counterexample を CI ログへ必ず出力。
  4. **シュリンク反例のピン留め**: プロパティが見つけた shrink 済み具体値を example-based の回帰テストとしてコミット(flaky 化回避、検証劇場 Forbidden の実効化)。
  5. **生成器の所有権**: arbitrary はドメイン型のコンパニオン(スマートコンストラクタ)の隣に置く規約。**ブランド型を破って生成しない**(=`SemVer.parse`/`ManifestFiles.fromEntries` 等を通す)。破ると「表現不能なはずの無効状態」をテストが再導入し parse-don't-validate と矛盾。
  6. **第1弾スコープの絞り込み**(claude-engineer-2 レビュー): 「fast-check 導入 + semver/detect の2対象 + シード運用規約」に限定し、tar/manifest/パス解決は #678 等の修正 Bolt に随伴。→ **#697 では semver を確実に、manifest/plan-seam/audit-escape は Bolt 粒度で取捨**を Architect/delivery が判断。

## 焦点領域 5 — coverage と in-process seam

- 機構(実測): `tests/run-tests.ts` は各テストファイルを `runSpawnCapture(BUN, ["test", file, "--coverage", "--coverage-reporter=lcov", ...])`(`:734` 付近)で**別プロセス spawn** し LCOV を結合(`:748-750`)。
- 帰結: coverage はその test プロセス内でロードされたコードのみ instrument する。テストが**さらに subprocess を spawn**(例: CLI を spawnSync で叩く統合テスト)しても、その subprocess 内で実行されたドメインロジックは**計測されない**。
- したがって semver/manifest/plan-seam/audit-escape を**純関数として in-process で直 import してテスト**すれば、実行がその instrument 対象プロセス内で起き、coverage に計上される。plan.ts の seam を private のまま FS 統合テスト経由でしか叩かないと、seam のロジックは(同プロセス内なので計上はされるが)FS I/O と混ざり Small band に載らない — **seam を export して in-process Small テストを追加する設計が、Small band 育成と coverage 計上の両方に効く**。
- **注意(推定)**: task が参照する「bun --coverage は spawn サブプロセス非計測 → in-process seam」の Corrections を `amadeus/spaces/default/memory/*.md` に grep したが**該当エントリは未検出**。上記は `run-tests.ts` の spawn ベース実行から導いた機構説明であり、memory 層の成文 Correction としては未反映の可能性がある(Architect 合成時に memory 追記の要否を判断)。

## re-scans 記録の下書き(Architect 最終化用)

```
## 260709-pbt-small-band
- base: none            # re-scans/ 空、他 intent にも観測なし(#707 新契約)
- observed: 9a2f5c7205795a255f258628710820def2ab3f8c   # git rev-parse HEAD 実測
- focus:
    - packages/setup/src/domain/{semver,version-spec,manifest,plan}.ts
    - packages/setup/src/internal/semver-factory.ts
    - tests/unit/{setup-semver,setup-manifest,setup-plan}.test.ts
    - tests/lib/test-size.ts / tests/run-tests.ts(printSizeMatrix)
    - tests/unit/t-test-size-drift.test.ts
    - tests/unit/t111.test.ts:227-270 / core/tools/amadeus-audit.ts:295
    - package.json(devDependencies / lint / typecheck / --release)
- 162553b99..HEAD が焦点領域に触れず(framework/CI/release-sync のみ)= prior codekb 有効
```

## Architect への引き継ぎ要点

1. **確実な第1弾 PBT 対象は semver**(既に Small・FS ゼロ・比較律が明快)。version-spec は semver 委譲不変を1プロパティで足す。
2. **plan は全体 Small 化しない**。`classify`/`classifyAction`/`toPlanAction`(private:227/162/209)の export 方式(sub-namespace か internal 併置)を functional-design で決める。難易度低・surgical。
3. **manifest roundtrip / 重複 path** は既存 Small テストへの PBT 追記で完結(新規 FS 不要)。
4. **audit-escape PBT は波及コスト大**(framework core → dist 再生成 + promote:self 同一コミット必須)。#697 第1弾に含めるか Bolt 粒度で要判断。
5. **fast-check は devDependency 追加のみ**(新設 package ではない)。numRuns 層別・seed 出力・反例ピン留め・生成器のコンパニオン併置=#688 確定事項をそのまま実装契約に落とす。
6. **coverage の Corrections 成文化**(focus 5)の要否を memory 追記として検討。
