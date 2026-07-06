# Requirements：260706-guide-ops

## Intent 分析

### 目的

Issue #568（#533 epic の子）として、利用者ガイドの操作系 3 章（06-agents / 07-interaction-modes / 12-cli-commands）を日英で新設する。達成したい状態は、目次（docs/guide/index）の予定一覧のうち該当 3 行が実リンクへ変わり、#533 の作業規範（丸コピー禁止 / 実測駆動 / 日英併置 / 上流ドリフト同型を作らない）を満たす章が存在することである。

### 上流の位置づけ

- 要求の正は Issue #568 とディスパッチ定型文（reverse-engineering 宛 DECISION_RECORDED に転記済み）。章番号（06 / 07 / 12）は前 Intent（260706-guide-intro）が確定した index の予定一覧と子 Issue 対応表に従う。
- 消費する上流成果物は codekb の business-overview / architecture / code-structure（620beb5e 基準へ鮮度確認済み。#554 / #573 の外科更新込み）。ガイド本文の記述の正は codekb ではなく実体（agents / protocols / utility help の実出力）とする。
- 執筆様式の正は前 Intent の docs/guide/ 4 対（英語見出し + `.ja.md` 併置 + Cross-linking rules。lifecycle の対訳は `.ja.md` が実在）。

## 機能要求

### FR-1: 06-agents 章（英日）

- FR-1.1: agent とは何か（stage の lead / support として persona を務める。conductor が読み込む flat file）、実在する 14 agents（`.agents/amadeus/agents/` 実測: 11 domain agents + reviewer 2 種 + composer）の分類と役割、reviewer（gate 前の独立レビュー）と composer（/amadeus compose のディスパッチ先）の位置づけを書く。
- FR-1.2: 個別 agent の詳細は列挙せず、stage graph の lead/support 対応は stage-catalog / lifecycle 契約へ委ねる（BR-3 継承 = 契約の複製をしない）。

### FR-2: 07-interaction-modes 章（英日）

- FR-2.1: 質問と回答の 4 モード（Guide me / Grill me / I'll edit the file / Chat。利用者が画面で選ぶ実際の 4 択 = question-rendering.md の Mode selection。すべて questions ファイルへ収束）を書く。Grill me を選ぶと amadeus-grilling のブリッジプロトコル（一問ずつ + 推奨回答つき）へ委譲されることを明示する。questions ファイルの形式（`[Answer]:` タグ、A〜E + X (Other)）も扱う。粒度の判断: 章は利用者が実際に見る 4 択（render 層）を正として書き、protocol 契約層（stage-protocol.md の 3 モード + harness 側の Grill me 挿入）の関係は 1 文の補足に留める。
- FR-2.2: gate（Approve / Request Changes）と質問モードの関係（モード選択はステージ実行中、gate は完了時）を利用者視点で書く。

### FR-3: 12-cli-commands 章（英日）

- FR-3.1: `/amadeus` の command 一覧（scopes / utilities / stage runner）を `amadeus-utility.ts help` の実出力（隔離 workspace で採取済み: help-output.txt）を正として書く。長い出力は省略明示付き実物を貼る。
- FR-3.2: 利用者がよく使う read-only 系（--status、intent、space、doctor）とワークフロー系（compose、--stage <slug> --single）の使い分けを help の記述粒度で案内する。エンジン内部コマンド（orchestrate next / report）は 02 章へリンクで委ね、複製しない。

### FR-4: index 更新（英日）

- FR-4.1: index の予定一覧のうち 06 / 07 / 12 の 3 行を実リンク + Available / 執筆済み へ更新する。

## 非機能要求

- NFR-1: 実測駆動 — コマンド例・出力例は隔離 workspace の実行結果のみ（省略「…」と `<workspace>` 置換は明記）。
- NFR-2: 丸コピー禁止 — 上流 docs/guide の対応章本文を開かない。検証は前例と同じ（stage reviewer が上流対応章と突き合わせ、固有名・コマンド名・path を除く文単位の逐語一致 0 件）。あわせて上流ドリフト同型（文書と実装の乖離）を作らないため、機能の記述は実装ファイル（agents / protocols / question-rendering / utility help）を正とする（#533 規範 4）。
- NFR-3: 言語 — 英語 `*.md` = 正、`*.ja.md` 併置、Cross-linking rules（ja からは対訳実在分を .ja.md）。日本語版は japanese-tech-writing 規範（「実実行」等の字面重複語は使わない）。
- NFR-4: reviewer（Codex / GPT-5.5）の初見読者レビューを 1 回以上（合否 = High 相当 0 件または対応完了、decision 記録、High は leader 一報）。
- NFR-5: 新設 6 ファイル + index 対の全リンク機械検査で broken 0 件を PR 説明に記載（scratchpad の一時スクリプト、コミットしない）。

## 制約

- C-1: 変更対象は新設 6 ファイル（3 章の英日対）+ index.md / index.ja.md の該当 3 行ずつ（計 6 行）に限る。
- C-2: skills/ 配下のパスを引用する場合、#572（三層化 Phase 2）で変わりうることを意識し、merge 順で後になったら追随する（ディスパッチ注記）。
- C-3: validator + `npm run test:all` を実行し記録。draft PR → 3 条件で Ready → merge 依頼。merge は人間。
- C-4: 執筆順は 06 → 07 → 12（agent 概念が 07 の grilling 文脈と 12 の compose 説明の前提になるため）。

## 前提

- A-1: 基点は origin/main = 620beb5e（PR #578 merge 後。index の予定一覧が存在する）。
- A-2: 実測環境は前 Intent の隔離 workspace（guide-ws2、#577 修正後の main で導入済み）を再利用する。help 出力は採取済み。

## スコープ外

- 他の残章（#567 / #569〜#571）。agent 個別ガイド。stage-catalog / lifecycle 契約の内容変更。

## 未解決事項

なし（小さな構造判断は questions ファイルに記録し、gate の承認で確定する）。
