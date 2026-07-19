# Requirements Analysis 質問ファイル — 260719-cursor-complete-clear(Issue #1248)

## E-OC1 選挙/選挙不要判定(記入は裁定・承認後のみ)

- Q1: **選挙実施**(未決の設計判断 — 修正方式の選択。leader 指令 2026-07-19T14:28Z 要件(4)により単独決定禁止)。E-CCCRA として leader が CLI 配信中 — 裁定受領後に [Answer] を記入する。
- Q2: **選挙不要判定・承認済み**(根拠種別: Issue スコープの既決 — #1248 の提案は complete 時の解放であり、park は resume がカーソルを前提とするため対象外)。leader 承認 2026-07-19T14:50:57Z(agmsg)。
- Q3: **選挙不要判定・承認済み**(根拠種別: 既決ノルム — 監査シャードは append-only(org.md Way of Working)であり、完了後に混入した既存イベント行の遡及削除はスコープ外。回収は従来どおり record-sync PR)。leader 承認 2026-07-19T14:50:57Z(agmsg)。

## Q1. 修正方式(選挙対象)

intent 完了後の残留追記を止める方式はどれか。

実測コンテキスト(RE scan-notes / #1248 クロスレビュー確定事実):
- カーソル書き手は2箇所(`amadeus-lib.ts:1729` setActiveIntentCursor / `:2147` birth)。clear 経路は不在。
- `handleCompleteWorkflow`(`amadeus-state.ts:1550-1680`)はカーソル非操作。
- 読み手 `activeIntent`(`amadeus-lib.ts:1059-1084`)は registry status 不参照。**カーソル不在でも record が空間内に1件だけなら lone-intent fallback(:1080)で解決が継続する** — scratch 再現で実証済み(単一 intent 状態ではカーソル削除だけでは追記が止まらず、2件目の intent を置いて初めて停止)。
- 監査追記チェーン(hooks → `appendAuditEntry` → `auditFilePath` → `activeIntent`)の全段に status ゲート不在。追記到達フックは7つ(主犯 mint-presence:73-74)。

A. complete-workflow 時に active-intent カーソルを clear するのみ(Issue 提案1)
B. 参照先 intent の status=complete 時に監査追記を no-op にする status ゲートのみ(Issue 提案2、セッション横断の防御層)
C. 両方(A の clear + B の防御層 — set⇔clear 対称の回復と、lone-intent fallback・他クローン残留カーソルを塞ぐ防御層の併用)
D. その他の方式(activeIntent resolver 自体が complete を除外する等)
E. 修正しない(運用回避の継続)
X. Other (please specify)

[Answer]:

## Q2. clear の対象イベント(選挙不要判定・承認待ち)

カーソル解放は complete-workflow 時のみか(park は対象外か)。

A. complete 時のみ(park は resume がカーソルを前提とするため維持)
B. park 時も解放する
X. Other (please specify)

[Answer]: A(complete 時のみ。選挙不要判定 — leader 承認 2026-07-19T14:50:57Z)

## Q3. 既存の混入済みイベント行の扱い(選挙不要判定・承認待ち)

完了後に既に混入した監査行(例: 260718-hooks-config-conflict の 6,000 行超)の遡及削除を本 intent に含めるか。

A. 含めない — シャードは append-only、回収は record-sync PR の従来運用(実施済み #1246/#1247)
B. 含める
X. Other (please specify)

[Answer]: A(含めない — append-only 既決ノルム。選挙不要判定 — leader 承認 2026-07-19T14:50:57Z)
