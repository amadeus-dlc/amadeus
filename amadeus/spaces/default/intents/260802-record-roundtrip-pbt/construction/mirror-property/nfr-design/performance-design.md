# Performance Design — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(明記): 同 unit の business-rules.md(BR-MP-5 / BR-MP-10)、domain-entities.md(§3 の受理ドメイン絞り込み)。

測定 ref: 本書の実測値はすべて **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`** で採取した。FD 群の測定 ref `c8702be09` との差分 `git diff --stat c8702be09..HEAD -- packages/framework/core/tools/ tests/` は**空**(出力 0 行)であり、business-logic-model.md が固定した file:line は本書でもそのまま成立する。

---

## 1. 対象と非対象

本 unit の変更面は business-logic-model.md §1 のとおり `tests/unit/t274-amadeus-mirror-state-codec.test.ts`(追記)と `tests/helpers/arbitraries/mirror-snapshot.ts`(新規)の2つだけで、プロダクションコードを1行も触らない。したがって**ランタイム性能(利用者が観測する応答時間・スループット)の設計対象は存在しない**。本書が扱う性能はテスト実行時間の1点に限る。

| 面 | 扱い |
| --- | --- |
| テスト実行時間(P-MR1 の直接実行) | **対象**(§2〜§4) |
| 決定性(seed 固定と再現性) | **対象**(§5) — 性能の再現性そのもの |
| プロダクションのランタイム性能 | **非対象**。変更面が 0 行(business-logic-model.md §1) |
| CI ジョブの並列度・timeout 設計 | **非対象**。深掘り面は別 unit `pbt-deep-ci` の射程(business-rules.md BR-MP-10「新規ランナー・新規 CI 面は作らない」) |

## 2. 時間予算(強制メカニズムからの導出)

予算は requirements.md **NFR-4** の上限 — 新規 PBT ファイル群の `bun test` 直接実行の合計 **2 秒以内** — を business-rules.md BR-MP-10 経由で共有する。本 unit が消費してよいのはその内数であり、独自の上限を新設しない。

合否の強制メカニズムは `bun test tests/unit/t274-amadeus-mirror-state-codec.test.ts` の実測値(runner が出力する `Ran ... [Nms]` 行)を PR 本文へ転記することであって、本書が新しい数値契約を作るわけではない。

## 3. 追加前ベースライン(実測)

測定コマンドと出力の転記(いずれも上記 ref、連続3回):

| 測定 | コマンド | 出力(転記) |
| --- | --- | --- |
| B-1 起動+モジュールロードのみ | `bun test tests/unit/t274-…test.ts -t "zzz-nonexistent"` | `matched 0 tests. Searched 1 file (skipping 23 tests) [76.00ms]` |
| B-2 既存 property(`:341`、`numRuns: 200`)を含む2テスト | `bun test tests/unit/t274-…test.ts -t "prefix/suffix"` | `Ran 2 tests across 1 file. [85.00ms]` / `[84.00ms]` / `[84.00ms]` |
| B-3 ファイル全体(23 テスト) | `bun test tests/unit/t274-…test.ts` | `Ran 23 tests across 1 file. [88.00ms]` / `[91.00ms]` / `[90.00ms]` |

B-3 は NFR-4 の上限 2,000ms に対して現状 **約 90ms**(実測)であり、余裕は 1,900ms 超である。

## 4. P-MR1 の追加コスト — **推定**(受け入れ基準には使わない)

以下は未実測の**推定値**である。P-MR1 はまだ存在しないため実測できない。受け入れ判定は §2 の実測転記のみで行い、本節の数値を合否に使わない(`cid:nfr-requirements:estimates-not-acceptance-criteria`)。

算出根拠(すべて §3 の実測からの派生):

1. 既存 property(`:341`)の 200 run 分の正味コスト ≒ B-2 − B-1 = 84〜85ms − 76ms = **約 8〜9ms**(この差には同時に走る他 1 テストも含むため、property 単独はこれ以下)。
2. よって既存 property の 1 run あたり ≒ 8.5ms ÷ 200 = **約 0.043ms/run**(推定)。1 run の作業は `renderMirrorStateBlock` → `parseMirrorStateDocument` → `writeMirrorStateDocument`。
3. P-MR1 の 1 run は `renderMirrorStateJson` ×2 + `renderMirrorStateBlock` + `parseMirrorStateDocument`(business-logic-model.md §2 のフロー)。加えて既存 property の入力が `EMPTY_MIRROR_STATE`+revision 固定なのに対し、P-MR1 は receipts 0〜3 件を持つ snapshot を毎回生成する(domain-entities.md §3)。生成コストと入れ子検証コストを見込み、1 run あたりの倍率を **2〜5 倍**と置く。
4. `numRuns: 100`(business-rules.md BR-MP-5 の第1項、既定値)を掛けて **0.043 × (2〜5) × 100 ≒ 9〜22ms**(推定)。

したがって追加後のファイル全体は **約 100〜115ms**(推定)となり、NFR-4 の 2,000ms 上限に対して 17 倍以上のマージンが残る。倍率 2〜5 の見立てが 10 倍外れて 1 run あたり 0.43ms になったとしても 100 run で 43ms であり、予算を脅かさない — この**桁のロバストさ**が「2 秒予算に収まる」と判断した実質的な根拠である。

## 5. 決定性(性能の再現性)

- 固定 seed: business-rules.md BR-MP-5 の第1項により `const MIRROR_PBT_SEED = <値>;` を置き `fc.assert` の第2引数へ渡す。seed が固定されている限り、run ごとの入力列は同一であり §4 の実行時間も run 間で再現する(裏返せば、seed 未固定の PBT は実行時間自体が非決定になり予算判定が無意味になる)。
- **seed 非重複の確認規律**(本 unit の性能・決定性の前提。詳細な手順は reliability-design.md §2 に一本化し、本書はその参照に留める): 実装時に `grep -rn "PBT_SEED = " tests/` を再実行し、提案値 `0x27_4d17` が既存値と重複ゼロであることを実測してから固定する。本書執筆時点の実測は既存 **6 件**(出力転記: `setup-semver.pbt.test.ts:41` `0x5e_6970` / `setup-manifest.pbt.test.ts:29` `0x5e_6970` / `t204-audit-escape.pbt.test.ts:38` `0xa0_d17` / `setup-plan-decisions.test.ts:32` `0x5e_706c` / `t352-journal-codec.pbt.test.ts:25` `16280702` / `t364-journal-v2.pbt.test.ts:41` `26072903`)、および `grep -rn "0x27_4d17\|0x274d17\|2575639" tests/ | wc -l` = **0**。
- DEEP 階層(`AMADEUS_PBT_DEEP`、`numRuns: 50_000`)は BR-MP-5 の第4項どおり分岐で持つ。DEEP は PR CI の既定経路では走らないため NFR-4 の 2 秒予算の対象外であり、その実行時間の所有は unit `pbt-deep-ci` にある。

## 6. 未確定として残すもの

- §4 の倍率 2〜5 は実装時に実測へ置き換わる。実測が推定の上限(115ms)を超えた場合でも予算内なら是正不要だが、**PR 本文への実測転記は必須**(BR-MP-10)。
- 生成器が想定より重い場合(例: `mirrorEventKey` の呼び出しが 1 run あたり receipts 件数分だけ増える)、numRuns を下げる前に生成器の合成順序を見直す — 既定 numRuns 100 の引き下げは BR-MP-5 第1項からの逸脱であり、実装者単独で決めない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:28:14Z
- **Iteration:** 1
- **Scope decision:** none

内容品質は GoA 1-2 相当だが、consumes 5件の沈黙 Major で REVISE。

### Findings

- [Major] 5成果物ヘッダが宣言 consumes 6件中 business-logic-model.md のみ列挙 — stage frontmatter の nfr-requirements 系5件への参照・N/A 根拠が沈黙(注: 実測では engine 解決済み directive の consumes は1件のみで sensors 60/60 PASSED — 残る実質は SKIP 根拠の明記)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:31:54Z
- **Iteration:** 2
- **Scope decision:** none

Major(consumes 沈黙)はヘッダ注記+本文の N/A 根拠の二層で閉包。cross-artifact 整合一致。GoA 1。

### Findings

- None
