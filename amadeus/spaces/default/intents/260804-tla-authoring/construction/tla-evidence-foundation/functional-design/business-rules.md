# Functional Design: 業務ルール — U1 tla-evidence-foundation

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U1 の不変条件・検証規則・fail-closed 方針を定義する。処理列は `business-logic-model.md`、型定義は `domain-entities.md` を正本とする。各ルールは `requirements.md` の FR/NFR、`components.md` §C2/§C4 の境界宣言、`component-methods.md` の契約、`unit-of-work-story-map.md` の U1 補助責務行へ trace する。

## 不変条件(invariants)

| # | 不変条件 | 根拠 | 強制点 |
|---|---|---|---|
| BR-U1-01 | evidence store(`specs/tla-evidence/`)の書き手は C4 `build` ただ一つ。C1/C7(U2/U5)は内容を生成するだけで書かない | `components.md` §C4 境界、`unit-of-work.md` U1 境界 | code review + `services.md` S3 の呼出し契約 |
| BR-U1-02 | 最終位置(`specs/tla-evidence/*.json`)に部分 evidence は決して現れない。書込は `.tmp/` で全 bytes 確定後の atomic rename のみ | FR-010 前段、`services.md` § 整合性と可視化点 | `build` の実装構造 + 改竄 fixture テスト |
| BR-U1-03 | envelope は immutable。更新・削除 API を持たず、改訂は新 envelope + predecessor 連鎖で表現する | NFR-002(監査性)、ADR-3 | API 面の不在(型で表現不能) |
| BR-U1-04 | `BundleDigest` は canonical 直列化の全 bytes(`generatedAt`・`generatedBy` 含む)の SHA-256。digest 外の可変 metadata を持たない | ADR-3、`component-methods.md` §C4 | canonical 直列化の単一実装 + verify の digest 照合 |
| BR-U1-05 | predecessor 系列の先頭は明示 `root` marker。暗黙 null を許さない | NFR-002、requirements-analysis レビュー NIT | 型(判別ユニオン)+ parse 検証 |
| BR-U1-06 | staleness 判定は `compareIdentity` の完全一致比較のみを根拠とし、旧 verdict の存在・タイムスタンプ・部分一致を使わない | FR-007、AC-006 | `compareIdentity` の単一実装(C9/U2 はこれを消費) |
| BR-U1-07 | C2/C4 の判定は決定論的: 同一入力(canonical inputs + identity)に対し同一出力。timestamp・乱数を判定に混入させない(`generatedAt` は記録であって判定入力ではない) | NFR-001、`component-methods.md` § 共通規約 | 純関数層の分離 + property/unit テスト |
| BR-U1-08 | `.tmp/` 配下は list/head/verify の走査対象外。観測面は最終配置済み envelope のみ | BR-U1-02 の読取側対称 | `list` の走査規則 |
| BR-U1-09 | U1 は `model-map.json` に触れない(参照される側)。登録可視化は U4(C6)の責務 | `components.md` §C4 境界、NFR-004 | API 面の不在 |

## 検証規則(fail-closed)

`requirements.md` NFR-003(欠落・不一致の暗黙変換禁止)に基づき、すべての検証は typed failure の**全数列挙**で返す。部分報告・最初の 1 件での打ち切り・成功への丸めを禁止する(`memory/phases/construction.md` § Error Handling)。

### C2 抽出・digest 面

| ルール | 条件 | failure |
|---|---|---|
| BR-U1-10 | 同一 StableId が対象文書内に 2 回以上出現 | `duplicate-id`(該当 ID 全数) |
| BR-U1-11 | 上流明示リストの ID が文書中に不在 | `unresolvable-id`(該当 ID 全数) |
| BR-U1-12 | ID 文法(`FR|NFR|AC`-\d{3}、`ADR`-\d+)に不一致のトークンを StableId として受理しない | `invalid-grammar` |
| BR-U1-13 | 空 canonicalBody(正規化後 0 bytes)のセクションは ID だけの空殻であり受理しない | `invalid-grammar`(空本文は追跡対象の意味を持たない — FR-006 の空文化防止) |

### C4 build 面

