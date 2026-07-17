# Reverse Engineering スキャンノート — 260716-installer-new-harnesses(Issue #1048)

- **手法**: diff-refresh(cid:reverse-engineering:c1) + installer/配布系の重点スキャン(cid:reverse-engineering:c2)
- **base**: `5761e65ce73a82b055590a50f483161e5df2abca`(祖先性 `git merge-base --is-ancestor`=exit 0 実測、距離=**41**、祖先かつ距離最小の指定 base を採用 — cid:reverse-engineering:rescan-base-ancestry)
- **observed**: `1e22d6a889ca71cab82a056e07edc8a46110a297`(`git rev-parse HEAD` 実測一致)
- **全 file:line は observed HEAD の実コード直読で確定**(mechanism-cite-verify-at-draft)
- **台帳の連続性**: 前 intent `260715-opencode-cursor-harness` の RE(observed `6a23b0ec`)が同一フォーカス面を既にスキャン済み。`6a23b0ec` は本 base `5761e65` の祖先(`--is-ancestor`=exit 0 実測)であり、台帳は連続している。既存 codekb 節 `code-structure.md:79-129`「harness port 開放性の観測面」がその成果。**本スキャンはその台帳を現 observed で全数再検証(enumeration-reverify)したもの**。

---

## スコープの本質(intent の位置づけ)

Issue #1048 のスコープは「**installer(`@amadeus-dlc/setup`)を opencode / cursor の2新ハーネスへ対応させる**」。以下は本スキャンで確定した現状の非対称:

- **dist・配布面は既に成立済み**(base 以前に導入): `dist/opencode`・`dist/cursor` の shipped tree、`packages/framework/harness/{opencode,cursor}/manifest.ts`、README「Pick your harness」の OpenCode/Cursor 行、smoke `t149-opencode-cursor-dist-structure.test.ts` はすべて現存。`scripts/package.ts:68-73 discoverHarnessNames()` が manifest 実在で自動発見するため、両ハーネスは package.ts 無編集で dist ビルド済み。
- **installer(packages/setup)のみ未対応**: `HarnessName` 列挙が4値(claude/codex/kiro/kiro-ide)のままで、`install --harness opencode` は `HarnessName.parse` で弾かれる。**この閉じ列挙の拡張が本 intent の実装本体**。

---

## フォーカス面ごとの実測(1行結論付き)

### 面1: installer 閉じ列挙5ファイルの現状(全数再列挙 = enumeration-reverify)

独立 grep(`grep -rn -E "kiro-ide" packages/setup/src/` + 列挙サイト精査)の結果、閉じ列挙サイトは **5ファイル・9箇所で前台帳と全数一致(増減なし)**。区間 41 コミットでこれら5ファイルの diff は空。

| # | file:line | 列挙サイト | 現内容 |
| --- | --- | --- | --- |
| 1 | `packages/setup/src/domain/harness.ts:9` | `HarnessName` union type | `("claude" \| "codex" \| "kiro" \| "kiro-ide")` |
| 2 | `packages/setup/src/domain/harness.ts:19-24` | `HarnessName.all` frozen array | `["claude","codex","kiro","kiro-ide"]` |
| 3 | `packages/setup/src/domain/engine-layout.ts:8-13` | `ENGINE_DIR_BY_HARNESS` map | `{claude:".claude", codex:".codex", kiro:".kiro", "kiro-ide":".kiro"}`(:5 に「kiro/kiro-ide が dir 名を共有」の説明コメント) |
| 4 | `packages/setup/src/modules/reporter.ts:24` | usage 文字列(install) | `--harness <claude\|codex\|kiro\|kiro-ide>` |
| 5 | `packages/setup/src/modules/reporter.ts:25` | usage 文字列(upgrade) | `--harness <claude\|codex\|kiro\|kiro-ide>` |
| 6 | `packages/setup/src/modules/reporter.ts:137` | invalid-harness エラー文言 | `Expected one of claude, codex, kiro, kiro-ide.` |
| 7 | `tests/unit/setup-harness.test.ts:11,13` | 契約テスト(件数+集合 assert) | `"contains exactly the four known harnesses"` + `toEqual(["claude","codex","kiro","kiro-ide"])` |
| 8 | `tests/unit/setup-harness-parse.test.ts:16,17` | 契約テスト(受理集合 loop) | `"accepts each of the four known harness names"` + `for (const name of ["claude","codex","kiro","kiro-ide"])` |

**1行結論**: 前台帳の installer 5ファイル・9箇所は現 observed で全数現存・区間不変。opencode/cursor 追加時は8サイト全ての機械的拡張(union・all・engine-map に `.opencode`/`.cursor`・usage 2本・invalid 文言・契約テスト2本)が必須。エンジン dir 名は opencode→`.opencode`、cursor→`.cursor`(kiro/kiro-ide のような共有ではなく各固有)で、`allEngineDirNames()` の返り値も5要素へ増える。

