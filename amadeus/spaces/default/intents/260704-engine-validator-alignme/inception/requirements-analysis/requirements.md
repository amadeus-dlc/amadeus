# Requirements — エンジンと validator の許可値不整合の解消

Intent: 260704-engine-validator-alignme（bugfix scope、Minimal depth）
Source: GitHub Issue #455（主）、Issue #446（包含）、requirements-analysis-questions.md の確定回答

## Intent 分析

エンジンが機械的に書き込む値を `AmadeusValidator` が許可値外として fail にする不整合が、2 回のワークフロー実行（Issue #442、#445）で計 3 種類再現した。
いずれも conductor の手動補正で pass させており、補正の運用コストと補正ミスのリスクが残っている。
本 Intent の目的は、intent-birth 直後からワークフロー完了直後までの record に対して、手動補正なしで validator が pass する状態にすることである。

## 機能要件

### FR-1 registry status の正準化

- FR-1.1: `in_progress` を正準とし、`intent-birth` が `intents.json` に書く status を `in-flight` から `in_progress` に修正する。
- FR-1.2: validator の許可値（`AmadeusValidator.ts` の `registryStatusValues`）は現行の `in_progress / parked / completed / complete` を維持しつつ、既存 record に残る `in-flight` を後方互換として許容する。

### FR-2 phase イベント照合の case-insensitive 化

- FR-2.1: validator（`lifecycle-v2.ts` の `checkPhaseEvents`）の phase 名照合を大文字小文字非依存にする。
- FR-2.2: `PHASE_VERIFIED` と `PHASE_SKIPPED` の両方で、エンジンが実際に記録する小文字表記（例 `**Phase**: ideation`）と既存 record の大文字表記の両方が pass する。
- FR-2.3: エンジン側の表記と記録済み audit イベントは変更しない（org.md の書き換え禁止に従う）。

### FR-3 `repos` フィールドと `Construction Autonomy Mode` の解消

- FR-3.1: `intent-birth` が registry エントリに `repos` 配列の既定値を書く。
- FR-3.2: state 初期化が `aidlc-state.md` に `Construction Autonomy Mode` の既定値（unset）を書く。
- FR-3.3: validator は既存 record のために、両フィールドの未設定も許容する。

### FR-4 `amadeus-learnings.ts surface` の memory カウントずれの修正

- FR-4.1: canonical 見出し配下にエントリがある memory.md に対して `memory_entries_total: 0` を返す事象（record path の phase 解決が `spaces` になる）の原因を特定する。
- FR-4.2: 原因を修正し、該当ケースで実エントリ数を返すことをテストで検証する。

## 非機能要件

- NFR-1: 修正前に fail する検証（RED）を追加してから修正する（dev-scripts のルールに従う）。
- NFR-2: 既存 record（`aidlc/spaces/**`）を書き換えずに validator が pass する。

## 受け入れ条件

- AC-1: intent-birth 直後からワークフロー完了直後までの record に対して、手動補正なしで `AmadeusValidator` が pass する。
- AC-2: 既存 record を書き換えずに pass する。
- AC-3: `npm run test:all` が pass する。

## 制約

- 記録済み audit イベントの書き換えは org.md により禁止されている。
- Issue #445 でエンジン内部の名前空間改名が完了しているため、Issue 記載のファイル path は現構成（`.agents/amadeus/tools/` と `.agents/skills/amadeus-validator/validator/`）に読み替える。

## 前提

- Issue #455 と #446 に記録された 3 種類の不整合と付随観測は、2 回のワークフロー実行で再現済みの事実として扱う。
- 正準の選定（Q1）、解消側の選定（Q2）、照合方式（Q3）、範囲（Q4）は requirements-analysis-questions.md で確定済みであり、後続ステージで再確認しない。

## 範囲外

- 既存 record の遡及的な書き換えや正規化。
- validator の本 Intent 対象外の検査項目の変更。
- workspace-detection の Greenfield 誤判定の修正（本ステージの diary に観測として記録済み。別 Issue 候補）。

## 未解決事項

- `repos` 既定値の具体的な導出方法（検出したリポジトリ名を書くか、空配列を書くか）は code-generation で `intent-birth` の実装を確認して決める。

## Review

レビュー担当: amadeus-product-lead-agent（requirements-analysis ステージ）

- トレーサビリティは良好である。FR-1 は Q1=B、FR-2 は Q3=A、FR-3 は Q2=C、FR-4 は Q4=A にそれぞれ対応し、確定回答から逸脱した要件や回答に紐づかない要件はない。
- 受け入れ条件 AC-1 から AC-3 は Issue #455 の受け入れ条件と一致する。Issue #446 の「修正前に fail する検証を追加してから修正する」は NFR-1 で担保されている。
- org.md の記録済み audit イベント書き換え禁止は、FR-2.3 と制約セクションの両方で明示されており、Q3=A（validator 側を case-insensitive にする）と整合する。
- 範囲は Minimal depth に適合している。範囲外セクションで既存 record の遡及書き換え、対象外の検査項目、workspace-detection の別件観測を明示的に除外しており、要件の水増しはない。
- 軽微な指摘 1: FR-1.2 の「`in-flight` を後方互換として許容する」は、現行の `registryStatusValues` に `in-flight` が含まれないため許可値への追加を意味する。Q1 選択肢 B の「validator は変更しない」という文言と表面上は食い違うが、同じ選択肢の「`in-flight` は許容値に残す」の意図を正しく汲んでおり、実装者が迷う余地はない。
- 軽微な指摘 2: FR-2.2 の例示は `**Phase**: ideation` のみだが、Issue #446 は `PHASE_VERIFIED` の本文が `**Phase boundary**: initialization → inception` 形式になることも記載している。case-insensitive 照合はどちらの形式にも作用するため要件として不足はないが、テスト設計時に両形式をケースに含めることを推奨する。
- 軽微な指摘 3: NFR-2 と AC-2 は同内容の重複である。判定には影響しない。
- `repos` 既定値の導出方法が未解決事項として残るが、FR-3.3 で validator が未設定も許容するため、どちらの既定値でも AC-1 の成立を妨げない。code-generation への先送りは妥当である。

Verdict: READY
