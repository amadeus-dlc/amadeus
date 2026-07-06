# Business Logic Model — pr-gate-discipline

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更の全体構成

| 対象 | 種別 | 内容 |
|---|---|---|
| `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md` | 新規 | 知識文書の本体（英語）。監視手順と判断基準の 8 項目（FR-3） |
| skills/ 側正準ソースへの反映 | 不適用 | FR-5.2 は実測により不適用と確定（`amadeus-common/` と `knowledge/amadeus-shared/` に skills/ 側対応ファイルは存在せず、`.agents/amadeus/` 配下が唯一の正。`skills/amadeus/references/aidlc-v2/` は上流スナップショットで同期先ではない）。詳細は business-rules.md の parity 節 |
| `aidlc/spaces/default/memory/team.md`「PR 監視」節 | 編集 | 不変条件 + ポインタへ短縮（3〜4 行）。固有名（Devin、CodeRabbit、Bugbot、codecov.yml）は例として残す（FR-2.1、FR-4） |
| `aidlc/spaces/default/memory/phases/construction.md` | 編集 | 新 H2 節「PR Gate」に不変条件 4 行相当（FR-2.2、Q3=A） |
| `.agents/amadeus/amadeus-common/protocols/stage-protocol.md` | 編集 | 「Construction Bolt gates」節末尾に不変条件 1〜2 行 + 参照 1 行（FR-2.3、Q2=A） |
| `dev-scripts/data/parity-map.json` | 編集 | `exceptions[]` の #531 由来エントリ（target に stage-protocol.md を含む）の target / reason へ理由統合（FR-5.1。新規エントリを作らない。`engineFileExceptions` は宣言済みで変更不要） |

## 知識文書の章立て（英語、8 項目 → 6 節）

Issue #534 の内容 8 項目を、実行順に沿う 6 節へ配置する。

1. **Invariants** — FR-1 の 4 不変条件の再掲（ルール側との一致を保つ正本参照）。
2. **CI first** — CI エラー（conflict 含む）を review comment より先に解消する手順（項目 1）。
3. **Wait for review bots** — 反応中の判定方法と、長い sleep で監視間隔を作らない理由 = 投稿の取りこぼし（項目 2）。
4. **Respond to every comment** — トップレベル・インライン全対応、反映時は対応内容を返信、非対応時は理由を返信（項目 3）と、偽陽性の判断手順 = PR の主旨・実コードとの突き合わせ（項目 4）。
5. **Escalation** — 目的と異なるが有効な指摘の Issue 化（起案は人間と leader。項目 5）、同じ指摘の繰り返し時の中断と人間エスカレーション（項目 6）。
6. **Merge readiness** — カバレッジエラーへの対処と検証設定変更による回避の禁止（項目 7）、merge 準備の完了条件と merge は人間が行うことの再掲（項目 8）。

ユーザー向け gate 文言・エラーメッセージは含めない設計とする（全文英語で完結し、NFR-1 のカーブアウトは発動しない）。

## 移設マッピング（個人 CLAUDE.md → Amadeus）

| 個人 CLAUDE.md の規律 | 移設先 | 一般化 |
|---|---|---|
| まず CI エラーを解消（conflict 含む） | 知識文書 §2 | そのまま（既に一般） |
| レビューボット待機（Devin は遅い） | 知識文書 §3 | 「応答が遅いボットも必ず待つ」へ一般化。Devin の名は team.md の例に残す |
| sleep で長い監視間隔を作らない | 知識文書 §3 | そのまま（理由 = 投稿の取りこぼしを明記） |
| 全コメント対応・返信規律 | 知識文書 §4 | そのまま |
| 偽陽性の判断 | 知識文書 §4 | そのまま |
| スコープアウトの Issue 化 | 知識文書 §5 | そのまま（起案者の限定は workspace 運用のため team.md 側にも残る） |
| 繰り返し指摘での中断 | 知識文書 §5 | そのまま |
| カバレッジエラー対応（codecov.yml 変更禁止） | 知識文書 §6 | 「カバレッジ検証設定の変更による回避の禁止」へ一般化。codecov.yml の名は team.md の例に残す |
| merge は人間へ委譲 | 知識文書 §6 + ルール側不変条件 | そのまま |

## 検証フロー（Q4 = A）

1. build-and-test で、ルール側 3 ファイル（team.md、phases/construction.md、stage-protocol.md）の参照文字列が知識文書の実在パスへ解決することを決定論的に確認する（先に失敗する検証を書く。dev-scripts ルールの TDD 要求）。
2. 文面の妥当性（不変条件の一致、分量上限、重複の不在）は reviewer と gate の目視に委ねる。
3. validator（Intent 指定込み）と `npm run test:all` の pass を記録する（NFR-3）。
