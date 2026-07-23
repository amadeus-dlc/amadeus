# Requirements — 260723-marker-heading-exemption(Issue #1296)

上流入力(consumes 全数): business-overview、architecture、code-structure

## Intent 分析

business-overview が示すとおり、本フレームワークはステージ成果物の決定的検証をセンサー(advisory)で行う。architecture のセンサー系(dispatcher `amadeus-sensor.ts` → 各センサースクリプト)のうち required-sections は、code-structure が示す `packages/framework/core/tools/` 正本+11配布面の構成で出荷されている。欠陥は required-sections の generic H2 floor(`amadeus-sensor-required-sections.ts:141` verbatim `let pass = h2_count >= 2;`)が全成果物へ無条件適用され、意図的に H2 を欠く単一行 marker 成果物(`*-timestamp.md`)と [Answer] 様式 questions(`*-questions.md`)を恒常 `pass:false` にすること(RE 再現: timestamp/questions 両クラスで `{"pass":false,"h2_count":0,"findings_count":2}`)。

既決規範 E-FVEPD(cid:practices-discovery:e-fvepd-marker-heading-floor、2026-07-20 採用)は「H2 を意図的に欠く *-timestamp.md と *-questions.md を prose-heading floor から明示的に免除する」ことを既に要求しており、本修正は**文書化済み仕様への回復(バグ修正)**である — 仕様変更エスカレーションは不要(正準リスト(4)非該当)。

## 機能要件(FR)

- **FR-1(floor 免除)**: required-sections センサーは、出力ファイル名 stem(`basename(outputPath).replace(/\.md$/,"")` — :173 の既存導出)が `-questions` または `-timestamp` で終端する成果物を generic ≥2-H2 floor から免除し `pass: true` とする。弁別入力は **stem suffix 直接**(既決 — `stem ∉ template-eligible` 方式は `--template-eligible` 省略の bare call で全成果物が非 eligible となる fail-open 構造のため排除。scan-notes §1.3/§2/疑問3)。実装形態(E-MHERA1 裁定 A、3-0): 共有述語 `isMarkerArtifact(name)` を amadeus-lib.ts へ抽出し、graph の `templateEligibleArtifacts` filter とセンサーの floor 免除の**両方**をこの1定義から導出する(canonical 1定義 — 2定義ドリフトの構造的防止)。センサースクリプトは既存の lib import(:3)面で成立し新規依存なし。留保転記(E-MHERA1 e1, GoA2): 「配布された判断点『センサーの import 実測 = amadeus-lib.ts のみ / C のみ新規依存』は私の tree の実測と不一致 — amadeus-sensor.ts:39-47 は既に amadeus-graph.ts から loadGraph/loadSensors 等を import している。開票時にこの前提訂正を record へ記録すること(A の妥当性自体は独立に成立)」— conductor 再実測の帰結: 両言明は対象ファイル差(スクリプト vs dispatcher)で両立し、本留保は起草判断点の前提訂正のみで **FR-1 の結論(A = lib 抽出)に影響しない**(訂正の全文照合は questions の裁定の記録節)。
- **FR-2(観測可能な免除)**: 免除は無音にしない(E-MHERA2 裁定 A、3-0)— Result に `marker_exempt: true` フィールドを追加し、manifest output_schema へ追記のうえ、**最低1消費者**(t86 等の assert)までを同一 PR で配線する。留保転記(全3票 GoA2 — pre-approved 縮退分岐): [e4] 配線が付かない場合は未消費フィールド禁止(検証劇場 Forbidden)により B(pass:true のみ)へ縮退すること。[e1] 最低1消費者まで配線して初めて完成扱い — 配線が過大と判明した場合は B へ縮退してよい。[e6] 配線が実装時に不成立なら B へ縮退を**再裁定**。運用規則: 縮退発動時は実装を止めて leader へ申告し、e6 留保に従い再裁定を経てから B を適用する(無申告縮退は不可)。
- **FR-3(非 marker の挙動不変)**: 非 marker 成果物の floor 判定・findings 導出(`Math.max(0, 2 - h2_count)`)・template-override 分岐・ELIGIBILITY GATE・edge_block 分岐は一切変更しない。`config_warning` の既存意味論(template ineligible 警告)も不変。
- **FR-4(manifest 同期)**: `packages/framework/core/sensors/amadeus-required-sections.md:52-53` の「the marker keeps the generic floor」記述を免除契約に合わせて更新する(英語)。output_schema は Q2 裁定に従い同期。manifest も 11 配布面の同期対象。
- **FR-5(配布同期)**: 正本編集後に `bun scripts/package.ts`+`bun run promote:self` を実行し、`bun run dist:check`+`bun run promote:self:check` green を PR 前提とする(11 コピー: 正本1+dist6+self-install4 — kiro 系はトップレベル self-install なし。scan-notes §4.1)。
- **FR-6(リグレッションテスト)**: t155(`tests/unit/t155-template-override.test.ts` — 実スクリプト spawn 駆動の既存 seam)に免除テストを追加する: (a) marker stem(`-questions`/`-timestamp` 両クラス)→ `pass:true`+`marker_exempt: true` の assert(**FR-2 の縮退分岐と同期**: 再裁定を経て B へ縮退した場合は免除印 assert を除き `pass:true` のみを検証する — テスト仕様は採用形と常に1:1) (b) 非 marker stem の h2<2 → 引き続き `pass:false`(floor 健在の対照)。落ちる実証は免除経路の実行行へ注入(cid:inject-runtime-consumed-lines)し、テストが読む面で行う(cid:injection-surface-verify)。
- **FR-7(閉包)**: Issue #1296 起票時の再現コマンド verbatim 再適用(practices-discovery-timestamp への直接発火)が `pass:true` へ転じることを修正後に実測し、PR に記録する(cid:fix-review-replays-origin-repro)。

