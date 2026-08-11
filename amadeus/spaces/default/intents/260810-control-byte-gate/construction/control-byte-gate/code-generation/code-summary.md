# Code Summary — control-byte-gate(Issue #2814)

上流入力(consumes 全数): requirements.md(FR-CBG-1〜16 / NFR-1〜4 の受け入れ基準に対する実測の照合表を本書 §受け入れ照合で構成)、unit-of-work.md(U1 境界 = 本書が報告する変更面の範囲)、business-logic-model.md(7段フローと落ちる実証の運用ロジック — §落ちる実証の手順の導出元)、business-rules.md(BR-1〜11 — §契約適合の監査の照合軸)、domain-entities.md(型と不変条件 — `reason` 非空 assert と `scannedCount` 定義の是正根拠)、performance-design.md(30s 予算とコーパス規模前提 — §性能実測の対象)、security-design.md(allowlist 悪用耐性・書込ゼロ — §セキュリティ面の確認)。条件解決で除外された consumes: deployment-architecture(required:false)— self-feature スコープで infrastructure-design が SKIP のため不在(設計上の期待どおり)。

## 測定 ref

- 実装ブランチ: `bolt-control-byte-gate`、head `b5e514dd8`
- conductor ブランチ: `issue-2814-control-byte-gate`、`--no-ff` マージ後の HEAD(マージコミットの親数 2・`git ls-files -u` 0 件を機械確認)
- base: `cac41363a`(`origin/main` 断面)
- 実測日: 2026-08-11

## 変更面

**出荷断面**(正本 — マージコミット `cc775f87b`)。`git diff --stat cc775f87b~1 cc775f87b -- tests/ .github/` の出力からの転記:

| ファイル | 変更 |
|---|---|
| `tests/lib/control-byte.ts` | 新規 63 行 |
| `tests/control-byte-gate.ts` | 新規 246 行 |
| `tests/unit/t-control-byte-predicate.test.ts` | 新規 66 行 |
| `tests/integration/t-control-byte-gate.integration.test.ts` | 新規 381 行 |
| `.github/workflows/ci.yml` | +24 行(独立ジョブ `control-byte-gate`) |
| `tests/fixtures/formal-verif-ci-baseline.sha256` | 1 行更新(ci.yml のピン同期) |
| `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` | +8 行(同上) |

合計 7 files changed, 789 insertions(+), 1 deletion(-)。

コミット: `e7341b254`(実装本体)、`b5e514dd8`(allowlist assert・symlink 実測記録・CLI テスト拡充)、`5197a16af` / `901af89c8` / `4133e8cc0` / `a6496fd2c`(レビュー収束中の是正 — git launch 分岐の被覆、checkout 認証情報の非永続化、tracked パスのバイト保持、非 UTF-8 ケースの無音 skip 封鎖)。

> **測定 ref の訂正記録**: 本節は当初 bolt ブランチ head `b5e514dd8` を測定 ref とし 199 / 319 / 674 行と記載していた。その値は当該 ref では正しい(`git diff --stat cac41363a b5e514dd8 -- tests/ .github/` が逐語でそれを返す)が、その後 `5197a16af` 以降の収束コミット4件が積まれたため、出荷断面とは乖離していた。§12a レビュー iteration 1 の BLOCKER として捕捉され、出荷断面での再測定値へ差し替えた。

## 契約適合の監査(BR-1〜11)

conductor が BR を逐条照合した結果と是正:

