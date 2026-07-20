# Requirements Analysis 質問ファイル — 260720-leader-store-sync(#1281)

<!-- E-OC1 選挙/選挙不要判定 -->
> Q1・Q2: **選挙実施**(未決の設計判断 — 方式と同期契機。ディスパッチ (3) により単独決定禁止)。裁定受領後に [Answer] 記入。
> Q3: **選挙不要判定・承認済み**(根拠種別: constants-from-code の適用)。判定申告 03:40Z 頃 → leader 承認: 2026-07-20T03:41:12Z(agmsg タイムスタンプ)。Q1/Q2 は E-LSSRA1/E-LSSRA2 として配信中。

上流入力(consumes 全数): intent-statement, scope-document, team-practices, business-overview, architecture, code-structure — Q1 の候補構成は intent-statement.md の前提節と scope-document.md の Must 効力条件(裁定従属)を写像し、除外規則の正本は team-practices.md が参照する live 層に置く。Q1 の実測コンテキストは architecture.md の「leader 所有物の機械的同定と main 同期運搬」節(RE 新設)に依拠し、実装配置は code-structure.md の scripts/ 層、所有権境界は business-overview.md のワークスペース境界記述に依拠する。

## Q1. 同期方式(選挙対象)

leader 所有物の main 同期の恒久方式はどれか。

実測コンテキスト(RE scan-notes / feasibility):
- 抽出対象は決定的導出可能: elections/ 全量(origin/main 55 dir)+leader 自クローンシャード(auditShardName、lib:2838)。
- sync PR 生成の scripts/(Bun tool)面前例は不在だが、`.github/workflows/ci.yml:319-327` に CI shell ステップの precedent が実在(app-token 認証・`metrics/snapshot-<sha12>-<attempt>` ブランチ命名・gh pr create+auto-merge — reviewer 指摘で是正)。`scripts/amadeus-mirror.ts` の GhRunner idiom も流用可。
- E-PM10A(自所有物外 M 全数突き合わせ・memory 層 main 復元)は着地済みノルムで、機械述語化可能。
- クロスレビュー見立て(#1281): e1 = A を即応ノルム→C を恒久機械化 / e2 = C は E-PM10A 準拠が前提条件。
- B(election CLI advisory)はスコープ外条件付き(C-7)— 採用時は別 Issue 委譲。

A. 方式 A のみ — 定期 sync の運用ノルム persist(実装なし。leader 手作業+レビュー観点で E-PM10A を担保)
B. 方式 C のみ — sync PR 生成 tool(scripts/)の機械化(契機は leader 裁量のまま)
C. A+C 併用 — ノルムが契機を定義し、tool が抽出・除外・PR 生成を機械実行(e1 見立ての恒久形)
D. その他(note に方式明記)
E. 対応しない
X. Other (please specify)

[Answer]: C(併用。E-LSSRA1 裁定 2026-07-20 favor 3-0、留保2件は requirements FR-1 へ verbatim 転記 — record: elections/E-LSSRA1/record.md)

## Q2. 同期契機の定義(選挙対象 — Q1 で A または C 系採用時に効力)

A. ローリング PM ラウンド毎(postmortem-two-tier の第2層に同乗 — 約1時間周期)
B. N 選挙毎(N は design で named constant 化)
C. PM ラウンド毎+未同期 N 選挙超過の早い方(二重契機)
D. leader 裁量(契機を定めない — 現状維持に近い)
X. Other (please specify)

[Answer]: C(二重契機。E-LSSRA2 裁定 2026-07-20 favor 3-0、留保1件(N の named constant 化)は FR-2 へ転記)

## Q3. PR 巨大化時の分割条件(選挙不要判定・承認待ち)

- 判定: 選挙不要 — constants-from-code 適用(閾値数値は要件で発明せず design の named constant+根拠導出へ委譲。要件は「分割条件を持つこと」のみ固定)
- A. 分割条件の存在を要件化し、閾値は design 委譲
X. Other (please specify)

[Answer]: A(E-OC1 選挙不要判定 — leader 承認 2026-07-20T03:41:12Z)
