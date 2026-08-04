# Functional Design: 業務ロジックモデル — U1 tla-evidence-foundation

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U1 のアルゴリズム・ワークフロー・データ変換を定義する。エンティティ定義は `domain-entities.md`、制約・不変条件は `business-rules.md` を正本とし、ここでは処理列だけを扱う。`unit-of-work.md` の U1 実装注意(digest は canonical 直列化の全 bytes 対象、functional domain modeling スタイル)と `components.md` §C2/§C4、`component-methods.md` の公開契約に従う。

## 処理一覧

| 処理 | 所有 | 公開面 | 対応 FR |
|---|---|---|---|
| stable section 抽出 | C2 | `extractStableSections` | FR-006 |
| canonical 正規化 | C2 | (抽出の内部段) | FR-006、NFR-001 |
| content / aggregate digest 計算 | C2 | `contentDigest` / `aggregateDigest` | FR-006、FR-007 |
| identity 比較 | C2 | `compareIdentity` | FR-007 |
| evidence build | C4 | `build` | FR-010 前段、NFR-002 |
| evidence verify | C4 | `verify` | NFR-003、NFR-006 |
| evidence read / list / head | C4 | `read` / `list` / `head` | NFR-002 |
| CLI 面 | C2+C4 | `tla-authoring.ts identity` / `bundle` | 上記全部 |

## 1. stable section 抽出と正規化(C2)

Q2 裁定(見出し駆動の閉じた文法、人間承認 2026-08-04T18:09:58Z)に基づく決定論的抽出。

### 抽出アルゴリズム

```
入力: markdown 文書(string)、抽出対象文書種別(requirements | decisions)
出力: Result<ReadonlyArray<StableSection>, IdentityFailure>

1. 文書を行配列へ分割(改行コードは LF / CRLF 両受理)
2. 見出し行を走査し、ID 文法に一致する見出しを開始点として収集:
   - requirements 種別: `^### (FR|NFR|AC)-\d{3}\b` の H3 見出し
   - decisions 種別:    `^## ADR-\d+\b` の H2 見出し
3. 各セクションの範囲 = 開始見出しの次行から、同レベル以上の次見出しの直前行まで
4. 各セクション本文へ正規化(下記)を適用し StableSection を構成
5. 同一 StableId が 2 回以上現れた場合は duplicate-id、
   上流の明示リストに現れた ID が文書中に見つからない場合は unresolvable-id として
   全数列挙の IdentityFailure で拒否(部分結果を返さない)
```

- 見出し行自身は ID のみを採用し本文へ含めない(Q2 裁定 A) — 見出しの表題文言の変更(例: 節タイトルの言い換え)は意味変更として digest に現れない。表題も意味の一部とする運用が必要になった場合は文法改訂として扱う(`functional-design-questions.md` の裁定範囲)。
- 文法外 ID(cid 等)は自動収集しない。上流(C1/C7)が明示リストで渡す場合は「ID → 本文範囲」を呼び手が特定できないため、明示リスト項目は `StableId` + 呼び手提供の canonical 本文の対として受け取る(抽出はスキップし正規化と digest のみ適用)。

### 正規化アルゴリズム(canonical bytes)

```
入力: セクション本文(string)
出力: canonicalBody(string)

1. 改行を LF へ統一(CRLF → LF)
2. 各行の行末空白(スペース・タブ)を除去
3. 先頭・末尾の空行を除去(内部の空行は保持 — 段落構造は意味の一部)
4. 出力は UTF-8 bytes として digest 対象になる
```

- Markdown の再パース・再整形(リスト記号の正規化等)は行わない — 正規化は「意味に影響しない編集ノイズの除去」に限定し、それ以上の同値判定を持ち込まない(`requirements.md` NFR-001 の再現性は保守的な正規化で守る。ADR-2 Consequences の「誤字修正等は stale を引き起こさない」は行末空白・改行コード・前後空行のクラスに限る — 本文の誤字修正は digest に現れる。これは意図どおり: 本文変更が意味変更かの判断は C1/人間の責務であり、C2 は機械判定しない)。

## 2. digest 計算(C2)

```
contentDigest(id, canonicalBody):
  sha256( utf8(id) + 0x00 + utf8(canonicalBody) ) → "sha256:<hex64>"