| BR | 判定 | 根拠 |
|---|---|---|
| BR-1 列挙 fail-closed | 適合 | `gitTrackedFiles` が spawn error・非0 exit のいずれでも throw。部分列挙での続行経路なし |
| BR-2 検出集合 | 適合 | `isForbiddenControlByte` が `b<0x20 && b∉{09,0A,0D}` または `b==0x7F`。境界値 12 点を unit テストで固定 |
| BR-3 生バイトのみ | 適合(構造的) | 判定入力は `Uint8Array` のバイト値のみ。エスケープ表記は判定対象の形をとらない |
| BR-4 allowlist | **是正済み** | path 完全一致 skip・不在エントリの stale 送りは実装済みだったが、domain-entities.md が規定する `reason` 非空 assert が**不在**だった。`assertAllowlistWellFormed` を追加し load 時に throw、3 ケースをテストで固定 |
| BR-5 読取 fail-closed | 適合 | catch で `readErrors` へ集計、skip しない。integration テストで読取不能ファイルの exit 1 を固定 |
| BR-6 診断書式 | 適合 | `<path>: control byte 0x<HEX> at offset <10進>`。0x10 未満の2桁大文字 HEX をテストで固定。打ち切りなし |
| BR-7 exit 契約 | 適合 | 3集合の空判定から毎回導出。成功フラグのフィールドを持たない |
| BR-8 決定性 | 適合 | 時刻・env・ネットワーク参照なし。出力順は `git ls-files` の列挙順 |
| BR-9 依存 | 適合 | Bun 標準 API(`node:child_process` / `node:fs` / `node:path` / `node:url`)+ git spawn のみ。外部 grep 呼び出しゼロ |
| BR-10 canonical 参照 | 適合 | 述語ファイル冒頭に `isUtf8`(amadeus-migrate.ts:477)・`CONTROL_CHARS`(amadeus-lib.ts:4298)への出典参照と、CR 除外の意図的相違(ADR-3)を明文化 |
| BR-11 型の単一定義 | 適合 | `Violation` / `GateResult` は `tests/lib/control-byte.ts` の1定義。CLI・テストは import で共有 |

### symlink の実測確定(business-rules.md 例外節の実装時実測条項)

scratch リポジトリでの実測(2026-08-11): mode 120000 エントリに対し `git cat-file blob` と `readlink` は同一バイト列を返す一方、`readFileSync` はデリファレンス先の内容を返す。したがってゲートは `lstat` で symlink を判別し `readlink` の文字列を判定する — git が保持する blob と走査対象を一致させる実装を採る。現 tracked コーパスの symlink 件数は `git ls-files -s | awk '$1=="120000"'` で **0 件 / 16,651 エントリ**のため、この経路はリポジトリ実体ではなくテストで駆動される。

### `scannedCount` 定義の固定

`scannedCount` = 列挙件数 − allowlist 命中件数。読取に失敗したファイルも「走査を試みて失敗を報告した」ものとして含む(除外すると要約が実際に立った母集団を過小申告する)。この定義をコード内コメントで固定した。

## 落ちる実証(FR-CBG-9)

注入 → 赤 → 復元 → 残渣ゼロを不可分の1セットとして実施(注入はコミットしていない)。

### 注入面の実測(先行確定)

`business-logic-model.md` が前提とした「ゲートは tracked 集合を読むため untracked への注入では赤にならない」を実測確認した:

- untracked ファイル `scratch-untracked-probe.txt`(内容 `hello\x00world\n`、生 NUL を含む)を作成 → `bun tests/control-byte-gate.ts --check` → **exit 0**、出力 `scanned 16650 files, no control bytes found`。
- よって注入対象は既存 tracked ファイルでなければならない。

### 赤の実測

- 対象: `README.md`(tracked)。末尾へ 11 バイト `INJECT\x00\x08END\n` を追記(追記開始オフセット 26200)。
- `bun tests/control-byte-gate.ts --check` → **exit 1**
- 出力(逐語): `README.md: control byte 0x00 at offset 26206`

### 復元と残渣ゼロの機械確認

- `git checkout -- README.md`
- `git status --porcelain` → 実装の意図した変更のみ(注入痕跡なし)
- python 直走査(grep 系を使わない)で全 tracked コーパスを再走査 → `scanned: 16650 violations: 0`
- 注入マーカー `INJECTEND` の grep → 0 hit
- ゲート再実行 → **exit 0**、`scanned 16650 files, no control bytes found`

