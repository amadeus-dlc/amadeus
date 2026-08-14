# Requirements — Election CLI 多問対応

## Intent Analysis

本要件は [Intent Statement](../../ideation/intent-capture/intent-statement.md) と [Scope Document](../../ideation/scope-definition/scope-document.md) を、実装とテストで検証可能な契約へ展開する。Brownfield の現状は CodeKB の [Business Overview](../../../../codekb/amadeus/business-overview.md)、[Architecture](../../../../codekb/amadeus/architecture.md)、[Code Structure](../../../../codekb/amadeus/code-structure.md) を根拠とする。

目的は、一つの Election が複数の問いを扱い、問いごとの choice・GoA・留保を失わず、成立済みの問いを固定したまま保留中の問いだけを再実行できるようにすることである。既存の単問 Election と保存済みデータは意味的に後方読み取り可能にし、追記型履歴を維持する。

Resolved depth は Standard。変更は複数コンポーネントと状態機械へまたがるが、対象ドメインと受入条件が明確なため、15〜30 FR の Standard 契約が妥当である。

## Functional Requirements — Definition and Identity

### FR-DEF-1: Multi-question Aggregate

一つの Election は、1件以上の question を順序付き集合として直接所有しなければならない。各 question は自身の ID、質問文、1件以上の choices を持つ。

Acceptance criteria:

- 2件以上の question を持つ definition が parse される。
- 空の questions または空の choices を持つ question は fail-closed で拒否される。

### FR-DEF-2: Stable Question Identity

各 question は definition 作成者が指定する非空文字列 ID を持ち、同一 Election 内で一意でなければならない。ID は保存、配送、投票、集計、record、再実行を通じて不変である。旧単問 schema の decode だけは、FR-COMP-1 の予約 ID を決定的に補う例外とする。

Acceptance criteria:

- 重複 ID、空 ID、ID 欠落を拒否する。
- 質問文や配列位置を変更しても既存 ID の意味を暗黙に変更しない。

### FR-DEF-3: Question-owned Choices

choice の有効性と `internalNo` の一意性は question ごとに検証しなければならない。同じ `internalNo` は別 question では使用できる。

Acceptance criteria:

- ballot response の choice が参照先 question に存在しない場合は拒否する。
- 同一 question 内の重複 `internalNo` を拒否する。

### FR-DEF-4: Distribution View

各 voter の blind distribution view は、全 question の ID、質問文、当該 question の choices を含まなければならない。推薦、他 voter の票、peer status は含めない。

Acceptance criteria:

- view の question/choice 順序は同一入力に対して決定的である。
- blind independence の既存禁止フィールドが追加されない。

## Functional Requirements — Ballots and Resolution

### FR-BAL-1: Per-voter Responses

一つの voter ballot は `responses[]` を持ち、各 response は question ID、choice、GoA、留保、rationale を question 単位で保持しなければならない。

Acceptance criteria:

- question 間で choice・GoA・留保が混同されない。
- response の question ID 欠落、重複、未知 ID を拒否する。

### FR-BAL-2: Required Response Coverage

初回 original ballot は、その実行で投票対象となるすべての question へちょうど1件の response を含まなければならない。

Acceptance criteria:

- response の欠落と重複を fail-closed で拒否する。
- 再実行では対象となる hold question の集合だけを required coverage とする。

### FR-BAL-3: Question-keyed Amendment

amend ballot は、置換対象の原票参照に加えて、変更する question ID ごとの response を持たなければならない。

Acceptance criteria:

- amend は対象外または established の question を変更できない。
- voter × question ごとに最新の有効 response を一意に解決する。

### FR-BAL-4: Late Ballot Classification

late ballot の判定と受理可否は question ごとの集計境界を考慮し、既に established となった question の結果を変更してはならない。

Acceptance criteria:

- established 後に届いた response は当該 question の tally へ混入しない。
- 記録対象の late response は question ID を保持する。

### FR-BAL-5: Blind Pending Storage

pending lane と materialization は voter ごとの1ファイル構成を維持しつつ、responses の内容を完全に保存しなければならない。

Acceptance criteria:

- collecting 中に他 voter の response 内容を配布 view から観測できない。
- materialization 前後で全 response の意味が一致する。

## Functional Requirements — Tally and Mixed State

### FR-TAL-1: Per-question Tally

tally は各 question を独立に評価し、question ID ごとに established または hold の結果を返さなければならない。

