# Requirements Analysis — Clarifying Questions

上流入力(consumes 全数): business-overview.md, architecture.md, code-structure.md

> 質問の前提事実の出典: ガード棚卸し G1〜G40・判定語彙 5 系統・G7/G9 の fail 方向衝突・2 層構造(CLI/hook)は codekb `architecture.md`「ライフサイクル進行ガードの集約構造と分散(260813-lifecycle-guard-runtime、現在)」節と `re-scans/260813-lifecycle-guard-runtime.md` から採った。`business-overview.md` と `code-structure.md` は本 intent の RE で「レビュー済み無変更」であり、本 intent 固有の事実は引かず一般文脈(フレームワークの目的・パッケージ構造)としてのみ前提にする(cid:requirements-analysis:c4-consume-header-is-not-citable-content)。Issue #2771 本文とクロスレビュー 2 名(run xrev-2771-20260813131430、CONFIRMED_WITH_REFINEMENTS ×2)の refinement を一次入力とする。

> Intent autonomy `full` 有効中のため、本ファイルの質問は `amadeus-bolt decide-question` の5段梯子で裁定する(cid:scope-definition:c1-semi-ladder-routing)。人間への直接提示は行わず、fail-closed の結果のみ人間へ回る。裁定成立後に [Answer] と裁定の記録を転記する。仕様変更に該当する事項は梯子に載せずユーザーへエスカレーションする。

## Q1: 移行対象 checkpoint の範囲確定

Issue は「Intent 生成、Stage 完了、Phase 遷移、Workflow 完了**など**」と書くが、RE 実測では権威ある遷移は state.ts の 15 verb + 前進 jump(`amadeus-jump.ts:581`)+ Bolt batch gate(G37)+ swarm retry(G35)を含む。本 intent の Runtime 移行対象をどう確定するか。

A. Issue が名指しする 4 checkpoint(Intent 生成 / Stage 完了 / Phase 遷移 / Workflow 完了)+ 前進 jump(Phase 遷移と同一ゲート `verifyPhaseCheckArtifact` を既に共有するため Phase 遷移族として含める)を移行対象とし、G1〜G40 の全棚卸しで残余(batch gate、swarm retry、park 等)を built-in / policy に分類したうえで「移行対象外(根拠併記)」と成果物に明記する
B. 15 verb + jump + batch + swarm の全遷移を本 intent で移行する
C. Stage 完了のみ(既存 chokepoint の Interface 化だけ)に絞る

