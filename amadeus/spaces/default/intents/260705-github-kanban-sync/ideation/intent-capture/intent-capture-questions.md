# Intent Capture 質問（260705-github-kanban-sync）

対象 Issue: [#470 エージェント並行作業の可視化: Intent/Issue の GitHub kanban](https://github.com/amadeus-dlc/amadeus/issues/470)

Issue #470 に背景、確定した判断、未確定事項が記録済みである。
この質問票は、Intent の土台（業務課題、顧客、成功指標、トリガー、初期スコープ信号）を確定させることだけを扱う。
方式の詳細（列定義、Agent 表示粒度、Projects 設置先）は Inception 以降の段階で扱う。

---

## Q1. この可視化が解決する中心の業務課題はどれですか？

A. 並行作業の担当状況が不明である（どの Intent / Issue をどのエージェントが作業中か分からない）
B. 承認待ちゲートの滞留を検知できない
C. Intent と GitHub Issue の構造的な紐付けが無い
D. 人間への進捗報告に手間がかかる
E. A を主、B を従とする複合課題
X. Other (please specify)

[Answer]: E

## Q2. この kanban の主要な利用者は誰ですか？

A. Maintainer（人間、ゲート審査官）だけ
B. Maintainer とエージェントの両方（エージェントも並行可否判断の入力として board を読む）
C. Maintainer、エージェント、将来の外部コントリビュータ
X. Other (please specify)

[Answer]: A

## Q3. 成功をどう測りますか？（select all that apply）

A. 進行中の全 Intent の担当エージェント、phase / stage 状態、worktree、紐付く Issue が kanban で一覧できる
B. 並行可否判断と承認待ち確認にかかる時間が、`aidlc-state.md` の横断 grep より短くなる
C. 承認記録の取り残し（放置ゲート）を kanban 上で発見できる
D. 手動同期の操作なしで board が実況に追従する（hook 起動 sync が機能する）
X. Other (please specify)

[Answer]: A, B, C, D, X（追加要望: どのホストで動いているかも一覧できること。audit shard 名の host-clone 識別子を表示項目に含める）

## Q4. この Intent のトリガー（なぜ今か）はどれですか？

A. 複数 worktree の並行運用が定着したのに、把握手段が `aidlc-state.md` の横断 grep しか無いため
B. 直近で並行作業の衝突または重複着手が実際に発生したため
C. 将来のエージェント数拡大に備えた先行投資のため
X. Other (please specify)

[Answer]: A

## Q5. この Intent で扱う範囲（初期スコープ信号）はどれですか？

Issue #470 の実施候補は、①台帳整備（intents.json への issues フィールド追加）、②kanban-sync.ts 手動実行版、③hook 結線、④GitHub Actions 補完（任意）の 4 段階である。

A. ①〜③ を本 Intent で実施する（④ は後続）
B. ①〜② を本 Intent で実施し、③ hook 結線は後続 Intent に分ける
C. まず方式 C（Markdown ボード生成）の最小試作だけ行い、Projects v2 化は後続で判断する
D. ①〜④ すべてを本 Intent で実施する
X. Other (please specify)

[Answer]: A