aggregateDigest(entries):
  1. entries を StableId の辞書順(UTF-8 byte 順)で sort
  2. canonical 直列化: 各 entry を "<id>=<contentDigest>" とし LF 連結
  3. sha256( utf8(直列化結果) ) → "sha256:<hex64>"
```

- ID と本文の間に 0x00 区切りを置き、`("AB", "C")` と `("A", "BC")` の連結衝突を排除する。
- `aggregateDigest` は入力順に依存しない(sort が先 — `component-methods.md` §C2)。
- hash 関数は SHA-256 に固定(ADR-2 のセキュリティ影響節)。既存 advisory の `sha256:` 表記と同形。

## 3. identity 比較(C2)

`compareIdentity(recorded, current)` は文字列完全一致のみで判定する: 一致 → `{ kind: "current" }`、不一致 → `{ kind: "stale", recorded, current }`。部分一致・類似度・タイムスタンプは判定に使わない(`requirements.md` FR-007 の「identity が変化した場合」の唯一の機械判定。`services.md` S7 の hold checkpoint が消費する)。

## 4. evidence build(C4)

```
build(evidence: EvidenceParts, predecessor: PredecessorRef, meta: {generatedAt, generatedBy, subjectIdentity}):
  1. kind ごとの必須 parts の構造検査(型で担保済み — 実行時は defensive re-check しない)
  2. predecessor 検査: kind が "bundle" の場合、参照先 envelope が store に実在し
     verify 可能であることを確認(broken 連鎖の新規発生を build 時点で拒否)
  3. EvidenceEnvelope を構成し canonical JSON 直列化(key を辞書順 sort、LF 終端なし、
     UTF-8 — Bun の JSON.stringify + key sort replacer で決定論化)
  4. bundleDigest = sha256(canonical bytes)
  5. specs/tla-evidence/.tmp/<uuid>.json へ全 bytes を書込
  6. specs/tla-evidence/<hex64>.json へ atomic rename
     - rename 先が既存の場合: 既存 bytes と新 bytes を比較し、
       同一なら成功(content-addressed の自然な冪等)、相違なら io-failure(digest 衝突は実質不可能 —
       相違は store 破損のシグナル)
  7. EvidenceBundleRef { digest } を返す
```

- **上流シグネチャからの申告付き詳細化**: `component-methods.md` §C4 の承認済みシグネチャは `build(evidence, predecessor)` の 2 引数だが、`EvidenceEnvelope` の必須フィールド(`subjectIdentity`・`generatedAt`・`generatedBy` — NFR-002)は evidence parts からも predecessor からも導出できないため、第 3 引数 `meta` を Functional Design の詳細化として追加する。正本シグネチャは本書の 3 引数形とし、実装はこれに従う(意味論の変更ではなくパラメータの補完 — 2 引数のままでは NFR-002 のフィールドが供給不能)。
- 一時領域は `.tmp/` 配下に隔離(`domain-entities.md` § ライフサイクル)。クラッシュ時は `.tmp/` に残骸が残るのみで、最終位置に部分 evidence は決して現れない(`requirements.md` FR-010 前段、`services.md` § 整合性と可視化点の第 1 層)。残骸の回収は任意(ADR-3 Consequences)。
- 書込 I/O の失敗は `kind: "io-failure"` の typed failure(`memory/phases/construction.md` § Error Handling: 統合境界のエラーは伝播)。`io-failure` は承認済み BundleFailure union への申告付き追加 — 宣言と根拠は `domain-entities.md` § エンティティ一覧の注記を正本とする。

## 5. evidence verify / read / list / head(C4)

```
verify(ref, expectedIdentity):
  1. specs/tla-evidence/<ref.digest hex>.json を読取(不在 → missing-part)
  2. bytes の sha256 と ref.digest を照合(不一致 → digest-mismatch = 改竄検出)
  3. JSON parse + envelope schema 検証(parse 不能 → digest は一致し得ないため 2 で検出済み。
     schema 不整合 → missing-part として欠落 field を全数列挙)
  4. envelope.subjectIdentity と expectedIdentity を照合(不一致 → identity-mismatch)
  5. predecessor 連鎖の直近 1 段の実在を確認(不在 → predecessor-broken。
     全系列の再帰検証は行わない — 各世代が build 時に 1 段を検証済みのため帰納的に健全)
  6. 全検査通過で VerifiedBundle を返す。失敗は全数列挙(部分報告しない — NFR-003)