### 面2: installer が新ハーネスで必要とする配布面 — ハードコード有無

installer(packages/setup)の配置・検証ロジックは**完全にデータ駆動**でハーネス名のハードコードは列挙5ファイルの外に無い。実測:

- `packages/setup/src/modules/wizard.ts:17` — 選択肢は `HarnessName.all` 駆動(:18 で `HarnessName.parse`)。列挙拡張が自動で流れる。
- `packages/setup/src/modules/verifier.ts:2,34` — `engineDirNameFor(manifest.harness)` 駆動。engine-layout 拡張が自動で流れる。
- `packages/setup/src/internal/payload-factory.ts:46-59` — `readdirSync(distDir)` で dist 内在ハーネスを発見し `join(distDir, harness)` で解決(汎用)。`available` フィルタは dist ディレクトリ実在で判定。
- `packages/setup/src/domain/plan.ts:246-252 walkFiles(root)` — ハーネスツリーを再帰走査してコピー対象ファイルを構築。**per-harness のファイルリストのハードコードは無い**(`grep -rn "AGENTS.md|opencode.json|hooks.json|\.mdc" packages/setup/src/` = 0 件)。
- `packages/setup/src/modules/applier.ts:28-82` — plan の entries を汎用コピー。AGENTS.md・`amadeus/` seed・engine dir は tree 走査でそのまま拾う。

**1行結論**: installer は「HarnessName.all + engineDirNameFor + walkFiles で走査した dist ツリー」で完全に汎用動作するため、面1の列挙8サイトを拡張し dist ツリー(既存)があれば、`.opencode`/`.cursor`/AGENTS.md/`amadeus/` seed のコピー・検証は追加ロジックなしで成立する。

### 面3: npm pack / setup-pack-contract

- `tests/lib/setup-pack-contract.ts:21` — `DECLARED_IN_FILES = ["dist/cli.js", "LICENSE-MIT", "LICENSE-APACHE"]`。**ハーネス非依存**。
- ハーネス dist tree は npm パッケージに同梱されず、install 時に GitHub codeload から取得する設計(payload-factory の tarball 解決)。したがって setup の公開物 `files` リストにハーネス列挙は無い。

**1行結論**: setup-pack-contract は新ハーネス追加で**変更不要**(公開物にハーネスツリーを含まないため)。本 intent の検証面に pack-contract は含まれない。

### 面4: README「Pick your harness」表 + install コマンド列

- 現状は**6行**(base 以前に OpenCode/Cursor 行が追加済み): `README.md:54-59`(Kiro IDE / Kiro CLI / Claude Code / Codex CLI / OpenCode / Cursor)。バッジも6個(:13-18)。
- OpenCode 行(:58)・Cursor 行(:59)は注記に「**manual install**」を明記(OpenCode=「manual install, session skills, hooks deferred」/ Cursor=「manual install, 8-event hook wiring」)。
- `README.md:109` — wizard 説明が閉じ列挙を prose で持つ: `pick your harness (claude / codex / kiro / kiro-ide)`。**installer が opencode/cursor 対応後はこの行と :58-59 の「manual install」注記が要更新**(installer 経路が使えるようになるため)。

**1行結論**: README 表は6行で完成済みだが、OpenCode/Cursor 行の「manual install」注記と :109 の wizard 列挙(4値)は installer 対応後に要更新 — ドキュメント同期面として requirements/実装スコープに載せるべき(docs-language-ownership: README は英語正本)。

### 面5: 全数性テストの設計材料 — dist 集合 discover 手段と t149 との役割分担