## sweep と性能実測(FR-CBG-10 / FR-CBG-14)

| 項目 | 実測値 | 取得コマンド |
|---|---|---|
| ゲート verdict | exit 0、`scanned 16650 files, no control bytes found` | `bun tests/control-byte-gate.ts --check` |
| tracked 列挙件数 | 16,651 | `git ls-files \| wc -l` |
| 件数整合 | 16,651 − allowlist 1 件 = 16,650 ✓ | 上記2値の照合 |
| 実行時間 | 5.538s(< 30s 予算) | `time bun tests/control-byte-gate.ts --check` |
| コーパス総バイト数 | 152,706,853 bytes(145.6 MiB) | `git ls-files -z` の各 path に `os.path.getsize` を合算(python) |

コーパス総量 145.6 MiB は performance-design.md の「数百 MB 未満」という規模前提を裏付ける(同設計の実測条項の充足)。

## 検証(各コマンドの exit code は個別に取得。パイプ越しの `$?` は使用していない)

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | `tsc --noEmit` × 2 構成 |
| `bun run lint` | 0 | Biome。456 warnings / 17 infos はすべて既存分で、本 Unit の新規4ファイルの指摘は 0 件(ファイル名 grep で確認) |
| `bun tests/control-byte-gate.ts --check` | 0 | 自己適用(ゲート自身も tracked のため走査対象) |
| `bun test`(unit 述語 + integration ゲート + formal-verif ci workflow) | 0 | 38 pass / 0 fail / 134 expect / Ran 38 tests across **3 files**(宣言した path 集合の実在を事前確認し、runner 報告のファイル数と照合)。FR-CBG-7 の blocking 配線を追加した後の再測定値 — 当初記載の 33 pass は測定 ref `b5e514dd8` 時点の値で、出荷断面および本是正を反映していなかった |
| `bun tests/complexity-gate.ts --check` | 0 | NEW_VIOLATION なし |
| `bun run build` | 0 | 全ハーネスの dist と self-install を再生成。追跡ファイルの差分 0 件 |
| `bash tests/run-tests.sh --ci` | 0 | **RESULT: PASS**、失敗 0 件 |

### フルスイート初回赤の帰属

初回のフルスイートは `RESULT: FAIL`(exit 1)で、失敗は `tests/unit/t07-hook-audit-logger.serial.test.ts` の壁時計アサーション 1 件のみ(`skip path completes within 300ms` に対し実測 506.38ms)。本 Unit は hook 系に一切触れないため負荷起因を疑い、単独再実行したところ **16 pass / 0 fail(exit 0)**。負荷が収まった状態でのフルスイート再実行は **RESULT: PASS(exit 0)** で、失敗 0 件だった。`cid:code-generation:fanout-load-settle-before-integration` の既知パターン(並行実行と重なった入れ子 spawn 型テストのタイムアウト予算圧迫)と一致する。

なお同ログの `wall-clock drift: 15 file(s)` は advisory であり exit code に影響しない(`tests/run-tests.ts:99-100` 「Advisory only — nothing here affects a file's STATUS or the runner's exit code.」、`:859-862` 「ADVISORY: this never gates CI」)。15 件はいずれも本 Unit と無関係のテストで、初回実行時の負荷で `declared=medium` が `measured=large` に振れたもの。

## 受け入れ照合(FR-CBG / NFR)