| ルール | 条件 | failure |
|---|---|---|
| BR-U1-14 | kind ごとの必須 parts(authoring-bundle = 5 点 / terminal-route-receipt = 2 点)は型で構造的に担保する。CLI 入力(JSON)の parse 時に欠落を検出 | `missing-part`(欠落 field 全数) |
| BR-U1-15 | `predecessor: bundle` の参照先が store に不在または verify 不能 | `predecessor-broken` |
| BR-U1-16 | rename 先に同名ファイルが既存かつ bytes 相違 | `io-failure`(store 破損シグナル — 黙殺しない) |
| BR-U1-17 | 書込 I/O 失敗(権限・ディスク) | `io-failure`(呼出し元へ伝播) |

### C4 verify / read / list 面

| ルール | 条件 | failure |
|---|---|---|
| BR-U1-18 | 参照先ファイル不在 | `missing-part` |
| BR-U1-19 | bytes の SHA-256 が参照 digest と不一致(= 改竄) | `digest-mismatch`(NFR-006 の改竄 fixture が検証する経路) |
| BR-U1-20 | envelope schema 不整合(必須 field 欠落・不正型) | `missing-part`(欠落 field 全数) |
| BR-U1-21 | `subjectIdentity` が期待 identity と不一致 | `identity-mismatch` |
| BR-U1-22 | `list` 走査中の不整合ファイル(ファイル名 ≠ bytes digest)は黙殺せず corrupted 一覧として結果に併記する | (成功応答内の corrupted 併記 — 読取自体は fail させず、可視化する) |
| BR-U1-23 | 壊れた evidence(BR-U1-18〜21 該当)を「hold なし」等の肯定的判定の根拠に使わせない。強制手段は経路別: **C6 登録経路(U4)**は `VerifiedBundle` ブランド型のみを受理する型強制、**C9 hold 経路(U2)**は承認済み契約(`component-methods.md` §C9: `readEvidence` = read 相当を注入し、読取不能・検証失敗は `HoldFailure`)どおりの fail-closed 評価で担保する — VerifiedBundle を C9 契約へ持ち込む変更はしない。C9 側の結線の確定は U2 の Functional Design へ引き継ぐ | `component-methods.md` §C9(消費側)、NFR-003 |

## ポリシーと運用規則

- **BR-U1-24(冪等性の境界)**: 同一 parts + 同一 meta の build は同一 digest へ収束する(content-addressed の自然な冪等)。`generatedAt` が異なる再実行は新 digest の envelope を生む — これは仕様であり(ADR-3「完全性を冪等再実行より優先」)、旧 envelope は未参照のまま無害に残る。ゴミ回収は本 intent のスコープ外(任意)。
- **BR-U1-25(並行安全)**: evidence store は content-addressed のため並行 build の lost update は構造的に起きない(`services.md` § スケーリングと運用特性)。同一 digest への並行 rename は BR-U1-16 の bytes 比較で無害化する。model-map 側の競合検知は U4 の責務であり U1 は関与しない。
- **BR-U1-26(既存面の保護)**: `specs/tla-evidence/` は既存 activation advisory の監視 glob(`specs/tla/**`)の外にあり、evidence 書込が既存 advisory を発火させない(`components.md` §C4)。U1 は `specs/tla/` 配下・既存 model receipt・executor(`services.md` S6)に一切書き込まない(FR-013 の保護境界)。
- **BR-U1-27(テスト形状)**: Comprehensive test strategy(`requirements.md` NFR-006)として、正常・欠落(missing-part)・stale(identity-mismatch)・改竄(digest-mismatch)・部分成功(`.tmp` 残骸 + 最終位置不在)・冪等(同一入力再 build)の fixture を持つ。純関数層は unit、実 FS を触る build/verify/list は integration 層に置く(`memory/project.md` cid:build-and-test 系規律)。TDD を既定とし、公開 seam への失敗テスト先行で進める(`memory/team.md` § Testing Posture)。

## 上流トレーサビリティ

- `unit-of-work.md`(U1 境界: 語彙・schema の一元所有)、`unit-of-work-story-map.md`(AC-003/004 の保存面、FR-006/007/010 補助)
- `requirements.md`(FR-006、FR-007、FR-010、FR-013、NFR-001〜NFR-003、NFR-006)
- `components.md` §C2/§C4/§既存コンポーネントとの整合、`component-methods.md` §C2/§C4/§共通規約、`services.md` §S3/§整合性と可視化点/§スケーリングと運用特性
- `functional-design-questions.md` Q1/Q2(人間承認 2026-08-04T18:09:58Z)
