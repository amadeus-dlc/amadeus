# RE 合成ドラフト — intent 260710-p3-cleanup-batch4

> **性質**: 本ファイルは codekb へ**後で機械適用するためのドラフト**であり、codekb 本体(`amadeus/spaces/default/codekb/amadeus/`)は本 intent では**編集しない**(未マージ PR #808 と衝突するため)。適用は conductor が #808 着地後に行う。各節は挿入先ファイルと挿入様式を明記する。
>
> **入力**: Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`(base=`da1611a9a`, observed=`58f3453ad` の diff-refresh、cid:reverse-engineering:c1)。焦点9ファイル中7ファイルは前回スキャン以降無変更、2ファイル(sensor-fire=#793 マージ / state.ts=#804 マージ)は行番号シフトのみで欠陥は不変。
>
> **行番号方針**: 以下の file:line はすべて現 HEAD `58f3453ad` の実行番号。起票時 HEAD `d2f40b691` からのずれがある2件(#757 +3、#758 +1)は各欠陥に注記する。

---

## 1. code-quality-assessment.md への挿入ドラフト(新節)

> **挿入先**: `code-quality-assessment.md` の先頭 intent 節として追加(既存の「本 intent(mint-presence-vectors)の観測面」節の直前、`# コード品質評価` 見出し直後)。挿入後、既存冒頭ポインタ文の「最新 intent」記述を本 intent へ更新する。

### 本 intent(p3-cleanup-batch4)の観測面 — P3 欠陥6件の横断分類(#757 #758 #753 #739 #740 #784)

現 HEAD(`58f3453ad`、base `da1611a9a` からの diff-refresh。焦点9ファイル中7ファイルは無変更、`amadeus-sensor-fire.ts`(#793)/`amadeus-state.ts`(#804)の2ファイルは行番号シフトのみで欠陥不変)で確定した、P3 バグ6件の現物照合。6件はいずれも**挙動欠陥であって構造変化を伴わず**、ファイル非交差(6ファイル群が互いに独立、バッチ3 および open PR #808/#809 とも交差ゼロ)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。

6件を品質パターンで分類すると、いずれも「安全側の機構は既に在るが、その適用が片側・片系統に限られ、もう片方が素通りする」という**非対称欠陥**に収斂する(横断所見は §4 に詳述)。

#### #757 — 正規化変数を計算しながら glob マッチだけ生パスを使う非対称(`packages/framework/core/hooks/amadeus-sensor-fire.ts`)

- **欠陥**: `:88` で `const filePathNorm = filePath.replace(/\\/g, "/")` を計算し、再帰ガード(`:90-91`)は正規化版を使うのに、センサー適用判定の `:194` `if (!glob.match(filePath)) continue` は**生 `filePath`** を渡す(`:193` `new Bun.Glob(entry.matches)`)。正規化済み値が同一スコープに在るのに glob だけ生パス、という計算成果の片側適用漏れ。
- **影響境界**: path セグメント型の manifest(`**/{amadeus-docs,intents}/**` 等)2種が Windows 区切りで取りこぼす。拡張子型2種は無害(macOS では区切りが `/` のため実害非再現=P3 根拠と整合)。
- **修理の型**: `:194` を `filePathNorm` に差し替える1語変更。修理時に「正規化済み変数があるのに生パス使用」の同型が hooks/tools 他所に無いか grep で確認する(Issue 明記)。
- **行番号**: 起票時 `:190/:191` → 現行 `:193/:194`(+3、#793 マージ由来。#793 は advisory hook の発火ゲート条件変更で glob マッチ対象には未介入)。

#### #758 — mutating verb 列挙と真実源(state.ts switch)の乖離(`packages/framework/core/hooks/amadeus-stop.ts`)

- **欠陥**: stop-hook carve-out の判定 regex `:552` `/\b(approve|advance|finalize|complete-workflow|gate-start|checkbox|park|unpark|set|skip|reject|revise|resume)\b/` が、真実源である `amadeus-state.ts` の subcommand switch に実在する mutating verb 7件 — `delegate-approval`(:284)/`acknowledge-compaction`(:302)/`reuse-artifact`(:305)/`practices-event`(:311)/`practices-promote`(:314)/`fork`(:317)/`merge`(:320)— を**取りこぼす**。列挙(手書き regex)と真実源(switch)を二重管理した結果の同期漏れ。
- **影響境界**: allow-only(session trap なし)・interactive 限定(tier-3 は autonomous では非発火、`:469` 以降のコメントと整合)。read-only verb(get/count/lookup)は正しく列挙外。
- **修理の型**: (A) 判定を read-only verb 列挙+それ以外は関与へ反転(`:490-491`/`:527` の fail-toward-engagement コメントと整合、追加 verb が安全側デフォルト)、または (B) 現列挙に7 verb 追加+state.ts switch との同期テスト強制。消費者は stop.ts 単一、verb 真実源は state.ts switch。同期テストを置くなら switch を canonical に読む形が望ましい。
- **行番号**: 起票時 `:551` → 現行 `:552`(+1)、switch は `:229-298` → 現行 `:254-320`(state.ts 全体が #804 マージで下方シフト、verb 集合は不変)。

#### #753 — IDE/CLI 語彙不一致による dead seam(`packages/framework/harness/kiro-ide/hooks/`)

- **欠陥**: adapter `amadeus-kiro-adapter.ts` の log-subagent case(`:200` `if ((kiro.tool_name ?? "") !== "subagent") return null`)と state-sync case(`:184` `!== "todo_list"`)が CLI 語彙を単独ハードチェックする一方、登録 `.kiro.hook` は IDE 語彙で発火する(`amadeus-log-subagent.kiro.hook` の `"toolTypes":[".*invoke_sub_agent.*"]` は文字列 `"subagent"` に不一致、`amadeus-sync-statusline.kiro.hook` の `"toolTypes":["spec"]` は `"todo_list"` に不一致)。兄弟 `canonicalTool()`(`:131`)は write/shell 系で IDE/CLI 両語彙を受理する二重受理パターンを持つのに、この2 case だけ非対称に単一語彙 — その結果どちらの語彙の payload でも一方の面(登録 or 受理)で不一致が残り、seam が死ぬ。
- **影響境界**: 不整合は live payload の `tool_name` 実値に依らず成立(canonicalTool の二重受理欠如という非対称が根拠)。ただし実機 payload は未捕捉。
- **修理の型**: 2 case を canonicalTool の二重受理パターンへ揃える(log-subagent は subagent/invoke_sub_agent、state-sync は todo_list/spec)+ state-sync は spec 入力の shape マッピング追加。実機 payload 未捕捉のため「発火の実証テスト」が完成条件(Issue 明記)。
- **行番号**: Issue の `:200`/`:184` と現行一致(ずれなし)。

#### #739 — stat/lstat の混同による dangling symlink クラッシュ(`scripts/promote-self.ts`)

- **欠陥**: `:146` `if (statSync(full).isDirectory()) yield* walk(full)` が `lstat` でなく **`statSync`** でエントリを stat するため、dangling symlink(リンク先欠落)で `statSync` が ENOENT を throw する。preserved 除外(`:155-157` `isPreserved`、`:192` の適用)は walk の**後段**でファイル単位に効くため、walk 内の stat クラッシュを防げない。`--check` 経路(`:207` `function check`)も orphanedFiles(`:184`)経由でクラッシュが伝播する。
- **影響境界**: preserved 配下の symlink 健全性にゲート成否が依存する(ゲートの緑がゲート対象でなく symlink 状態に依存)。
- **修理の型**: walk を lstat 化(symlink を stat しない)、または preserved サブツリーを走査段階で prune(`isPreserved` を walk 内へ前倒し)。check/apply 両経路が orphanedFiles 経由のため単一修正で両復旧。
- **行番号**: 起票時 `:145` → 現行 `:146`(+1)、その他は関数境界同型で近傍一致。

#### #740 — shields.io エスケープの片側適用(`scripts/release-version-sync-plan.ts`)

- **欠陥**: `:30` の accept regex `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?-blue/` は prerelease サフィックスを受理するが、`:31` の replacement `(v) => \`badge/version-${v}-blue\`` は**生バージョン文字列を埋め込む**だけで、prerelease の `-` を shields.io 用に `--` エスケープしない。受理側(prerelease 許容)と生成側(エスケープ不履行)の非対称で、prerelease バッジが 404 になる。
- **影響境界**: `.github/workflows/release.yml:36` の `options: [patch, minor, major]`(prerelease 選択肢なし)により標準経路から prerelease 到達不能=P3 根拠と整合。
- **修理の型**: replacement 側で prerelease サフィックス内 `-` を `--` エスケープ + accept 側もエスケープ済み形を受理して冪等性を維持。plan.ts 単一 seam の局所変更(CLI `release-version-sync.ts:20` は plan から `planVersionSync, VERSION_SURFACES` を import する薄いエントリで独自 accept regex を持たない)。既存の版同期系テスト(t68)への波及確認が要る。
- **注**: Issue 本文は accept を `release-version-sync.ts:23` と表記するが実体は同 seam モジュール `release-version-sync-plan.ts:30`(1ファイル取り違え)。指す規則(accept/replacement の非対称)は plan.ts に実在。

#### #784 — parse-don't-validate の非対称(`tests/gen-coverage-registry.ts`)

- **欠陥**: `:1243` `if (!existsSync(RATCHET_PATH))` は不在時に `RATCHET FAILED:` 整形診断を出すが、`:1250` `JSON.parse(readFileSync(RATCHET_PATH, "utf-8")) as RatchetDoc` は**検証なしの素 JSON.parse** で、malformed JSON は SyntaxError を無診断 throw、`:1253` `baseline.coveredByClass[c] ?? 0` は形状仮定アクセスで `{}` 入力時 TypeError。存在チェックだけ整形済みで parse/shape は未整形、という parse 経路の片側適用漏れ。兄弟 `tests/coverage-project-gate.ts` の `parseTotalsText`(`:89`、`:188` で `GATE FAILED [MALFORMED]` の整形診断+exit 1)が正の型で、同一リポ内で同種入力(壊れた JSON baseline)への処理が非対称。
- **影響境界**: fail-closed(exit 1)は維持され誤 green はない。欠陥は診断可読性に限局(機能破綻でも誤 green でもない)。
- **修理の型**: `coverage-project-gate.ts` の parseTotalsText と同型の parse-don't-validate を runCheck の ratchet 読み込みへ導入。env seam `AMADEUS_COVERAGE_RATCHET`(`:104-105`)が既にありテスト注入可能。
- **ラベル判定(Developer が再確認)**: 現ラベル **bug/P3/S4-MINOR/origin:bootstrap は変更不要**。bug(誤 green でないが無診断スタックトレース=診断品質欠陥)、P3(CI を止めるが回避可・正しさ/安全性の破綻でない)、S4-MINOR(兄弟非対称を現物裏取り、影響は診断可読性限局)、origin:bootstrap(導入コミット `5cfb16165`、intent record なし)いずれも妥当。
- **行番号**: 起票時 `:1250-1252` → 現行 `:1250/:1253`(+1 以内)。

---

## 2. reverse-engineering-timestamp.md への挿入ドラフト(鮮度ブロック)

> **挿入先**: `reverse-engineering-timestamp.md` の `# リバースエンジニアリング実施記録` 見出し直後(既存「実行メタデータ(最新: 260710-mint-presence-vectors)」節の直前)。挿入後、既存の「最新」節は「前回」表記へ降格する。

### 実行メタデータ(最新: 260710-p3-cleanup-batch4)

- Date: 2026-07-10
- Intent: `260710-p3-cleanup-batch4`(P3 バグ6件 — #757 sensor-fire の生パス glob / #758 stop-hook carve-out の mutating verb 漏れ / #753 kiro-ide adapter の IDE/CLI 語彙不一致 dead seam / #739 promote-self walk の dangling symlink クラッシュ / #740 prerelease バッジ 404 / #784 gen-coverage-registry --check の無診断クラッシュ)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch4`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`da1611a9a`(前回 observed 相当)、observed=`58f3453ad`(現 HEAD = main)。焦点9ファイル中7ファイルは `da1611a9a..HEAD` で無変更(起票時照合が有効)、2ファイルのみ変更 — `amadeus-sensor-fire.ts`(#793、`d715b8224`、行 +3 シフトのみで #757 欠陥不変)/`amadeus-state.ts`(#804、`d9d7b6ba4`、switch 下方シフトのみで #758 が数える7 verb 不変)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-sensor-fire.ts`(#757)・`amadeus-stop.ts` + `amadeus-state.ts` switch(#758)・`kiro-ide/hooks/amadeus-kiro-adapter.ts` + `.kiro.hook`(#753)・`scripts/promote-self.ts`(#739)・`scripts/release-version-sync-plan.ts` + `release.yml`(#740)・`tests/gen-coverage-registry.ts`(#784)
- 更新した成果物: `code-quality-assessment.md`(本 intent の P3 6欠陥横断分類節を追加)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わないため温存(churn 回避、cid:practices-discovery:c2 相当。前例=core-repair-batch3 の判断)。

---

## 3. architecture.md への追記要否 — 追記なし

**判定: 追記なし(churn 回避)**。6件はいずれも挙動欠陥で、コンポーネント境界・依存方向・データフロー・状態機械のいずれにも構造変化を伴わない(既存機構内の非対称是正=1〜数語〜局所ロジックの修理)。前例として core-repair-batch3 でも同種の挙動欠陥バッチで architecture.md を温存した判断があり、それに倣う。

構造事実として記録に足る唯一の候補は「注入分類カタログ非共有」型の設計事実だが、本バッチの6件は既存 architecture.md の主題(packaging 入力集合・human-presence gate・委任 provenance)に新しい構造面を加えない。無理な追記はむしろ既存図の主題を薄めるため、追記しないのが一貫する。

---

## 4. 横断所見(修理バッチの unit 分割案の種)

**6件を貫くパターン = 「安全側機構の片側適用漏れ」**。6件はすべて、正しい振る舞いのための機構が既にコード内に存在するのに、その適用が片側・片系統に限られている:#757 は正規化変数を計算済みなのに glob だけ生パス、#758 は verb 真実源(switch)があるのに列挙 regex が同期漏れ、#753 は兄弟 canonicalTool の二重受理があるのに2 case だけ単一語彙、#739 は preserved 除外があるのに walk 段階に届かず、#740 は accept が prerelease 受理するのに replacement がエスケープせず、#784 は兄弟 parseTotalsText の整形診断があるのに素 JSON.parse。したがって全件、修理は「既存機構をもう片方の経路へ配線/適用する」局所変更で完結し、新規機構の導入を要さない(bugfix スコープと整合)。この共通性は「同型の欠陥が他所に無いか」を修理時に grep 確認する価値を示す(特に #757 は Issue が明示指示)。

**unit 分割案**: ファイル群が完全非交差(scan-notes §「交差結果」で バッチ3 ∩ バッチ4 = 空、open PR #808/#809 ともコード交差ゼロを実測)のため、**6 unit 独立が自然**で最大並列化できる。ただし #740 は plan.ts が単一 seam(CLI は薄いエントリ)なので **1 unit(plan.ts 中心、CLI/release.yml は波及確認のみ)**。#758 は stop.ts(消費者)と state.ts switch(真実源)の2ファイルに跨るが、修理方式(A)なら stop.ts 単独編集、方式(B)なら同期テストで両ファイルを読むため、**1 unit** として扱い方式決定を requirements-analysis に委ねるのが自然(方式で touch 面が変わるため事前に2分割しない)。結論: **6 unit 独立 · 並列バッチ可**(state.ts↔orchestrate.ts、codex↔kiro-ide の近接は別ファイルで衝突なし=scan-notes 総括と整合)。

---

## 適用サマリ(conductor 向け — #808 着地後の機械適用手順)

1. **§1 → `codekb/amadeus/code-quality-assessment.md`**: 先頭 intent 節として §1 の「本 intent(p3-cleanup-batch4)の観測面」ブロックを挿入(既存 mint-presence-vectors 節の直前)+ 冒頭ポインタ文の「最新 intent」を本 intent へ更新。
2. **§2 → `codekb/amadeus/reverse-engineering-timestamp.md`**: §2 の「実行メタデータ(最新: 260710-p3-cleanup-batch4)」ブロックを見出し直後に挿入+既存「最新」節を「前回」へ降格。
3. **§3 → `codekb/amadeus/architecture.md`**: 追記なし(churn 回避、判定根拠は §3)。
4. **他7成果物**: 温存(構造変化なし)。
5. 適用は共有 codekb 直編集となるため、#808 マージ後の最新ツリーへ rebase してから行い、行番号は適用時点 HEAD で再照合する。