| 要件 | 充足根拠 |
|---|---|
| FR-CBG-1 決定的検査の新設 | `tests/control-byte-gate.ts --check`。exit 0/1 契約を実測(sweep と落ちる実証の両方向) |
| FR-CBG-2 全 tracked 走査 | `git ls-files -z` 起点。16,650 = 16,651 − allowlist 1 の件数整合を実測 |
| FR-CBG-3 検出バイト集合 | 境界値 12 点(0x00/0x08/0x09/0x0A/0x0B/0x0C/0x0D/0x0E/0x1F/0x20/0x7F/0x80)を実行時生成バイトで固定 |
| FR-CBG-4 生バイトのみ | エスケープ表記の非検出をテストで固定。ゲート自身のソースが検出集合を逐語で語りながら green であること自体が実証 |
| FR-CBG-5 allowlist と stale fail-closed | in-script 定数 + stale 検査 + `reason` 非空 assert(是正)をテストで固定 |
| FR-CBG-6 診断書式 | 逐語形をテストで固定(HEX 2桁大文字を含む) |
| FR-CBG-7 CI blocking 配線 | 独立ジョブ `control-byte-gate` **かつ** `ci-success` の `needs` と無条件 `require_result` への登録。落ちる実証で赤の実在と、配線2面それぞれが load-bearing であることを確認(下記 §FR-CBG-7 の是正) |
| FR-CBG-8 全変更クラスでの起動 | `needs` / `if` を持たないため起動条件が構造的に存在しない。変更クラス×起動有無のマトリクスは「全クラス×常時起動」に縮退し、workflow 定義の実読で完結 |
| FR-CBG-9 落ちる実証 | 上記 §落ちる実証(注入面実測・exit 1・診断逐語・復元と残渣ゼロ) |
| FR-CBG-10 偽陽性ゼロ sweep | exit 0 / 16,650 files。RE 実測(NUL 保持は PDF 1件)の再確認 |
| FR-CBG-11 述語の canonical 導出 | 述語ファイル冒頭の出典参照と意図的相違の明文化 |
| FR-CBG-12 unit テスト | unit(純関数)+ integration(実 FS・実 git リポジトリ)の2層。実行時生成バイト |
| FR-CBG-13 grep 系非依存 | 実装に外部 grep 呼び出しゼロ(実読確認)。読取は `readFileSync` / `readlinkSync` |
| FR-CBG-14 実行時間 | 5.538s(< 30s)。コーパス総量 145.6 MiB を併記 |
| FR-CBG-15 ローカル起動経路 | CI と同一の `bun tests/control-byte-gate.ts --check`。結果を人間可読で stdout へ出す |
| FR-CBG-16 検証劇場の排除 | verdict は3集合から毎回導出。成功フラグのフィールドを持たない。落ちる実証で「実際に赤くなること」を実測 |
| NFR-1 決定性 | 時刻・env・ネットワーク非依存。列挙順が出力順 |
| NFR-2 可読性のある失敗 | 全件列挙・打ち切りなし(ファイル粒度で1件1行) |
| NFR-3 fail-closed | 列挙・読取・内部例外の3面すべてで非0 exit。無音 skip なし |
| NFR-4 依存追加ゼロ | Bun 標準 API のみ。`package.json` の依存は無変更 |

## セキュリティ面の確認(security-design.md)

- ゲートは読取のみで書込ゼロ。シークレット・ネットワーク不使用。
- allowlist の悪用耐性: `reason` 非空 assert(是正)により、理由なき免除がソース上表現不能になった。stale は fail-closed。
- 新規 CI ジョブに追加 permissions を宣言していない(既定の `contents: read` で足りる)。
- ゲート自身も tracked のため走査対象に含まれる(自己適用)。

## 逸脱

要件・設計からの逸脱なし。設計が実装時実測へ委ねていた2点(symlink の走査対象、落ちる実証の注入面)はいずれも実測して確定し、設計の意図(git が保持する blob を判定する / tracked 集合が読み取り面である)と一致した。

## 申し送り

