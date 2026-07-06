# Requirements Analysis Questions：260705-persist-cid-metamain

回答方法: 各質問の `[Answer]:` に選択肢の記号（A〜E または X）を記入する。X（Other）の場合は内容を併記する。

## Q1: #504（learnings persist の cid 衝突無言 no-op）の解消方式

Issue #504 の実施候補を起点に、重複判定の設計を確定する。

前提整理（本ステージで実測済み）:

- cid marker（`<!-- cid:<stage>:<cN> -->`）の本来の目的は idempotency（同じ選択の再 persist を二重追記しない）である。衝突の原因は、candidate_id が Intent ごとに c1 から振り直されるのに、marker が Intent を含まないことにある。
- 既存の steering（project.md / team.md）には旧形式 marker が多数存在する。これらの一括改稿は audit 的に望ましくない（追記型資産）。
- 現行 persist の戻り値（rule_learned 件数）は no-op を検出せず、書けなかった learning も「learned」に数えられる（実例: 260705-docs-codekb-guards の c5、c7 へ振り直して回避）。

A. 重複判定キーへ Intent を追加し（新規追記分の marker を `cid:<dirName>:<stage>:<cN>` 形式にする。既存 marker は改稿しない）、かつ既存旧形式 marker との衝突などで追記をスキップした場合は明示報告する（戻り値の件数を appended / already-present に分離し、already-present を rule_learned に数えない）（Issue 候補 3 相当）。
B. marker 形式は変えず、衝突検出時に非ゼロ終了して呼び出し元に振り直しを促す（Issue 候補 2）。
C. 重複判定を marker ではなく learning 本文の内容一致（正規化ハッシュ）へ変更する。
D. 修正せず、振り直し運用（c5→c7 の前例）を文書化するに留める。
X. Other（具体案を記載）

[Answer]: A（ピア協議 2026-07-05T23:36Z、engineer2 回答で成立、engineer1・leader が追認 = 3 名一致）。設計への取り込み: (1) dirName 込み cid は衝突の構造的解消に加え、cid 単独で出所 Intent を追跡可能にする（engineer2 は #502 で衝突回避の目視連番と reviewer 指摘を実地に踏んだ当事者）。(2) 戻り値の appended / already-present 分離により「同一 selections の 2 回目 persist が rule_learned を増やさない」冪等性 eval を直接書ける。leader 条件: この分離を先に RED にすること、既存 marker の非改稿（org.md の記録不改変と整合）。(3) 照合の扱いは engineer1 の実装注意を採用: 書き込み・照合とも新形式のみで統一する。旧形式 marker を照合キーに使うと Intent 不明のため元バグ（別 Intent との誤一致）が再発するので不可。pre-fix learning を同じ Intent が再 persist する稀なケースは重複 append を許容し、報告で表面化させる（無言でない重複は検出可能）。旧 marker 共存ケースを eval で 1 本 pin する。engineer2 の二段照合案はこの分析により不採用（旧形式は照合対象にしない）。
