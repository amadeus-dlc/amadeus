# Requirements Analysis Questions — 260723-marker-heading-exemption

<!-- E-OC1 選挙不要判定ヘッダ -->
> **処理方式**: Q1〜Q2 は複数の妥当解を持つ真の未決(実装形態・出力契約)であり選挙対象(cid:always-elect)。[Answer] 記入は裁定受領後のみ(cid:election-answer-after-ruling)。既決事項は質問化しない(cid:no-election-for-decided-norms): 免除対象2クラス(*-questions / *-timestamp)= E-FVEPD 既決+Issue #1296 期待契約、manifest 同一 PR 更新 = 矛盾記述の同期(scan-notes §4.2)、filter 不変 = surgical、弁別入力 = stem suffix 直接(`stem ∉ template-eligible` 方式は bare call で全成果物が非 eligible に見える fail-open 構造のため一次証拠から一意に排除 — scan-notes 疑問3)。
> **判定申告**: 2026-07-23T02:49Z 頃(agmsg e5→leader、選挙依頼と同送)
> **leader 承認**: 2026-07-23T02:49:32Z(agmsg leader→e5 — 既決扱い4点の選挙不要判定を承認、Q1/Q2 は選挙開催)

## Q1. 免除述語の canonical 化はどうしますか?(FR-1 の実装形態)

marker 弁別(`-questions` / `-timestamp` suffix)は現在 `templateEligibleArtifacts`(amadeus-graph.ts:801-808)にインライン1箇所。センサー floor 免除を追加すると弁別が2箇所になり得ます。

- A. 共有述語 `isMarkerArtifact(name)` を amadeus-lib.ts へ抽出し、graph の filter とセンサー floor 免除の両方をそこから導出(canonical 1定義 — cid:code-generation:c1。センサーは既に lib を import 済みで新規依存なし)
- B. センサー内に stem suffix チェックを独立実装(graph 側は不変 — 変更面最小だが2定義ドリフト面が残る。両者の一致は対称 test で固定)
- C. 共有述語を amadeus-graph.ts へ抽出し、センサーが graph を import(センサーの graph 非依存設計を破る)
- X. Other (please specify)

判断点: 変更面の大きさ(B 最小)vs 集合分裂の構造的防止(A)。センサースクリプトの import 実測: amadeus-lib.ts のみ(scan-notes §1)— A は既存 import 面で成立、C のみ新規依存。

[Answer]: A(E-MHERA1 裁定 2026-07-23、3-0)— isMarkerArtifact を amadeus-lib.ts へ抽出し、graph filter とセンサー floor 免除の両方をそこから導出。※前提訂正あり — 裁定の記録節参照

## Q2. 免除時の出力契約(observable exemption)はどうしますか?(FR-2 の表現)

検証劇場 Forbidden は「どのコードも消費しない検証用フィールド」を禁じ、同時に無音の免除は E-1059 系(不発の無音化)の懸念があります。

- A. `pass: true` + 新フィールド `marker_exempt: true` を Result と manifest output_schema へ追加し、detail/監査面で免除理由が読める配線まで含める(消費者 = manifest schema test t86+検証テスト)
- B. `pass: true` のみ(フィールド追加なし — 免除は headings:[] + h2_count:0 + pass:true の組合せから推論可能)
- C. `pass: true` + 既存 `config_warning` 流用で免除注記を出す(警告チャネルの意味論を汚す)
- X. Other (please specify)

判断点: A は観測可能性が最高だが schema 変更+消費配線が必要(t86 影響 — scan-notes §5)。B は最小だが「floor 免除で pass した」ことと「H2 が2つあって pass した」ことの機械弁別が h2_count 経由の推論になる。

[Answer]: A(E-MHERA2 裁定 2026-07-23、3-0)— marker_exempt: true フィールド+manifest output_schema+消費配線(t86 等)まで同一 PR。全3票の GoA2 留保(配線不成立時の B 縮退条件)は裁定の記録節と FR-2 へ転記済み

## 裁定の記録

- **E-MHERA1(Q1)**: A 採用 3-0(choice1=3)。GoA[E-MHERA1]: 1x2 2x1。留保転記(e1, GoA2 verbatim): 「配布された判断点『センサーの import 実測 = amadeus-lib.ts のみ / C のみ新規依存』は私の tree の実測と不一致 — amadeus-sensor.ts:39-47 は既に amadeus-graph.ts から loadGraph/loadSensors 等を import している。開票時にこの前提訂正を record へ記録すること(A の妥当性自体は独立に成立)」
  - **前提訂正の conductor 再実測(2026-07-23)**: 両言明は対象ファイルが異なり両立する — 起草前提の「amadeus-lib.ts のみ」は**センサースクリプト**(amadeus-sensor-required-sections.ts:3 verbatim `import { errorMessage, parseBoltDag } from "./amadeus-lib.ts";` — これが唯一のフレームワーク import)についての実測で正確。e1 指摘の graph import は **dispatcher**(amadeus-sensor.ts)についての実測でこれも正確。誤りは起草時の判断点が「センサー」の語で両者を区別しなかった曖昧さにあり、訂正として記録する。C の「新規依存」評価は『スクリプト単体に graph 依存を足す』の意味では維持されるが、いずれにせよ裁定 A(lib 抽出)はどちらの読みでも最有利で妥当性は不変
- **E-MHERA2(Q2)**: A 採用 3-0(choice1=3)。GoA[E-MHERA2]: 2x3。留保転記(3件 verbatim):
  - (e4, GoA2)「採用条件は『消費配線まで同一 PR』— 配線が付かない場合は未消費フィールド禁止(検証劇場 Forbidden)により B へ縮退すること。」
  - (e1, GoA2)「marker_exempt フィールドは最低1消費者(t86 等の assert または doctor 表示)まで同一 PR で配線して初めて完成扱い — 消費者ゼロなら検証劇場 Forbidden に転落するため、配線が過大と判明した場合は B へ縮退してよい」
  - (e6, GoA2)「marker_exempt フィールドの消費配線(t86 等での assert)が実装で必ず伴うこと — 消費されないフィールドは検証劇場 Forbidden に転落するため、配線が実装時に不成立なら B へ縮退を再裁定」
- **票タイムライン**: 配信 2026-07-23T02:49:33Z → e4 02:50:27Z → e1 02:53:45Z → e6 02:56:52Z → 開票 02:57:23Z(両選挙同一)
- **leader 承認([Answer] 記入)**: 2026-07-23T02:57:49Z(agmsg leader→e5)
