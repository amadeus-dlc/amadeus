# Business Logic Model — agmsg-trial-docs

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 成果物文書の構成（O-1 の確定）

成果物は 1 文書 3 節構成とし、`construction/agmsg-trial-docs/code-generation/` に `multi-agent-trial-record.md` として生成する。

| 節 | 内容 | 対応要求 |
|---|---|---|
| 1. 適用条件 | 本体制はデフォルトではなくチーム構成を取れる場合だけの働き方であること。team.md への統合は後続 Intent の起票で行う引き継ぎ | FR-3.1、FR-3.2 |
| 2. 定型文 | ディスパッチ定型文と中継承認定型文それぞれの必須項目定義、テンプレート、本 Intent の実例 | FR-1.1〜FR-1.3 |
| 3. agmsg 実機確認結果 | 確認できた事実と観察された制約 | FR-2.1〜FR-2.3 |

分冊にしない理由: FR-3.1 が単一文書の冒頭配置を前提とし、3 節は同じ適用条件を共有するため（分冊は適用条件の重複か参照分散を生む）。

節 1 の引き継ぎは 2 件を併記する: (1) team.md への統合は後続 Intent の起票で行う（FR-3.2）、(2) merge 後の Issue #497 コメントへの転記は leader が行う（FR-4.2）。どちらも本 Intent のスコープ外の後続動作であることを明記する。

## code-generation 向け実行方針

本 Intent の code-generation は docs 系 refactor であり、ステージ既定の「workspace root へのコード生成」契約から次のとおり意図的に逸脱する。

1. Step 4 の amadeus-developer-agent への workspace 向けコード生成の委譲は適用しない。実装コード・テストコードは生成しない（C-1、BR-4）。
2. code-generation-plan.md は文書執筆チェックリストとして書く（節 1 → 節 2 → 節 3 の順に執筆し、実例は received-messages.md を出典に転記する）。
3. 成果物 multi-agent-trial-record.md は record dir（`construction/agmsg-trial-docs/code-generation/`）へ直接執筆する。ステージ既定の produces 2 件（code-generation-plan、code-summary）に 1 件を追加する意図的な逸脱であり、根拠は FR-4.1 / C-2（成果物を record 成果物に限定し、workspace root への恒久文書を作らない）である。
4. code-summary.md にこの逸脱（コード非生成、record dir への文書生成、produces 追加）を明記し、audit から追跡できるようにする。

前例との差異: 同日の 260705-ledger-pr-docs は成果物が repo root の既存文書（docs/amadeus/lifecycle/state.md）の編集だったためステージ既定の「workspace へ書く」に適合したが、本 Intent は FR-4.1 により record 成果物に限定するため、この実行方針の明文化が必要になる。

## 定型文の運用フロー

### ディスパッチ（Intent 承認の中継）

1. 人間（Maintainer）が leader へ chat で Intent 化を承認する。
2. leader がディスパッチ定型文（必須 4 項目 + 作業指示）を対象 engineer へ agmsg で送る。
3. engineer は受信文面から承認 4 項目を decision（DECISION_RECORDED）へ転記し、Intent birth を実行する。

### 中継承認（gate 承認の中継）

1. engineer が gate 到達を leader へ報告する（承認依頼を兼ねる）。
2. leader が人間判断を得て、中継承認定型文を engineer へ送る。
3. engineer は受信直後に HUMAN_TURN を mint し、承認経路（人間 → leader → engineer）を decision に明記して gate を通過する。

### ピア協議（技術的な内容確認）

1. engineer が質問（推奨案付き）を leader + 他 engineer 2 体の 3 宛へ送る。
2. 期限 15 分・回答 1 件で成立。0 件なら「協議不成立・自己判断」と記録して進む。
3. 採用判断は質問した engineer 本人が行い、協議参加者・採用案・採用理由を人間回答と区別して decision に記録する。

## 実機確認結果の記録手順

1. 本 Intent の実行過程で観測した事実（audit イベント、agmsg 送受信時刻）を時系列で拾う。
2. 事実と制約を分けて表にする。制約は Monitor 通知の切り詰め（約 400 字超で truncated、全文取得は inbox.sh 再実行）と配信遅延（約 5 秒）を含める（FR-2.2）。
3. 各項目に観測時刻または証跡を付ける（FR-2.3）。値が確認できない項目は `未確認` と書く（NFR-3）。

## 実例の転記手順

実例は [received-messages.md](../../../inception/requirements-analysis/received-messages.md) の保全原文を出典として転記する（C-6）。Monitor 通知の切り詰め文面や記憶からの再構成は使わない。