Acceptance criteria:

- 各 result は question ID、choice ruling、GoA ruling、留保情報または hold reason を持つ。
- question ごとの票だけを用いて結果を計算する。

### FR-TAL-2: Mixed Result

同一 Election 内で established と hold が混在する結果を第一級データとして保存・返却できなければならない。全体を最悪 GoA または単一 hold に丸めてはならない。

Acceptance criteria:

- 2問中1問 established、1問 hold を損失なく表現する。
- CLI と record が双方の状態を同時に表示する。

### FR-TAL-3: GoA and Reservation Isolation

GoA consensus、reservation、rationale、choice counts は question ごとに集計しなければならない。

Acceptance criteria:

- ある question の低い GoA が別 question の GoA を引き下げない。
- reservation は voter と question の両方へ追跡できる。

### FR-TAL-4: Deterministic Ordering

question results、counts、reservations、record sections の順序は definition の question 順と既存の決定的ソート規則で固定しなければならない。

Acceptance criteria:

- 同一保存データから複数回 tally/render して同一の正規化結果を得る。
- JSON object の偶然の挿入順へ依存しない。

### FR-TAL-5: Early Tally Safety

early tally は question ごとに安全性を判定し、未投票 response が当該 question の裁定を変更できない場合だけ確定を許可しなければならない。

Acceptance criteria:

- 一つの question の早期確定が別 question の未投票状態を確定扱いにしない。
- 確定条件を満たさない question は collecting または hold のまま残る。

### FR-TAL-6: Tally Verification

保存済み tally の verify は versioned decoder で読み、canonical model 上の question completeness、ID、票解決、result を再計算して比較しなければならない。

Acceptance criteria:

- raw cast または JSON stringify のみで妥当性を判定しない。
- question result の欠落、重複、改ざんを fail-closed で拒否する。

## Functional Requirements — Hold-only Rerun

### FR-RER-1: Held Question Selection

再実行対象は、保存済み result が hold の question ID 集合から機械的に導出しなければならない。

Acceptance criteria:

- 手入力の質問文照合を必要としない。
- established の question ID は再実行対象へ含まれない。

### FR-RER-2: Established Result Preservation

一度 established となった question result は、その Election の後続再実行で変更または削除してはならない。

Acceptance criteria:

- 再実行前後で established result の canonical digest が一致する。
- established question への ballot/amend を拒否する。

### FR-RER-3: Partial Lifecycle

Election の global lifecycle と question results を分離し、hold question が残る間は mixed/partial 状態を表し、全 question が established となった時だけ全体 terminal established としなければならない。

Acceptance criteria:

- mixed 状態から hold question のみ collecting へ戻せる。
- hold が0件になった時に全体完了へ遷移する。

### FR-RER-4: CLI Rerun Contract

CLI の `next` / `report` / hold resolution は、対象 question ID、維持する established result、次に必要な操作を machine-readable directive で返さなければならない。

Acceptance criteria:

- conductor が directive だけで hold-only loop を実行できる。
- 単一 hold reason へ情報を丸めない。

## Functional Requirements — Persistence and Compatibility

### FR-COMP-1: Legacy Single-question Decode

既存の単問 definition、ballot、tally、registry、record を意味的に後方読み取りし、新 canonical multi-question model へ正規化しなければならない。旧 schema に存在しない question ID は、旧単問 decode 専用の予約 ID `legacy-question` として補い、ファイルパス、質問文、配列位置、読込時刻から生成してはならない。

Acceptance criteria:

- 旧 `question` scalar を1件の canonical question として読み取る。
- 旧 ballot/tally の choice・GoA・留保を同じ1件の question へ帰属させる。
- 同じ旧データを繰り返し読み込んだ場合と、旧データを migration して読み直した場合の canonical question ID が、いずれも `legacy-question` で一致する。

### FR-COMP-2: Canonical New Writes

新規 Election と新たに追記する ballot/tally は新 canonical schema で書き込まなければならない。既存履歴を一括または暗黙に上書き変換してはならない。

Acceptance criteria:

- read-only status/verify で既存ファイルを変更しない。
- 新規書き込みが stable question ID を保持する。

### FR-COMP-3: Append-only History

再実行、amend、hold resolution は既存の ballot、result、history を削除・置換せず、追記イベントとして履歴を残さなければならない。

Acceptance criteria:

