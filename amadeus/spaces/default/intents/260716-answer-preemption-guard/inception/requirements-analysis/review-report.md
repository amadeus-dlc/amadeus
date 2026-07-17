# Requirements レビューレポート — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md`(レビュー対象 requirements.md の consumes と同一集合を突き合わせに使用)。

レビュアー: product-lead(独立レビュー)
対象: `inception/requirements-analysis/requirements.md`

## Verdict: READY(合意度 2 — 軽微な留保付き合意)

Critical: 0件 / Major: 0件 / Minor: 2件。エンジニアリングはこの requirements.md から質問なしで着手可能と判断する。

---

## 1. テスト可能性

FR-1〜FR-7 の AC はいずれも合否判定可能な形になっている。曖昧語(「速い」「使いやすい」等)は無し。特に良い点:

- AC-1c は述語の 6 reason(pass 4種 + fail 2種)を過不足なく列挙し、`fail:no-evidence`/`fail:unparseable-timestamp` → pass=false、他4種 → pass=true と写像を明示— 実測(下記3節)と一致。
- AC-4a/4b/5a/5c/7a は実行コマンド・fixture・exit code まで具体化されておりQAがそのままテストケースを起こせる。
- AC-3b/3c は既存の compile 経路・drift guard を検証コマンド単位で固定している。

Minor-1(後述)を除き、テスト不能な AC は見当たらない。

## 2. 上流トレース

`intent-statement.md` → `scope-document.md` → `constraint-register.md` → `raid-log.md` → `intent-backlog.md`(B1〜B5)→ `decision-log.md`(D1〜D5)の一連を実読し、requirements.md のトレーサビリティ表と突き合わせた。

- B1→FR-1、B2→FR-2、B3→FR-6、B4→FR-5、B5→FR-7 で MECE に対応(欠落・重複なし)。
- FR-2 の由来「C2/R2」は `constraint-register.md:10`(C2)と `raid-log.md:8`(R2、cutoff 定数の複製 drift 緩和として amadeus-lib.ts 移設案)に実在。
- FR-3 の由来「R1」は `raid-log.md:7`(frontmatter 宣言追加の diff 肥大リスク、緩和は設計で確定)に実在。
- FR-6 の由来「ディスパッチ pre-approved 分岐(20:59:49Z、agmsg 出典)」は `decision-log.md:10`(D2)と符合し、agmsg 出典であることも明示されている(agmsg-git-evidence-split 準拠)。
- 宣言なき逸脱・留保の脱落は確認されなかった。`initiative-brief.md` のリスク表(A1 の代替緩和「手動 fire 運用で補完」)は、reverse-engineering の A1=YES 実測(scan-notes.md:101-116)によって設計時実測の必要が解消されたための正当な更新であり、留保の握りつぶしではない。

## 3. 機構引用の実在(mechanism-cite-verify)

requirements.md 中の file:line 引用を実ファイルで直接確認した。

| 引用 | 実測結果 |
|------|---------|
| `amadeus-lib.ts:1173` `export function checkQuestionsEvidence` | 一致(`grep -n` で :1173 確認) |
| `amadeus-lib.ts:1144-1146` `QuestionsEvidence` 判別ユニオン | 一致(:1144 `export type QuestionsEvidence =` 確認、fail reason 2種の型定義も一致) |
| `amadeus-state.ts:1721` `GUARD_CUTOFF_YYMMDD = 260716` | 一致 |
| `amadeus-state.ts:1722` 日付導出 `Number.parseInt(basename(rd).slice(0,6), 10)` | 一致 |
| `amadeus-sensor.ts:511` `process.exit(0)` | 一致 |
| `amadeus-sensor.ts:576` id-agnostic な `out.pass`(boolean)読み | 実測: :575 `typeof parsed.pass !== "boolean"` — 意味論的に一致(boolean 型ガードの箇所) |
| `amadeus-sensor.ts:693-699` `readFindingsCount` | 一致(:693 で関数定義開始を確認) |
| required-sections manifest frontmatter(id/kind/command/matches 等) | 一致(`sensors/amadeus-required-sections.md:1-24` を直読) |
| required-sections script import(`:1-3` `node:fs`/`node:path`/`./amadeus-lib.ts`) | 一致(3行とも完全一致) |

