# Reverse Engineering スキャンノート — intent 260710-p3-cleanup-batch4

- 手法: project.md `cid:reverse-engineering:c1`(差分リフレッシュ)。前回スキャンコミット基準 `da1611a9a`、現 HEAD `58f3453ad`(= main、intent branch `intent/p3-cleanup-batch4`)。
- スコープ: P3 バグ6件(#757 #758 #753 #739 #740 #784)の焦点コード現物照合。読み取り専用+本ファイル1点作成のみ。共有 codekb は非編集。
- 行番号の注記: Issue 本文の file:line は起票時 HEAD `d2f40b691` 基準。本ノートは現 HEAD `58f3453ad` の実行番号を正とし、ずれは各節に明記する。

## Issue 別の現物照合

### #757 sensor-fire の生パス glob(`packages/framework/core/hooks/amadeus-sensor-fire.ts`)

- `:88` `const filePathNorm = filePath.replace(/\\/g, "/");`(正規化済み変数を計算)— 実在確認。
- `:90-91` `filePathNorm === sensorsLeaf` / `filePathNorm.startsWith(\`${sensorsLeaf}/\`)`— 再帰ガードは正規化版を使用。
- `:193` `const glob = new Bun.Glob(entry.matches);`
- `:194` `if (!glob.match(filePath)) continue;` — センサー適用判定は**生 `filePath` を使用**。Issue の主張どおり、正規化版 `filePathNorm` があるのに glob マッチだけ生パス。バグ実在確認。
- 行番号ずれ: Issue の `:190/:191` → 現行 `:193/:194`(+3)。原因は下記「変更有無」の #793 マージ。
- 影響の実測前提(Bun.Glob の Windows 挙動)は Issue の再現ログに委ねる(当環境 macOS では区切り文字が `/` のため実害は再現しない=Issue の P3 根拠と整合)。

### #758 stop-hook carve-out の mutating verb 漏れ

- 列挙 regex: `packages/framework/core/hooks/amadeus-stop.ts:552`
  `return /\b(approve|advance|finalize|complete-workflow|gate-start|checkbox|park|unpark|set|skip|reject|revise|resume)\b/.test(seg);`
  Issue の `:551` → 現行 `:552`(+1)。
- 設計意図コメントの実在: `:490-491`「no human prompt found, or ANY engine call in the responding turn returns false (fall through to the cap-bounded block)」、`:527`「NOT disqualify … Anything that advances the loop」。fail-toward-engagement を謳う。
- `packages/framework/core/tools/amadeus-state.ts` の実 switch(現行番号):
  - `case "get":` :254 / `case "count":` :266 / `case "lookup":` :308 — read-only(列挙外で正しい)
  - `case "delegate-approval":` :284 / `case "acknowledge-compaction":` :302 / `case "reuse-artifact":` :305 / `case "practices-event":` :311 / `case "practices-promote":` :314 / `case "fork":` :317 / `case "merge":` :320 — **7 verb すべて実在、かつ :552 の regex に不在**。バグ実在確認。
  - Issue の switch 範囲 `:229-298` → 現行は :254〜:320 に分布(state.ts 全体が下方シフト。下記 #804 マージ由来)。
- allow-only(session trap なし)・interactive 限定という Issue の影響評価はコード構造(tier-3 は autonomous では発火しない、`:469` 以降のコメント)と整合。

### #753 kiro-ide seam 死亡(`packages/framework/harness/kiro-ide/hooks/`)

- adapter `amadeus-kiro-adapter.ts`:
  - `:131` `function canonicalTool(name: string)`— write/shell 系は IDE/CLI 両語彙を受理(二重受理の設計自認)。
  - log-subagent case: `:200` `if ((kiro.tool_name ?? "") !== "subagent") return null;`— CLI 名単独ハードチェック。
  - state-sync case: `:184` `if ((kiro.tool_name ?? "") !== "todo_list") return null;`、直後 `:186-187` で `tasks[].task_description` の todo_list 専用 shape。
- 登録 `.kiro.hook`(現物 cat 済み):
  - `amadeus-log-subagent.kiro.hook`: `"toolTypes":[".*invoke_sub_agent.*"]` → 文字列 `"subagent"` はこの正規表現にマッチしない。
  - `amadeus-sync-statusline.kiro.hook`: `"toolTypes":["spec"]` → `"spec"` ≠ `"todo_list"`。
- 相互排他は現物一致で確認。Issue の「行 :200 / :184」は現行と一致(ずれなし)。
- 不確実性(Issue が正直申告済み): live payload の `tool_name` 実値は未捕捉。ただし payload が IDE 語彙でも CLI 語彙でも、どちらかの面(登録 or 受理)で不一致が残るため不整合自体は live 値に依らず成立、という Issue の論理は現物どおり(canonicalTool の二重受理欠如という非対称が根拠)。

### #739 promote-self walk() dangling symlink(`scripts/promote-self.ts`)

- `:146` `if (statSync(full).isDirectory()) yield* walk(full);`— walk が **`statSync`**(lstat でない)でエントリを stat。dangling symlink で ENOENT throw。Issue の `:145` → 現行 `:146`(+1)。
- `:60` `const preserved = [` — preserved 宣言リスト実在。Issue の `:60-68` と整合。
- `:155-157` `function isPreserved(rel)`、`:184` `function orphanedFiles`、`:192` `if (isPreserved(rel)) continue;`— preserved 除外は walk の**後段**でファイル単位に適用。Issue の `:189-191` → 現行 :184/:192 近傍(関数境界は同型)。
- `:207` `function check` — `--check` 経路が orphanedFiles を通るためクラッシュ伝播。Issue の `:219` → 現行 :207 近傍(関数名一致)。
- バグ構造(preserved 配下の symlink 健全性にゲート成否が依存)は現物一致で確認。当環境での再現コマンドは Issue に記載どおり(実行はしていない=読み取り専用スキャンのため)。

### #740 prerelease バッジ 404(`scripts/release-version-sync-plan.ts` ほか)

- `release-version-sync-plan.ts`:
  - `:27-29` コメントで FR-702-1(prerelease バッジサポート)を明示。
  - `:30` accept `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?-blue/` — prerelease サフィックスを受理。
  - `:31` `replacement: (v) => \`badge/version-${v}-blue\``— **生バージョン文字列を埋め込む**。prerelease の `-` を shields.io 用に `--` エスケープしていない。バグ実在確認。Issue の `:31` と一致(ずれなし)。
  - 注: Issue 本文は accept を `scripts/release-version-sync.ts:23` と表記するが、実体は同 seam モジュール `release-version-sync-plan.ts:30`。CLI `release-version-sync.ts` は `:20` で `planVersionSync, VERSION_SURFACES` を plan からインポートし薄いエントリのみ(独自 accept regex は持たない)。Issue の file:line は 1 ファイル取り違えがあるが、指す規則(accept/replacement の非対称)は plan.ts に実在。
- `.github/workflows/release.yml:36` `options: [patch, minor, major]`(default patch)— prerelease 選択肢なし。標準経路から prerelease 到達不能=P3 根拠と整合。実在確認。

### #784 gen-coverage-registry --check の無診断クラッシュ(`tests/gen-coverage-registry.ts`)

- `:104-105` `const RATCHET_PATH = process.env.AMADEUS_COVERAGE_RATCHET ?? join(TESTS_DIR, ".coverage-ratchet.json");`— env seam 実在(Issue の再現手順が使う `AMADEUS_COVERAGE_RATCHET`)。
- `:1243` `if (!existsSync(RATCHET_PATH))` → 不在時は `RATCHET FAILED:` 整形診断(存在チェックのみ整形済み)。
- `:1250` `const baseline = JSON.parse(readFileSync(RATCHET_PATH, "utf-8")) as RatchetDoc;`— **検証なしの JSON.parse**。malformed JSON で SyntaxError throw(診断なし)。
- `:1253` `const base = baseline.coveredByClass[c] ?? 0;`— 形状仮定アクセス。`{}` で `baseline.coveredByClass` が undefined → TypeError。
- バグ実在確認。Issue の `:1250-1252` → 現行 :1250/:1253(ほぼ一致、+1 以内)。

## 前回スキャン以降の変更有無(`git log --oneline da1611a9a..HEAD -- <file>`)

| ファイル | 変更 | コミット |
|---|---|---|
| amadeus-sensor-fire.ts | あり | `d715b8224` fix #775(advisory hook を全 audit shard でゲート、#793)|
| amadeus-stop.ts | なし | — |
| amadeus-state.ts | あり | `d9d7b6ba4` fix(jump,state) #787/#789(#804)|
| amadeus-kiro-adapter.ts | なし | — |
| promote-self.ts | なし | — |
| release-version-sync-plan.ts | なし | — |
| release-version-sync.ts | なし | — |
| .github/workflows/release.yml | なし | — |
| tests/gen-coverage-registry.ts | なし | — |

- sensor-fire.ts の #793 変更は advisory hook の発火ゲート条件(audit shard 判定)に関するもので、`:194` の glob マッチ対象(生 filePath)には手を入れていない。行番号を +3 シフトさせたのみで #757 の欠陥は現存。
- state.ts の #804 変更は transition direction の再導出・不整合拒否で、switch の verb 集合自体は不変。#758 が数える 7 verb は現存し regex 未収録のまま。他7ファイルは前回スキャン以降無変更=起票時の照合がそのまま有効。

## 周辺構造(修理設計に効く観察)

- **#757**: 修正は `:194` を `filePathNorm` に差し替える 1 語変更。ただし Issue の「同型(正規化済み変数があるのに生パス使用)が hooks/tools に他にないか grep」指示を修正時に履行すること。センサー manifest 4 種のうち path セグメント型(`**/{amadeus-docs,intents}/**`)2種が影響対象、拡張子型2種は無害という切り分けは manifest 直読で成立。
- **#758**: 2 経路の修理案が Issue に提示 — (A) 判定を read-only verb 列挙(get/count/lookup 等)+それ以外は関与、へ反転(fail-toward-engagement とコメント整合、追加 verb が安全側デフォルト)、(B) 現列挙に 7 verb 追加+state.ts switch との同期テスト強制。消費者は stop.ts 単一。state.ts の switch が唯一の verb 真実源のため、同期テストを置くなら switch を canonical に読む形が望ましい。
- **#753**: 兄弟実装 `canonicalTool()`(:131)が二重受理の既存パターン。修理は 2 case をこのパターンに合わせる(log-subagent は subagent/invoke_sub_agent、state-sync は todo_list/spec)+ state-sync は spec 入力の shape マッピングを追加。実機 payload 未捕捉のため「発火の実証テスト」が完成条件(Issue 明記)。
- **#739**: walk を lstat 化(symlink を stat しない)か、preserved サブツリーを走査段階で prune。後者は `isPreserved` を walk 内へ前倒しする形。check/apply 両経路が orphanedFiles 経由のため単一修正で両方復旧。
- **#740**: replacement 側で prerelease サフィックス内 `-` を `--` エスケープ + accept 側もエスケープ済み形を受理して idempotent 維持。plan.ts 単一ファイルの seam(CLI は薄いエントリ)なので変更局所。既存テストの版同期系(t68)への波及確認が要る。
- **#784**: 兄弟 `tests/coverage-project-gate.ts` の `parseTotalsText`(:89、MALFORMED を整形診断+exit1、`:188` で `GATE FAILED [MALFORMED]`)が正の型。同型の parse-don't-validate を runCheck の ratchet 読み込みに導入する。env seam `AMADEUS_COVERAGE_RATCHET`(:105)が既にありテスト注入可能。

## #784 ラベル再確認(現ラベル bug/P3/S4-MINOR/origin:bootstrap)

- **種別 bug**: 妥当。fail-closed(exit 1)は維持され誤 green はないが、malformed 入力を無診断スタックトレースで落とす=診断品質の欠陥。誤 green でない点は S を軽く見る根拠になり、bug 分類は保持が妥当。
- **P3**: 妥当。CI を止めはするが回避可(ratchet を再生成/手修復すれば復旧)、正しさ・安全性の破綻ではない(P0 相当でない)。並行 PR コンフリクトで landed し得るという現実的トリガーはあるが即時安全性影響なし → P3 維持。
- **S4-MINOR / 兄弟非対称の主張**: 現物照合で裏取り成立。同一リポ内で同種入力(壊れた JSON baseline)を、`coverage-project-gate.ts` は `parseTotalsText`(:89-94 で JSON.parse を try 包み、`invalid JSON:` を返却)→ `:188` で `PROJECT COVERAGE GATE FAILED [MALFORMED]` の整形出力。対して `gen-coverage-registry.ts:1250` は素の `JSON.parse`。非対称は事実。影響は診断可読性に限局(機能破綻でも誤 green でもない)ため S4-MINOR は妥当。
- 結論: **現ラベル bug/P3/S4-MINOR/origin:bootstrap は変更不要**。origin:bootstrap も導入コミット `5cfb16165`(intent record なし)と整合。

## バッチ3 / open PR とのファイル交差実測

### バッチ3(core-repair-batch3)の焦点ファイル(各 Issue 本文の file:line から抽出)

- #746: amadeus-lib.ts, amadeus-swarm.ts
- #786: amadeus-learnings.ts(全7コピー)
- #742: packages/setup/src/cli.ts, domain/installation.ts, modules/manifest-io.ts
- #743: packages/setup/src/modules/manifest-io.ts, ports/fsops.ts
- #747: packages/setup/src/domain/upgrade.ts, internal/semver-factory.ts, internal/version-spec-factory.ts, modules/resolver.ts
- #741: tests/integration/t90.test.ts
- #744 / #749 / #750: packages/framework/core/tools/amadeus-orchestrate.ts
- #751: packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts

### バッチ4の焦点ファイル

- amadeus-sensor-fire.ts / amadeus-stop.ts / amadeus-state.ts / kiro-ide/hooks/amadeus-kiro-adapter.ts / scripts/promote-self.ts / scripts/release-version-sync-plan.ts / scripts/release-version-sync.ts / .github/workflows/release.yml / tests/gen-coverage-registry.ts

### 交差結果

- **バッチ3 ∩ バッチ4 = 空集合(交差ゼロ)**。近接に見える点の切り分け:
  - バッチ4 #758 は `amadeus-state.ts`、バッチ3 #744/#749/#750 は `amadeus-orchestrate.ts` — **別ファイル**。
  - バッチ3 #751 は `harness/codex/hooks/amadeus-codex-adapter.ts`、バッチ4 #753 は `harness/kiro-ide/hooks/amadeus-kiro-adapter.ts` — ハーネスもファイルも別。
  - `tests/gen-coverage-registry.ts`(#784)はバッチ3 の焦点集合に不在(バッチ3 のテスト系は t90.test.ts のみ)。
- **open PR 交差**: `gh pr list --state open` = #808(record-sync/codekb-initial、11 ファイル、すべて codekb/memory 配下)、#809(norm-update、1 ファイル、memory 配下)。両 PR ともバッチ4 焦点コード9ファイルのいずれも含まず=**コード交差ゼロ**。`gen-coverage-registry.ts` を含む open PR は存在しない(grep 実測で該当なし)。

## 総括

- 対象6 Issue すべて、焦点コードの欠陥が現 HEAD `58f3453ad` に**現存**を file:line 引用で確認。修正は未実施(bughunt-file-only / スキャンは読み取り専用)。
- 起票時 HEAD `d2f40b691` からの行番号ずれ2件のみ: #757(+3、sensor-fire の #793 マージ由来)、#758(regex +1・state.ts switch 下方シフト、#804 マージ由来)。いずれも**欠陥の中身は不変**、行番号のみ更新。他4 Issue の焦点ファイル(kiro-adapter/promote-self/release-version-sync-plan/gen-coverage-registry ほか)は `da1611a9a..HEAD` で無変更、起票時照合が有効。
- #784 のラベルは **bug/P3/S4-MINOR/origin:bootstrap を維持で妥当**。兄弟 `coverage-project-gate.ts` の parseTotalsText 整形診断に対する非対称(gen-coverage-registry の素 JSON.parse)を現物で裏取り、修理の型(parse-don't-validate + 既存 env seam でのテスト注入)まで確認。
- **バッチ3・open PR(#808/#809)とのファイル交差はいずれもゼロ**。バッチ4 は他バッチと独立に並行実装・PR 分割してよい(state.ts↔orchestrate.ts、codex↔kiro-ide の近接は別ファイルで衝突なし)。