read(ref): verify の 1〜3 を実行し EvidenceParts を返す(identity 照合なしの読取面)

list(): specs/tla-evidence/ 直下の *.json を走査し(.tmp/ 除外)、
  ファイル名 = bytes digest の整合する envelope の EvidenceBundleRef 配列を返す。
  不整合ファイルは黙殺せず corrupted 一覧として併記する(fail-closed 読取)

head(): list の結果から「他のどの envelope からも predecessor 参照されていない」
  envelope 群を返す(連鎖の末端 = 最新世代)。予期される head は subjectIdentity 系列ごとに 1 件
```

- `list` / `head` は application-design レビュー iteration 2 FOLLOW-UP(「evidence store の列挙・系列 head 解決の owner 未宣言」)への確定回答であり、C4 が所有する。戻り値の正確な型は `domain-entities.md` § EvidenceIndex を正本とする — `list()` は `Result<EvidenceIndex, BundleFailure>` を返し、C9(U2)の `evaluate` へ渡るのは `EvidenceIndex.refs` のみ。C9 は store レイアウト知識を再実装しない。

## 6. CLI 面(`tla-authoring.ts identity` / `bundle`)

`unit-of-work.md` U1 の CLI 契約と `component-methods.md` § 共通規約(JSON 1 行 stdout、exit 0 = 成功 / 1 = typed failure / 2 = usage error)に従う。

| サブコマンド | 入力(argv) | 出力 |
|---|---|---|
| `identity extract --doc <path> --doc-kind <requirements\|decisions>` | 対象文書 | StableSection の id + contentDigest 一覧 + aggregateDigest |
| `identity compare --recorded <digest> --current <digest>` | 2 つの AggregateDigest | IdentityComparison |
| `bundle build --parts <json-path> --predecessor <root\|digest> --identity <digest>` | parts JSON | EvidenceBundleRef |
| `bundle verify --ref <digest> --identity <digest>` | 参照 + 期待 identity | VerifiedBundle 要約 |
| `bundle read --ref <digest>` | 参照 | EvidenceParts |
| `bundle list` / `bundle head` | — | ref 配列(corrupted 併記) |

- 純関数層(C2 全部、C4 の検証ロジック)と I/O handler 層(fs 読み書き)を分離し、純関数層は in-process seam で unit test 可能にする(`memory/team.md` bun-coverage-spawn-blindspot / `memory/project.md` cid:code-generation:c2-doctor-seam。実 FS を触るテストは integration 層 — cid:code-generation:fs-tests-integration-first)。

## データフロー(U1 単体)

```
requirements.md / decisions.md
   │ identity extract(C2)
   ▼
StableSection[] ──→ ContentDigest[] ──→ AggregateDigest
                                            │
receipt 群(U2/U3 生成) + predecessor ──────┤
                                            ▼
                              bundle build(C4) → specs/tla-evidence/<digest>.json
                                            │
                     bundle verify/read/list/head(C4)
                                            ▼
                        消費者: C9 hold 判定(U2)、C6 登録(U4)、監査者