- **build 側 discover**: `scripts/package.ts:68-73 discoverHarnessNames()` = `readdirSync(HARNESS_ROOT)` で `manifest.ts` を持つ dir を返す(HARNESS_ROOT=`packages/framework/harness`)。ただしこれは build スクリプト内部関数で installer テストからの直接 import 対象ではない。
- **installer 側の全数性テスト材料**: 契約テスト2本(面1 #7/#8)が「`HarnessName.all` の集合」をモジュールスコープ literal で固定(`t149` の設計思想と同じく、manifest 由来に co-vary させない)。全数性を dist ディレクトリ列挙から動的導出すると「installer が知るべき集合」と「dist に何があるか」が結合してしまうため、**現行の literal 固定契約が設計上正しい**(smoke t149 のヘッダコメント :10-19 が同旨を明記)。
- **t149(smoke)の役割**: `dist/opencode`・`dist/cursor` の shipped tree に load-bearing ファイルが存在することを固定(存在面)。`bun run dist:check`(バイト面ドリフトガード)と対。**installer 契約テスト(HarnessName 集合)とは検査対象が別レイヤー**(t149=dist 構造、setup-harness=installer が受理する集合)。

**1行結論**: 全数性は installer 側は literal 固定契約(setup-harness*.test.ts)、dist 側は t149 smoke + dist:check で二層に分担済み。新ハーネス追加時は両層を同一 PR で更新(t149 は既に opencode/cursor をカバー済みなので installer 契約テスト2本の更新が本 intent の焦点)。

### 面6: 区間差分(base..HEAD 41 コミット)

`git diff --stat 5761e65..HEAD` をフォーカス面ファイルで実行:

| ファイル群 | 区間 diff |
| --- | --- |
| installer 列挙5ファイル(harness.ts / engine-layout.ts / reporter.ts / setup-harness*.test.ts) | **空(不変)** |
| README.md | **空(不変)** — OpenCode/Cursor 行は base 以前(#1074)で導入済み |
| scripts/package.ts | **空(不変)** |
| tests/integration/setup-pack-contract.test.ts | **空(不変)** |
| dist/opencode・dist/cursor | **空(不変)** — base 以前(#1044 U2 surface, #1074)で導入済み |
| runtime/migrate/self-install 台帳4ファイル(amadeus-lib.ts / amadeus-utility.ts / amadeus-migrate.ts / promote-self.ts) | **空(不変)** |

**1行結論**: 本 intent のフォーカス面は base..HEAD の41コミット区間で**一切変化なし**。現 worktree の行番号は前 intent スキャン(6a23b0ec)以降の微小な行ドリフトを除き台帳と整合。

---

## 参考: 台帳全体(installer 外の閉じ列挙 — スコープ判断材料)

面1の installer 5ファイルは「正しさに必須」。台帳の残り4ファイルは前 codekb 節が分類済みで、本 intent のスコープ判断事項(現 observed で全数現存・区間不変を実測):

- **runtime(test-seam/advisory、正しさ非影響)— 2ファイル**:
  - `packages/framework/core/tools/amadeus-lib.ts:121` `KNOWN_HARNESS_DIRS = [".claude",".kiro",".codex"]`(:114-116 コメントで「NOT the source of truth — script-path derivation handles any dir」と明記 = probe-order hint/test-seam 専用。※訂正 2026-07-16: 当初「harness.json が実解決の権威」は誤要約 — harness.json の権威は rulesSubdir 経路 :165-175 の別事項)、`KNOWN_RULES_SUBDIR`。
  - `packages/framework/core/tools/amadeus-utility.ts:860` `otherTrees = [".claude",".kiro",".codex"]`(multi-harness 検出 advisory)、`:2010` `SCAN_EXCLUDE`、`:699` doctor の `if (harness === ".claude")` 専用ブロック(advisory 品質のみ)。
- **migration — 1ファイル**: `packages/framework/core/tools/amadeus-migrate.ts:71` `INSTALLED_HARNESS_DIRS = [".claude",".codex",".kiro"]`(aidlc→amadeus 移行で新ハーネスを扱う場合のみ)。
- **self-install — 1ファイル**: `scripts/promote-self.ts:37-41` `managedDirs`(**ハードコードで claude+codex のみ、kiro/kiro-ide すら対象外**)+ `:313-319` build 呼び出し。opencode/cursor で amadeus 自身を dogfood 開発しないなら編集不要。**スコープ判断事項**。

---

## codekb 更新要否判定(churn 回避の根拠付き)

**判定: codekb body は全点温存(churn なし)。本 RE では per-intent re-scan 記録のみ新設。**

根拠(cid:reverse-engineering:c1 の churn 回避):

1. **区間 diff が全フォーカス面で空**。base..HEAD の41コミットで installer 列挙5ファイル・runtime/migrate/self-install 台帳4ファイル・dist ツリー・README・package.ts のいずれも不変。観測面は base 時点とバイト同一。
2. **既存 codekb 節 `code-structure.md:79-129`(前 intent 260715-opencode-cursor-harness、既に「履歴」ラベル)が本フォーカス面の台帳を正確に保持**しており、現 observed の再検証で全数一致を確認済み。同節を書き換える差分は無い(行番号の微ドリフト `KNOWN_HARNESS_DIRS :114→:121` 等は前スキャン observed `6a23b0ec` から base への intervening commits による軽微ずれで、台帳の意味論は不変 — 本 re-scan 記録に現 HEAD 行番号を併記して補足すれば足りる)。
3. **他 body 成果物**(architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は本フォーカス面と無関係かつ区間構造不変につき温存。
4. RE 差分の record-sync(cid:reverse-engineering:rescan-prompt-record-sync)対象は per-intent `re-scans/260716-installer-new-harnesses.md` の新設のみ。既存節が「履歴」ラベル済みのため現在時制マーカーの降格作業(c3-relabel)も不要。

**Architect 合成への引き継ぎ**: 本 intent は「既存の open-set 汎用機構の上で、installer 閉じ列挙8サイト(5ファイル)を4→6値へ拡張する機械的作業 + README ドキュメント同期 + self-install/migrate/runtime-advisory のスコープ判断」に収束する。dist・manifest・discover・walkFiles・payload・applier はすべて既存汎用機構で追加ロジック不要。

---

## Architect 合成(実装可能性判定)

Developer スキャンの引用を独立再検証(harness.ts:9/:19-24、engine-layout.ts:8-13、reporter.ts:24/:25/:137、wizard.ts:17、payload-factory.ts:46-59、setup-pack-contract.ts:21、README.md:54-59/:109)— **全点が現 observed HEAD と一致、不一致なし**。

**(a) 変更面の確定目録**: installer 閉じ列挙8サイト(harness.ts union :9・all :19-24、engine-layout map :8-13 に `.opencode`/`.cursor` 各固有 dir、reporter usage×2 :24/:25・invalid 文言 :137、契約テスト2本 setup-harness*.test.ts の件数/集合 literal)+ README 3箇所(:58-59 の「manual install」注記削除、:109 wizard prose 列挙 4→6値)。**追加ロジック不要の論証**: 配置・検証・コピー・payload 解決(wizard.ts:17 の `HarnessName.all` 駆動 → verifier の `engineDirNameFor` → plan の `walkFiles` tree 走査 → payload-factory の `readdirSync(distDir)` 発見)は全て列挙を単一起点に汎用動作し、dist ツリーは既存。列挙8サイト拡張が全経路へ自動伝播するため、新規分岐・per-harness ハードコードは一切生じない。

**(b) requirements 引き継ぎ — pre-declared 分岐推奨**: install 動作の正しさに効くのは installer 8サイトのみ(`HarnessName.parse` が弾く経路 = FR 本体、必須)。以下3面は install 完走の正しさに非影響で、pre-declared 選択肢として requirements に明示推奨 — ①runtime 2(amadeus-lib.ts:121 `KNOWN_HARNESS_DIRS`・amadeus-utility.ts:860 `otherTrees`)は :114-116 コメントが「NOT the source of truth — script-path derivation handles any dir」と明記する probe 順ヒント/advisory で(※訂正 2026-07-16: 当初「harness.json が権威」と誤要約 — harness.json の権威は rulesSubdir 経路(:165-175)の別事項。RA reviewer M-1 の捕捉で是正) install 正しさ非影響 → doctor/multi-harness 検出の advisory 品質のみに効く「対応推奨だが design 判断」、②migrate 1(amadeus-migrate.ts:71)は aidlc→amadeus 移行で新ハーネスを扱う場合のみ効き install 経路外 → 同上、③self-install 1(promote-self.ts:37-41 `managedDirs`、現状 claude+codex のみで kiro すら対象外)は amadeus 自身の dogfood 専用で install 正しさ非影響 → 「opencode/cursor で dogfood しないなら skip」を既定推奨。3面とも「正しさ必須ではない=advisory/dogfood」を実測根拠付きで pre-declared 化し、builder に既決として渡さない。

**(c) install 完走検証の実測方法**: 取得は codeload 固定(resolved-version-factory.ts:5 `CODELOAD_BASE`、http.ts:5 `ALLOWED_HOSTS`=api/codeload.github.com のみ)で、公開タグ未発行でもローカル検証可能 — 既存 `tests/integration/setup-install-flow.test.ts` が `Http` port を `fakeHttp` で差し替え、`tests/lib/setup-codeload-fixture.ts` の `buildCodeloadFixture` が codeload 形状の合成アーカイブ(`dist/<harness>/...` 内包)を注入して実ファイルシステムへ apply する。新ハーネスの完走検証は同 fixture に `dist/opencode`/`dist/cursor` エントリを足して install→verify を通せば足り、ネットワーク・公開タグ不要。

**(d) リスク**: ①engine dir を kiro/kiro-ide 型の共有と誤って opencode/cursor を同一 dir へ寄せると `.opencode`/`.cursor` の各固有性が壊れる(map :8-13 は各固有で正)。②契約テスト2本の literal(「four known harnesses」文言・`toEqual` 集合)と reporter 文言3本(:24/:25/:137)は同一 PR で全数更新しないと統合赤(fixture-propagation-grep 面)。③README :58-59/:109 のドキュメント同期漏れ(docs-language-ownership、英語正本)。いずれも列挙拡張の機械的伝播漏れクラスで、grep 全数棚卸し(same-root-inventory)で封鎖可能。