- 本 Unit の実装は当初 swarm builder が着手したが、builder が最終報告前に停止したため、conductor が `cid:code-generation:c5`(無応答時の引き取り)に従い引き取り、差分検分と全検証コマンドの再実行によって完遂した。引き取り時点で未コミットだった是正(allowlist assert・CLI テスト拡充)は conductor が検分のうえコミットしている。
- swarm pool は前セッションの attempt が未 settle のまま残っており、収束実測後に `settle-release --outcome succeeded` で terminal 化してから `finalize`(exit 0 / converged 1)を通した。`finalize` の exit 0 は conductor ブランチへの着地を保証しないため(`cid:code-generation:c2`)、`--no-ff` マージと親数・`ls-files -u` の機械確認で回収した。

## FR-CBG-7 の是正(§12a レビュー iteration 1 の BLOCKER)

### 何が欠けていたか

当初の実装は `control-byte-gate` を `needs` / `if` を持たない独立トップレベルジョブとして置き、それで FR-CBG-7「検査は CI の blocking step として実行する」を満たしたと記載していた。これは誤りだった。

実測(いずれも本是正の直前に取得):

- `.github/workflows/ci.yml:790-802` の `ci-success` の `needs` は `changes / typecheck / lint / distribution-contract / plugin-conformance-e2e / tests / reproducible-build / drift-check / coverage` の9件で、`control-byte-gate` を含まない。
- リポジトリの ruleset(id `18843917`、enforcement `ACTIVE`)が要求する status check は **`CI Success` の1件のみ**(`gh api repos/amadeus-dlc/amadeus/rulesets/18843917` の `required_status_checks` から転記)。

したがってジョブは赤くなってもマージを止めなかった。落ちる実証(FR-CBG-9)が示したのは「ジョブが赤くなり得ること」であって「赤いジョブがマージを止めること」ではない — org.md Forbidden の検証劇場と同族の欠陥である。

先例引用の誤りも同根だった。FR-CBG-7 が先例とした「ci.yml の走査系ゲート群」(no-silent-drop・callsite-guard・unchecked-cast-guard・complexity-gate)はいずれも `lint` ジョブ**内の step** であり、`lint` が `ci-success` の `needs` にあることで blocking 性を継承している。独立ジョブ化はパスフィルタ盲点(FR-CBG-8)の回避としては正しいが、その代償として継承していた blocking 性を失っており、補償が無かった。

### 是正内容

- `ci-success` の `needs` へ `control-byte-gate` を追加。
- `require_result "control-byte-gate"` を `changes` 由来の case 分岐**より前**に無条件で置いた。ゲートはパスフィルタを持たず全イベントで走るため、docs-only・amadeus-only の PR(= フィルタが免除する当のクラス)でも結果を要求する必要がある。
- `tests/fixtures/formal-verif-ci-baseline.sha256` を再ベースライン(`0a57cf45c6c7cefbcabf348535f23b22235dce8d6dd303a1ddef59e32c9a67f3`)。この pin は生ファイルではなく `normalizedCiBaseline`(U4 formal ブロックと dispatch 行を除去した正規化後)の digest である。
- `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` の設計注記を訂正。旧注記は「ci-success の needs は untouched」を意図的設計として記していたが、これが「独立ジョブ = blocking」という誤認の記録だった。独立性は**いつ走るか**の話、`ci-success` 所属は**赤がマージを止めるか**の話で、別の面である旨を明記した。

### TDD と落ちる実証

実装前に `tests/integration/t-control-byte-gate.integration.test.ts` へ失敗テスト2件を追加し Red を実測(2 fail / 23 pass)。最小実装で Green(25 pass / 0 fail)。

落ちる実証は配線2面それぞれについて行い、各面が独立に load-bearing であることを確認した:

| 注入 | 結果 |
|---|---|
| `needs` から `control-byte-gate` を除去 | 1 fail(needs アサーションのみ) |
| `require_result` 行を除去 | 1 fail(unconditional アサーションのみ) |
| 復元後 | 28 pass / 0 fail、正規化 digest が `0a57cf45c6…` へ復帰 |

片方の注入で片方だけが落ちることから、2つのアサーションは冗長ではなく別々の契約面を固定している。
