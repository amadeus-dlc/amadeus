# Requirements：260706-guide-intro

## Intent 分析

### 目的

Issue #533（利用者ガイド epic）の第 1 弾として、利用者が導入から最初の workflow 実行まで辿れる導入 3 章と目次骨格を日英で新設する。達成したい状態は次の 3 点である（#533 の受け入れ条件の本 Intent 分担）。

1. ガイドの目次（章構成）と置き場所が確定し、導入 3 章（introduction / getting-started / first-workflow）が日英で存在する。
2. 全コマンド例が実測で検証されている（コピペで動く）。
3. 上流文書の転載がない（構成参考と明記した上で本文は Amadeus 実体から書き起こす）。

### 上流の位置づけ

- 要求の正は Issue #533 とディスパッチ定型文（reverse-engineering 宛 DECISION_RECORDED に転記済み。本 Intent の範囲 = 導入 3 章 + 目次骨格、残章は子 Issue #567〜#571 として起票済み）である。
- 消費する上流成果物は、reverse-engineering が鮮度確認した codekb の [business-overview](../../../../codekb/amadeus/business-overview.md)、[architecture](../../../../codekb/amadeus/architecture.md)、[code-structure](../../../../codekb/amadeus/code-structure.md)（3366cd69 基準）である。ガイド本文の記述の正は codekb ではなく実体（skill、エンジン、installer、README、docs/amadeus）とする。
- 上流 awslabs/aidlc-workflows（v2）の docs/guide/ 18 章構成は「構成の参考」に留める（#533 の作業規範 1 = 丸コピー禁止。本文の翻訳・転載をしない）。
- 言語は language-policy.md（英語 *.md = 正、*.ja.md 併置、Cross-linking rules）に従う。

## 機能要求

### FR-1: 置き場所と目次骨格

- FR-1.1: ガイドの置き場所（`docs/guide/` か `docs/amadeus/guide/` か）を functional-design で確定する（ディスパッチ指示 2。ピア協議可）。判断基準: (a) language-policy.md の対象範囲（現行は `docs/amadeus/*.md`）との整合、(b) 上流と同名 path の分かりやすさ、(c) 既存 docs 体系（契約・調査文書 = docs/amadeus）との責務分離。
- FR-1.2: 目次骨格（index）を日英で新設する。導入 3 章への実リンクと、残章（子 Issue #567〜#571 の 13 章 + agents / glossary / harnesses 相当）の予定一覧（未執筆マーカー + 子 Issue 参照）を含む。

### FR-2: introduction 章（日英）

- FR-2.1: Amadeus DLC が何か（AI-DLC v2 と意味論互換のライフサイクル契約、エンジン駆動、5 phase / 32 stages / 10 scopes）、誰のためか、何ができるかを Amadeus 実体から書き起こす。
- FR-2.2: 数値・名称は実体（stage-graph.json、scopes/、stage-catalog.md、AMADEUS.md）と一致させる（README #535 と同じ照合規律）。

### FR-3: getting-started 章（日英）

- FR-3.1: インストーラ（`scripts/amadeus-install.ts`、`npm run amadeus:install`）を正とする導入手順を書く（ディスパッチ承認要旨。PR #508 / #536 で確立した手順、README の Install into a Workspace 節と整合）。
- FR-3.2: 導入コマンド・post-install verification（doctor、validator）の実行例と出力例は、隔離 workspace でで実際に実行した結果を貼る（NFR-1）。

### FR-4: first-workflow 章（日英）

- FR-4.1: 導入済み workspace で最初の Intent を 1 周させる流れ（`/amadeus` 入口 → Intake / Birth 承認 → エンジン駆動のステージ進行 → gate 承認 → 完了）を書く。
- FR-4.2: 実測は隔離 workspace で行う（installer で導入 → エンジンの実コマンドで 1 Intent を回す）。エンジンコマンド（intent-birth、orchestrate next / report、utility status 等）の出力例は実物を貼る（ディスパッチ指示 3）。LLM 依存部（conductor の会話）は「何が起きるか」の説明とし、決定論的なエンジン出力だけを出力例として提示する。

## 非機能要求

- NFR-1: 実測駆動 — 全コマンド例は隔離 workspace（本番 `amadeus/` を変更しない一時ディレクトリ）で実際に実行して検証し、コピペで動くことを確認する。出力例は実物（無関係部の省略は「…」で明示）。
- NFR-2: 丸コピー禁止 — 上流 docs/guide の本文を翻訳・転載しない。構成を参考にした場合はその旨をガイド本文（目次または各章冒頭）に記す。上流ドリフト同型の問題（文書と実装の乖離）を作らないため、機能の記述は実装ファイルを正とする。検証方法: code-generation の stage reviewer が、上流の対応章（introduction / getting-started / first-workflow）と本文を突き合わせ、文単位の逐語一致（固有名・コマンド名・path を除く）0 件を合否基準として判定する。執筆側は各章の「構成参考」明記を自己チェックリストとする。
- NFR-3: 言語 — 英語 `*.md` = 正、`*.ja.md` 併置（language-policy.md、PR #536 / #563 の様式）。日本語版は japanese-tech-writing 規範。
- NFR-4: reviewer（Codex / GPT-5.5）の初見読者レビューを最低 1 回実施する。合否基準は前 Intent と同じ（High 相当 0 件または対応完了。decision 記録、High は leader 一報）。
- NFR-5: 新設ファイルと参照元の全リンクの解決可能性を機械検査し、broken 0 件を PR 説明に記載する（scratchpad の一時スクリプト、コミットしない）。

## 制約

- C-1: 変更対象はガイド新設ファイル群（英日対 + 目次）と、参照リンク接続のための既存文書の最小行（README / extension-guide への相互リンク。ディスパッチ指示 4）に限る。
- C-2: #524（上流との機能差一覧、未着手）へ依存する内容は書かない（必要箇所は pending-note 方式で #524 へ委ねる）。
- C-3: PR 作成前に validator + `npm run test:all` を実行し記録する。PR は draft で作成し、3 条件充足で Ready 化する（恒常ルール）。merge は人間。
- C-4: 執筆順は目次骨格 → introduction → getting-started → first-workflow（実測が最も重い first-workflow を最後にし、前 2 章の実測環境を再利用する）。

## 前提

- A-1: 基点は origin/main = 3366cd69（PR #563 merge 後）。`docs/guide/` は現在存在しない（実測確認済み）。
- A-2: engineer2 の #515〜#520（lifecycle 英語化）とは非接触（新設 dir。ディスパッチの接触面判断）。
- A-3: 残章は子 Issue #567〜#571 が受ける（本 Intent では目次骨格の予定一覧としてのみ言及）。

## スコープ外

- 導入 3 章以外の章の執筆（#567〜#571）。
- glossary の内容（#527 の責務整理と正の一致が前提）。
- 上流との機能差一覧（#524）。
- installer 自体の変更。

## 未解決事項

なし（置き場所の確定は FR-1.1 の判断基準に基づき functional-design で行う。小さな構造判断は questions ファイルに記録し、gate の承認で確定する）。