## 非機能要件(NFR)

- **NFR-1(corpus 安全性)**: 免除述語の corpus sweep(cid:corpus-sweep-for-new-guards)— `intents/` 配下の実 corpus(RE 実測: questions 391 件+timestamp 22 件、測定 ref = worktree HEAD ffc79aad9)へ述語を適用し、marker 全件が免除側・非 marker 成果物が floor 側に落ちることを両側実測する。
- **NFR-2(filter 不変)**: センサー filter(`**/{amadeus-docs,intents}/**`)は変更しない。`codekb/` 配下 marker(reverse-engineering-timestamp.md)は従来どおり matches-rejection のまま(cid:re-sensors-codekb-filter-mismatch は本修正のスコープ外)。
- **NFR-3(exit code 契約不変)**: スクリプトの常時 exit 0+JSON verdict の契約(:226、cid:manual-sensor-fire-before-gate-report 追補 E-1059-RA の前提)は変更しない。

## Out of Scope

- dispatcher(amadeus-sensor.ts)の `--template-eligible` スレッドの変更(免除はセンサースクリプト内で完結 — E-MHERA1 裁定 A により graph 側 filter は isMarkerArtifact 導出への置換のみで、dispatcher の配線は不変)
- 運用免除ノルム E-FVEPD 自体の改廃(機械化着地後の縮約は蒸留ラウンド事項 — E-TCRRAS13B 採用時の e5 留保どおり)
- 他センサー(upstream-coverage / answer-evidence / linter / type-check)の変更
- RE センサーの codekb filter 不適合(cid:re-sensors-codekb-filter-mismatch)の解消

## トレーサビリティ

Issue #1296(起票者 e6、E-FVEPD 起点)→ クロスレビュー2名成立(cid:issue-cross-review — Issue コメント実測: 1人目 VERIFIED 2026-07-20T08:00:10Z、2人目 CONFIRMED 2026-07-20T08:01:21Z「起票者e6とは別枠」明記)→ e5 トリアージ+現存確認(2026-07-23T01:00:14Z コメント = 現 tree 再現 pass:false+:134-148 直読、P2/S3-MAJOR 付与)→ ユーザー着手決定(leader ディスパッチ 2026-07-23T01:26:27Z、cid:issue-selection-user-decides)→ intent-statement(birth 記述)→ RE scan-notes / re-scans/260723-marker-heading-exemption.md → 本 requirements。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T03:07:28Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major1+Minor2 を是正確認(トレーサビリティ4段精密化 / E-MHERA1 留保 verbatim 転記 / FR-6(a) 縮退分岐同期)。留保転記の件数照合 1/1+3/3 一致、二次欠陥なし。

### Findings

- None