いずれも実在・意味論とも requirements.md の記述と整合する。捏造・誤引用は検出されなかった。

## 4. 列挙の完全性(enumeration-completeness-review)

AC-3a は「questions ファイルを produce する stage」の対象集合確定を design へ委ねている。これは requirements 段の欠落ではなく、`scope-document.md` IN-1(「対象ステージ集合は application-design で確定」)で既に上流合意済みの pre-approved 委譲であり、intent-backlog B1 とも整合する。requirements 段で確定すべき列挙(FR→由来の対応、6 reason の網羅、B1〜B5→FR の対応)はいずれも欠落なく確認できた。

## 5. 数値の出典(constants-from-code)

- cutoff `260716`: `amadeus-state.ts:1721` の実在定数から直接引用(推測なし)。
- 「corpus 59/111」: `constraint-register.md:10`(C2)が出典とする「#1106 の corpus sweep 実測」に遡れる。PR #1106 は `gh pr view 1106` で実在・MERGED(2026-07-16T17:00:04Z)を確認済み。requirements.md の AC-2a は「旧様式 corpus 59/111」を過去の設計根拠として引用するのみで、現時点の corpus 件数(実測: 144件)をこの数値で断定していない — AC-4b は「既存 corpus 全数 sweep」を現況で再実測する契約になっており、数値のハードコードによる陳腐化リスクは無い。

## 6. ユーザー可視契約の先送り確認(requirements-analysis:c3)

- Sensor の出力契約(JSON `{pass, findings_count}`)、発火面(matches glob 対象)、advisory exit code はいずれも requirements 段でテスト可能に固定済み(AC-1a/1b/1e)。
- 「(a)+(b) 併用可否」(FR-6)のみ design へ委譲されているが、これは `intent-statement.md` スコープ境界(「IN: ...(a)/(b) の併用可否は application-design で判断」)で明示的に承認済みの pre-approved 分岐であり、無申告の先送りではない。
- cutoff 定数の canonical 化先(AC-2b「移設の具体位置は design で確定」)も同様に、C2/R2(raid-log)で設計判断事項と明記済み。

---

## Minor 指摘(ブロックしない)

**Minor-1: AC-4c の合格基準がやや抽象的**
AC-4c「vacuity guard テスト(定型句のみの入力で空文化しない)をピンする」は、何を具体的な fixture・期待値とするかが requirements 段では未確定。`ECODE_RE = /E-[A-Z0-9][A-Z0-9-]*/`(amadeus-lib.ts:1148、実測)は Answer 行内のどの位置の文字列マッチでも `evidence-present` と判定するため、"E-OC1 とは関係ない" のような**プローズ中の言及**が誤って証跡ありと判定されるリスクが構造的に存在する(述語自体は C1 により変更不可のため、これは新設 sensor が「述語の既知の限界」として引き継ぐリスク)。requirements 段でこの具体的な境界ケース(例:E-code 文字列が引用でなく地の文にのみ出現する行)を最低1個 AC に落とし込むと、QA が machine-readable なテストケースをすぐ書ける。現状でも design 段での机上トレースへの委譲として許容範囲だが、次工程で放置されないよう明記を推奨。

**Minor-2: AC-1e が CLI 引数エラー時の挙動に触れていない**
既存前例 `amadeus-sensor-required-sections.ts:112` は `--output-path` 欠落時に `process.exit(1)` する(fail 関数)。AC-1e は「exit code は常に 0」と述べるが、これは pass/fail 判定結果に対する契約であり、引数不備等の CLI 誤用時の扱いには触れていない。前例踏襲で自然に解決される可能性が高いが、AC-1b/1e の文言に「CLI 引数不備時は前例(required-sections)に倣い exit 1」を一言足すと二義性が消える。

---

## 結論

上流成果物との整合性、機構引用の正確性、数値出典の追跡可能性のいずれも高水準で満たされている。Minor 2件は engineering 着手のブロッカーではなく、design/build-and-test 段での具体化事項として引き継げば十分。READY と判定する。