[Answer]: A — 自動裁定(AUTO_DECIDED `auto-decision-df0882432dba5842f4ba2de8a09258ce`、basis=agent-recommendation、Issue #2771 の名指し 4 checkpoint + reviewer-1 訂正2(jump を Phase 遷移族へ明示)から導出。B は self-fix/Minimal の規模と surgical 原則(P5)に反し、C は Issue AC の水平展開要求を満たさない)。承認: 2026-08-13T16:15:38Z

X. Other (please specify)

## Q2: fail-closed AC と無変更回帰 AC の両立(G7/G9)

Issue AC は「DENY/UNKNOWN/例外/タイムアウトが fail-closed」と「移行前後で判定結果と復旧可能性が変わらない」を併記するが、G9(`amadeus-sensor.ts:19-31` の真理値表: script-error/bad-output → PASSED)は fail-open であり、素朴に読むと両立しない(reviewer-1 観測事実 C)。どう裁定するか。

A. fail-closed AC は Runtime の**集約規則**(適用対象ガードの verdict 集合に DENY/UNKNOWN/例外/タイムアウトがあれば遷移不確定)に適用し、G9 の真理値表(sensor 実行異常を PASSED へ潰す)は「個別ガードが判定するポリシー内容」として Issue の対象外節どおり**無変更**とする。G9 の fail-open は既知の逸脱として要件に明記し、是正は別 Issue 起票候補とする
B. G9 の真理値表を fail-closed へ変更し、無変更回帰 AC を正常経路に限定する
C. G7/G8/G9 系(blocking sensor)を移行対象から除外する

[Answer]: A — 自動裁定(AUTO_DECIDED `auto-decision-a5efe30f1afface8791be74491068e72`、basis=agent-recommendation、Issue 対象外節「個別ガードが判定するポリシー内容の変更」の実文適用 + reviewer-1 観測事実 C の切り分け提案から導出。B は無変更回帰 AC と対象外節に違反、C は移行 AC の無申告スコープ縮小)。承認: 2026-08-13T16:15:38Z

X. Other (please specify)

## Q3: harness hook 層の扱い(G30 二重実装 / G40 PreToolUse deny)

ガードは CLI ツール層と harness hook 層の 2 層に分かれる(park 拒否は state.ts と Stop hook の二重実装、subagent model guard は PreToolUse deny)。単一 Runtime の射程に hook 層を含めるか。

A. 本 intent の Runtime は CLI ツール層(権威ある状態遷移を commit する経路)に限定する。hook 層は防御の別レイヤ(defence-in-depth)として現状維持し、要件のスコープ外節に根拠付きで明記する — 状態遷移の正本は常に CLI 層で確定し、hook 層は遷移を commit しないため「迂回不能」AC は CLI 層の chokepoint で成立する
B. hook 層のガードも Runtime の Adapter として登録し、hook から Runtime を呼ぶ
C. hook 層の二重実装(G30)を削除して CLI 層一本化する

[Answer]: A — 自動裁定(AUTO_DECIDED `auto-decision-ada1d046010d4a2412f3166fe29a029a`、basis=agent-recommendation、状態遷移の commit は CLI 層のみで行われる実測(G40 は spawn 拒否であり遷移 commit ではない、G30 hook は defence-in-depth と実装コメントが自認)から導出。B は harness 依存の別配線を増やし P5 に反する、C は防御層の削除で Issue 対象外)。承認: 2026-08-13T16:15:38Z

X. Other (please specify)

## Q4: 新規機構 vs 既存機構の昇格(reuse inventory の裁定)

reviewer-2 の中心的発見: stage 完了 checkpoint には宣言駆動の proto-runtime(`verifyBlockingSensors` G7/G8 — 宣言的適用解決+監査受領証+fail-closed)が既存で、`IntentOperationGuardResult`(G38)は recovery 付き判別ユニオンを既に持つ。inception ノルムは reuse inventory(新規機構は既存で代替できない根拠がある場合のみ)を課す。Runtime をどう構成するか。

A. 新規の独立 Runtime を起こさず、**既存機構の汎化・昇格**で構成する: 共通 Interface(checkpoint/context を受け verdict を返す)を新設し、その結果型は G38 系(`{kind, error:{recovery}}` 判別ユニオン)を拡張(ALLOW/DENY/UNKNOWN/NOT_APPLICABLE + 理由/証跡/policy identity/対象 revision/復旧案)、適用解決・監査受領証・fail-closed 集約は G7/G8 の宣言駆動様式を checkpoint 汎化して流用する。ユーザ空間 Adapter の登録 Seam は既存 sensor サブシステムの登録面(`.claude/sensors/*.md`、dormant 実例 `amadeus-sensor-self-scope-consistency.ts`)を信頼区分付きで流用し、消費者ゼロの新規登録スロットを先行着地させない(inception ノルム整合)
B. 独立した新規 Lifecycle Guard Runtime モジュールをゼロベースで新設し、既存機構は Adapter として包む
C. Interface 定義のみ本 intent で着地し、移行は後続 intent に分割する

[Answer]: A — 自動裁定(AUTO_DECIDED `auto-decision-b0fb4e59bec0d8a873305f569c245700`、basis=agent-recommendation、inception ノルムの reuse inventory 義務 + 先行着地禁止(E-PM9 C7)+ 意図ベースの重複排除 + reviewer-2 中心的発見(proto-runtime 既存)から導出。B は 39 件目の重複語彙と二重実装を生む、C は先行着地禁止に正面から抵触)。承認: 2026-08-13T16:15:38Z

X. Other (please specify)