- established result の由来を初回実行まで追跡できる。
- rerun の対象 question と理由を履歴から復元できる。

### FR-COMP-4: Migration Fidelity

既存 migration CLI は旧新両 schema を認識し、移動前後で canonical meaning が一致することを検証しなければならない。

Acceptance criteria:

- 旧単問 corpus と新多問 corpus の双方で fidelity check が成功する。
- 意味が一致しない移行は fail-closed で停止する。
- 旧単問 corpus の移行前 decode と移行後 decode で `legacy-question` を含む canonical digest が一致し、再実行対象の question ID も一致する。

## Functional Requirements — Records, Skills, and Formal Model

### FR-OBS-1: Question-aware Record

永続 record は question ID と質問文ごとに ruling、GoA frequency、reservations、hold reason を記載し、mixed result を決定的な順序で表現しなければならない。

Acceptance criteria:

- record から各 question の裁定と根拠を独立に監査できる。
- self verification が question の欠落・重複・誤帰属を検出する。

### FR-OBS-2: Skill Vocabulary

正本 `amadeus-election` skill は multi-question definition、responses、mixed result、hold-only rerun の directive loop を説明しなければならない。

Acceptance criteria:

- build 後の対象 harness 投影が正本と整合する。
- 単問入力は legacy decode または明示的な1問 canonical input として動作する。

### FR-FML-1: Formal Multi-question State Model

FormalElection は question ID の一意性、voter × question response 解決、mixed result、established result 不変性、held-only rerun をモデル化しなければならない。

Acceptance criteria:

- 不正な established 変更と対象外 question の再実行を invariant violation として検出する。
- source identity を再計算し model-map を更新する。

### FR-NORM-1: Current Norm Update

実装と検証が完了した時点で、`amadeus/spaces/default/memory/team.md` の `cid:requirements-analysis:always-elect` にある「1選挙1質問」を、検証済みの multi-question definition、question 単位の回答、mixed result、hold-only rerun 契約へ更新しなければならない。

Acceptance criteria:

- norm が CLI と保存契約の実装済み挙動を正確に記述する。
- norm 更新は実装とテストの証拠を参照する。

### FR-NORM-2: Weekly Distillation Shrinkage

旧 bundled `E-SRA-RAS13` / `election-cli-canonical` workaround は commit `bd567fd1b78bbde8a524b2cc767bd176dfbfe95f` の週次 distillation で削除済みである。今回の多問契約を正本 norm へ反映した後も、週次 distillation の通常経路で、この旧 workaround または同義の重複規範を復元せず縮約済み状態を維持しなければならない。

Acceptance criteria:

- 現行 memory 全体の source scan で `E-SRA-RAS13` と `election-cli-canonical` が再出現せず、Git 履歴の削除証拠だけに残る。
- distillation 後の active norm では `cid:requirements-analysis:always-elect` が唯一の Election CLI 運用規範であり、旧単問制約と同義の重複候補がない。
- 完了証拠に、norm 差分、source scan 結果、関連実装・テストへの参照を含める。

## Non-functional Requirements

### NFR-1: Linear Processing

definition parse、ballot validation、resolution、tally、render は question 数と response 数に対して線形または線形対数で処理し、全 question × 全 choice の不要な組合せ事前計算を行わない。

### NFR-2: Single-question Regression

既存の単問テストと実利用データを意味的に維持し、単問処理に実質的な性能退行を生じさせない。性能比較は、この Intent の実装開始点 `c0f9edf27828def6fa3dbbbc4101d753b398e025` を baseline、変更後を treatment とし、同じ Bun version・OS・CPU 上で、1 question・3 choices・3 voters の同一 fixtureを definition parse → ballot validation → tally → record render まで処理する。baseline と treatment を交互に5回 warm-up した後、各30回を交互に計測し、nearest-rank p95 の treatment 増分を `max(baseline p95 × 20%, 5 ms)` 以下とする。意味互換は性能計測とは別に canonical result と record の一致で検証する。

### NFR-3: Fail-closed Decoding

旧新 schema の判別不能、unknown question、重複 response、破損 tally、inconsistent mixed state は明示的なエラーとして拒否し、cast で受理しない。

### NFR-4: Deterministic and Auditable Output

同一入力から同一 canonical tally、record、directive、digest を生成し、question ID をすべての監査面で保持する。

### NFR-5: Comprehensive Verification

