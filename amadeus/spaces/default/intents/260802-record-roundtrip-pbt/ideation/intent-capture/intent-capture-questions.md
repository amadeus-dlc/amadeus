# Intent Capture 質問票 — 260802-record-roundtrip-pbt

> E-OC1 証跡: 本 intent は GitHub Issue #1980 のクロスレビュー2名成立（2026-08-03、対象 SHA 8e5dc6c4、verdict 2件とも CONFIRMED_WITH_REFINEMENTS）と本文全面改稿・独立再検証済みを前提とする。既決事項（対象境界 state/election・プロパティ2種の書き分け・AC 4項・投影コスト・分担）は質問対象にせず、真に未決の3判断のみを問う（cid:intent-capture:c1）。回答モード: Guide me（ユーザー選択、監査ログ記録済み）。

## Q1. バグ分類台帳（「44件」の一次出典）の record 化をこの intent のスコープに含めるか

背景: #1980 の「不整合/drift/非対称 44件」は #1979 と同一の全量調査（全259件・分類済み181件）だが、分類台帳そのものがリポジトリに存在せず、独立再検証で「着手時に record 化しないと将来も検証不能」と申し送りされている。

- A. 含める — 本 intent の RE/RA 段で分類台帳（少なくとも不整合/drift/非対称 44件の Issue 番号リスト）を record 化する
- B. 含めない — 台帳化は #1979（無音化ゲート）側の作業に委ね、本 intent は根拠9件の照合のみで進める
- C. 軽量版 — 本 intent の直接根拠9件＋射程判定のみを record に台帳化し、44件全量は #1979 へ委ねる
- X. その他（自由記述）

[Answer]: C — 軽量版。本 intent の直接根拠9件＋射程判定のみを record に台帳化し、44件全量の台帳化は #1979 へ委ねる（ユーザー裁定）

## Q2. mirror の render→parse property 化（AC-1 但し書きの「外側」作業）を必須スコープにするか

背景: t274:58 の render→parse round-trip は example-based で、property 版＋妥当 snapshot arbitrary が不足（検証者 Major 指摘で AC-1 に「外側に含む」と明記済み）。ただし「含む＝実施可能」であって必須とは書いていない。

- A. 必須（Must）— state / election と同格で mirror property 化まで本 intent の完了条件にする
- B. 任意（Could）— state / election を必須とし、mirror property 化は余力があれば同一 intent 内で実施
- C. 対象外 — mirror property 化は別 Issue に切り出す
- X. その他（自由記述）

[Answer]: B — 任意（Could）。state / election を必須とし、mirror の render→parse property 化＋snapshot arbitrary は余力があれば同一 intent 内で実施（ユーザー裁定）

## Q3. QA 深掘り実行（高 numRuns）の CI ジョブ新設をスコープに含めるか

背景: AC-4 は既存規約（PBT_SEED 固定・numRuns 100・AMADEUS_PBT_DEEP=1 階層）への準拠のみを求める。ノルム pbt-developer-testing-posture は「深掘りは夜間/リリース前の別ジョブへ分離し失敗 seed をログ化」と定めるが、深掘りを実行する CI ジョブ自体は現存しない（AMADEUS_PBT_DEEP は手動実行のみ）。

- A. 含める — 深掘り用 workflow（schedule または workflow_dispatch、失敗 seed ログ化付き）の新設まで本 intent で実施
- B. 含めない — 本 intent はテスト資産と AMADEUS_PBT_DEEP 階層の整備まで。深掘りジョブは別 Issue に起票して委ねる
- C. 最小形 — workflow_dispatch の手動トリガのみ新設し、schedule 化は別 Issue へ
- X. その他（自由記述）

[Answer]: C — 最小形。workflow_dispatch の手動トリガ＋失敗 seed ログ化のみ新設し、schedule 化は別 Issue へ（ユーザー裁定）

## 裁定の記録

Q1=C / Q2=B / Q3=C — いずれも AskUserQuestion によるユーザー直接裁定（推奨案どおり）。選挙不要判定: ソロモード・ユーザー本人の回答であり裁定主体はユーザー（エスカレーション正準リスト外の未決3判断を直接確定）。
ユーザー承認: 2026-08-02T16:11:16Z
