# Requirements：260705-agmsg-trial-docs

## Intent 分析

### 目的

Issue #497（agmsg による 4 体 Claude Code 連携の試行運用規約）の残作業を 1 Intent として実施し、試行 1 周を規約どおり通過させる。達成したい状態は次の 3 点である。

1. leader のディスパッチ定型文と中継承認定型文が、必須項目定義・テンプレート・実例の形で確定している。
2. agmsg のチーム名と配信モードの実機確認結果が、観察された制約とともに記録されている（#497 未確定事項の解消）。
3. 適用条件「本体制はデフォルトではなく、チーム構成を取れる場合だけの働き方」が明文化されている。

本 Intent の実行過程そのものが #497 受け入れ条件（承認経路、ピア協議、HUMAN_TURN の mint 規律、validator / test:all の pass）の検証を兼ねる。

### 上流の位置づけ

- 試行規約の正は Issue #497 である（確定判断 12）。intent-statement と scope-document は scope（refactor）により SKIP のため存在せず、Issue #497 とディスパッチ定型文（state-init 宛 DECISION_RECORDED に転記済み）が上流入力を代替する。
- コードベース知識は既存の `aidlc/spaces/default/codekb/amadeus/`（business-overview、architecture、code-structure ほか。PR #496 で全面更新済み、reverse-engineering ステージで採用済み）を参照する。
- チームの働き方（team-practices 相当）は `aidlc/spaces/default/memory/team.md` の並行運用ポリシーと Git Branching Policy を参照する。

## 機能要求

### FR-1: 定型文の確定文書

- FR-1.1: ディスパッチ定型文について、必須 4 項目（承認者・承認日時・対象 Issue と scope・承認要旨）の定義、テンプレート、本 Intent で実際に使われた実例（2026-07-05T14:18:59Z 受信文面）の 3 点を記録する。
- FR-1.2: 中継承認定型文について、必須項目（承認者・承認日時・対象（Intent と対象ステージまたは Bolt）・承認要旨・HUMAN_TURN mint 指示）の定義、テンプレート、本 Intent で実際に使われた実例（2026-07-05T14:31:02Z 受信文面）の 3 点を記録する。HUMAN_TURN mint 指示を必須項目に含める根拠は、#497 確定判断 8（中継承認定型文の受信直後に限り mint する）と、実例の末尾に mint 指示が実際に含まれていることの 2 点である（前提 A-3 も参照）。
- FR-1.3: 定型文文書はユーザー向け gate 文言と同様に日本語で書く。

### FR-2: agmsg 実機確認結果の記録

- FR-2.1: 確認できた事実を記録する。少なくとも、チーム名 `amadeus` での 4 体構成（leader + engineer1〜3）、join / actas 排他ロックの動作、配信モード `monitor` の採用と動作、send / inbox による送受信、ピア協議（3 宛送信・期限 15 分・回答 1 件成立）の実働を含む。
- FR-2.2: 観察された制約を記録する。少なくとも、Monitor 通知でのメッセージ本文切り詰め（約 400 字超で truncated、全文取得には inbox.sh の再実行が必要）、配信遅延（約 5 秒）を含む。
- FR-2.3: 事実と制約は、観測時刻または証跡（audit、agmsg 履歴）から追跡できる粒度で書く。

### FR-3: 適用条件の明文化

- FR-3.1: 成果物文書の冒頭に「適用条件」節を置き、「本体制はデフォルトではなく、チーム構成を取れる場合だけの働き方」であることを明文化する。
- FR-3.2: 同じ節に、team.md（steering）への統合は後続 Intent の起票で行うという引き継ぎを明記する（確定判断 12 との整合）。

### FR-4: 記録先と正の一本化

- FR-4.1: FR-1〜FR-3 の成果物は、本 Intent record の Construction 成果物として置く。`docs/amadeus/` への新設や `team.md` の直接更新は行わない。
- FR-4.2: merge 後の Issue #497 コメントへの転記は leader が行う（本 Intent のスコープ外の後続動作として引き継ぎに明記する）。

## 非機能要求

- NFR-1: 成果物は日本語で書き、`japanese-tech-writing` skill の規範に従う。機械可読ラベルは英語のまま使う。
- NFR-2: 各成果物文書は required-sections sensor（H2 見出し 2 個以上）を満たす。
- NFR-3: 事実の記述は出典（Issue、audit イベント、agmsg 受信時刻）を明示し、未確認の値は `未確認` と書く（Grounding）。

## 制約

- C-1: scope は refactor（docs 系）であり、実装コードとテストコードの変更を含まない。
- C-2: 試行規約の正は Issue #497 に一本化する（確定判断 12）。本 Intent の成果物は record 成果物であり、正の複製を repo 恒久文書として増やさない。
- C-3: Bolt は直列実行とし、PR の merge は人間が行う。
- C-4: `codekb/amadeus/` は本 Intent で変更しない（reverse-engineering ステージのピア協議 Q1 採用判断）。
- C-5: 承認系の判断（gate 承認、Intent 承認）は leader 経由で人間へエスカレーションし、HUMAN_TURN は中継承認定型文の受信直後だけ mint する（#497 確定判断 6・8）。
- C-6: FR-1 の「実例」の原文は、agmsg Monitor 通知の切り詰め（FR-2.2）の影響を受けない形で保全済みである。保全先は本ステージの [received-messages.md](received-messages.md)（inbox.sh で再取得した全文）であり、Construction はこれを情報源にする。agmsg 履歴ストア（history.sh）にも同文があるが、保持期間は `未確認` のため record 側を正とする。

## 前提

- A-1: leader のディスパッチ定型文（14:18:59Z）と中継承認定型文（14:31:02Z）の実文面が、確定版テンプレートの基礎として妥当である（承認者 j5ik2o の chat 指示に基づき leader が作成したため）。
- A-2: 本セッションで観察した agmsg の挙動（切り詰め・遅延）は、engineer2 / engineer3 のセッションでも同様に観察されており（ピア協議回答で確認）、環境固有ではない。
- A-3: 中継承認定型文の必須項目に「HUMAN_TURN mint 指示」を含めるのは、ピア協議 Q2 で確定した 3 点セット形式（必須項目定義 + テンプレート + 実例）に対する requirements-analysis 側の項目追加である。根拠は #497 確定判断 8 と実例（14:31:02Z）への実在の 2 点であり、ピア協議・人間承認で個別確認された項目一覧ではない。gate の人間承認をもって確定とする。

## スコープ外

- team.md（並行運用ポリシー、Git Branching Policy）と project.md（Corrections）への反映（#497 実施候補 4 の後続 Intent）。
- Issue #497 コメントへの転記（merge 後に leader が実施）。
- codekbRepoName の basename フォールバックで worktree 名が repo キーに漏れる問題の修正（後続 Issue 候補。試行完了後に leader が起案）。
- agmsg 自体の機能改善（切り詰め・遅延への対処）。

## 未解決事項

- O-1: 成果物文書の分割単位（1 文書 3 節構成か、定型文 / 実機確認 / 適用条件の分冊か）は functional-design で決める。
- O-2: 手すき engineer の待機時役割の詳細は #497 側の未確定事項であり、本 Intent の判断で除外したものではない。上流（Issue #497）の確定を待つ。