model、store、record、transport、CLI、migration、skill、PBT、e2e、TLA+、model-map、distribution の各検証を FR ID へ対応付けたテスト計画を作成し、対象 unit/integration/e2e/performance test、TLC、model-map 検査に加えて `bun run typecheck`、`bun run lint`、`bun run build`、`bun run source-only:check`、`bun run test:ci` を成功させる。CI の既存 Project Coverage Gate、Patch Coverage Gate、隔離2回ビルドの再現性検査、グラフ不変量検査を免除せず、各コマンドの exit code 0 と FR 対応表を完了証拠にする。

## Constraints

- Bun-only TypeScript モノレポと短命 CLI 構成を維持する。
- 正本は `packages/framework/core/` とし、生成された harness 面を直接編集しない。
- store の単一 writer 前提、blind independence、追記型履歴を維持する。
- 外部 DB、HTTP API、常駐サービス、新規権限を追加しない。
- 旧 bundled E-SRA-RAS13 workaround は削除済みであり、再導入しない。
- full autonomy は規範・品質免除や不可逆操作を許可しない。

## Assumptions

- question 数へ任意の固定上限は設けず、既存リソース制約と線形処理で扱える範囲を対象とする。
- voter 集合は Election 全 question で共有する。question ごとの voter subset は要求されていない。
- transport は voter ごとの1 view 配送を維持し、view 内に questions を含める。
- 後方互換は意味互換とし、新規出力の byte-for-byte 旧形式互換は要求しない。

## Out of Scope

- question ごとの異なる voter 集合または quorum 規則
- Election transport の HTTP 化、DB 化、並行 writer 対応
- GUI / Web UI
- 既存 store の破壊的 bulk migration
- Issue #2813 と無関係な Election policy または norm の全面再設計
- arbitrary な最大 question 数の仕様化

## Open Questions

要件上の material ambiguity は残っていない。次の具体表現は Application Design / Functional Design で確定する。

- versioned JSON schema の正確な field 名と discriminant
- global mixed lifecycle の型名
- canonical digest と record section の具体フォーマット
- TLC の tractable な finite constant と state-space 上限

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-13T08:09:14Z
- **Iteration:** 1
- **Scope decision:** none

成果物の必須セクション、Standard depth のFR件数、各FRの受入条件、およびIssue由来の主要能力は概ね揃っている。ただし、後方互換時のquestion ID、明示されたnorm縮約スコープ、性能回帰の合否基準に実装・検証契約上の未確定事項が残る。

### Findings

- BLOCKER | `FR-COMP-1` は旧単問データをcanonical questionへ正規化すると定める一方、旧schemaに存在しないstable question IDをどの規則で付与し、再読込・migration・再実行を通じて同一に保つかを規定していない。これは `FR-DEF-2`、`FR-RER-1`、`FR-COMP-4` の成立条件であり、開発者もQAも互換変換の正解を一意に判断できない。決定的なID導出または保存規則と、その再読込・移行前後の同一性を示す受入条件が必要。
- BLOCKER | Scope Document の In Scope 10とIntent StatementのSuccess Metricsは、不要になった関連bundled normを週次distillation経路で縮約可能にすることを明示しているが、`FR-NORM-1` は現行team normの更新と削除済みworkaroundの非再作成しか要求していない。明示的なin-scope能力が要件・受入条件へ追跡されていない。対象norm、週次distillationで期待する状態、完了証拠を要件化するか、上流スコープとの不一致を解消する必要がある。
- BLOCKER | `NFR-2` の「単問処理に実質的な性能退行を生じさせない」は、比較対象、測定条件、許容差がなく合否判定不能。Issue由来の既存単問回帰を性能面でも要求するなら、代表workload、baseline、測定指標、許容閾値を定義する必要がある。性能保証を意図しないなら、機能的意味互換の要件と分離して表現する必要がある。
- FOLLOW-UP | `NFR-5` の「既存のcoverageと品質ゲート」は参照対象が曖昧。後続のテスト計画で、列挙されたmodel・store・CLI・migration・TLA+等の各面をFRへ対応付け、実行するゲートと合格条件を明示すると追跡性を保てる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-13T08:11:30Z
- **Iteration:** 2
- **Scope decision:** none

旧schemaの予約question ID、週次distillation縮約、性能回帰の測定契約、品質ゲートのFR追跡が明確化され、Iteration 1の全BLOCKERとFOLLOW-UPは解消された。

### Findings

- None