```

## 上流トレーサビリティ

- `unit-of-work.md`(U1 責務・CLI 契約・実装注意)、`unit-of-work-story-map.md`(FR → U1 補助責務対応)
- `requirements.md`(FR-006、FR-007、FR-010 前段、NFR-001〜NFR-003、NFR-006)
- `components.md` §C2/§C4、`component-methods.md` §C2/§C4/§共通規約、`services.md` §S3/§通信契約
- `functional-design-questions.md` Q1/Q2(人間承認 2026-08-04T18:09:58Z)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T18:22:01Z
- **Iteration:** 1
- **Scope decision:** none

domain-entities.md の EvidenceEnvelope が kind/parts の判別ユニオン相関を型で保証できておらず Parse-Don't-Validate 原則に反する1件が BLOCKER、他は上流契約の無申告拡張・list/head 戻り値型未定義・C9 との整合ギャップの FOLLOW-UP。

### Findings

- BLOCKER | domain-entities.md:92-100 — EvidenceEnvelope の `parts: EvidenceParts["parts"]` は EvidenceParts のユニオン全メンバーの parts 型(AuthoringBundleParts | TerminalReceiptParts)へ分配され、`kind: EvidenceKind` フィールドとの判別ユニオン相関が失われる。kind="authoring-bundle" に TerminalReceiptParts を組み合わせた無効状態が型検査を通過してしまい、同一文書47行目の「無効状態を表現不能にする」原則および `memory/phases/construction.md` § Software Design Principles の Parse-Don't-Validate 必須原則に反する。EvidenceEnvelope は EvidenceParts の判別ユニオンをそのまま埋め込む(交差型または直接ネスト)形へ修正が必要。
- FOLLOW-UP | business-logic-model.md:81 — build() のシグネチャに `meta: {generatedAt, generatedBy, subjectIdentity}` を追加しているが、component-methods.md §C4 の承認済みシグネチャは `build(evidence, predecessor)` の2引数。EvidenceEnvelope の必須フィールドを満たすための妥当な詳細化とみられるが、上流シグネチャからの拡張である旨を明示していないため、実装者が正本シグネチャをどちらとして扱うか判断に迷う余地がある。
- FOLLOW-UP | business-rules.md:36-42 / domain-entities.md:24 — BundleFailure に `io-failure` を追加しているが、component-methods.md §C4 の承認済み union は `missing-part | digest-mismatch | identity-mismatch | predecessor-broken` の4 variant。build() の書込 I/O 失敗を表現するための妥当な拡張とみられるが、上流型からの拡張である旨の明示的な注記がない。
- FOLLOW-UP | domain-entities.md — list()/head() の戻り値型(EvidenceBundleRef 配列 + corrupted 一覧の具体的 shape、Result でラップするか)がエンティティ一覧・型定義として存在しない。business-logic-model.md §5 は挙動を文章で説明するのみで、C9(U2)の evaluate が evidenceIndex として消費する契約(component-methods.md §C9)と整合させる正確な型がないため実装者が形状を推測する必要がある。
- FOLLOW-UP | business-rules.md:52 (BR-U1-23) vs component-methods.md §C9 — 「verify 通過の証明は VerifiedBundle ブランド型のみで運ぶ」と明言するが、承認済み component-methods.md の C9.evaluate は `readEvidence: (ref) => Result<EvidenceParts, BundleFailure>`(read() 相当、identity 未照合)を注入依存として受け取り、VerifiedBundle を経由しない契約になっている。U1 側の主張と C9 の承認済み契約が食い違っており、U2 の Functional Design 側で解消が必要。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T18:26:33Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の 5 件(BLOCKER 1 / FOLLOW-UP 4)はすべて実読確認で閉じており、3 文書間・application-design 契約との整合も新規矛盾なく保たれている

### Findings

- NIT | business-logic-model.md:123 — 「list の出力を evidenceIndex として受け取り」という表現は list() の戻り値が Result<EvidenceIndex, BundleFailure> であり実際に C9 へ渡るのは EvidenceIndex.refs のみである点を厳密には表さない。domain-entities.md:131 の正確な記述を正本と明記する一文をここにも足すと二重読解の余地が消える
