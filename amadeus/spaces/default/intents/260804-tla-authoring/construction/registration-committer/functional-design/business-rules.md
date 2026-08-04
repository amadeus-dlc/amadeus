# Functional Design: 業務ルール — U4 registration-committer

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U4 の不変条件・検証規則を定義する。処理列は `business-logic-model.md`、型は `domain-entities.md` を正本とする。各ルールは `requirements.md` FR-010/FR-013、`components.md` §C6 の境界、`unit-of-work-story-map.md` の U4 主担当行へ trace する。

## 不変条件(invariants)

| # | 不変条件 | 根拠 | 強制点 |
|---|---|---|---|
| BR-U4-01 | 登録の可視化点は `model-map.json` の atomic rename ただ一つ。rename 前の失敗はどの variant でも旧 map を無傷で残す | FR-010、`services.md` § 整合性と可視化点 | temp + rename の実装構造 + 失敗注入テスト |
| BR-U4-02 | rename 成功だけが登録成立 — 部分更新・中間状態は観測不能 | FR-010「部分更新を complete として観測させない」 | 同上 |
| BR-U4-03 | commit は `VerifiedBundle`(U1 verify 通過のブランド型)のみを受理する。未検証 bundle の参照は型で拒否 | NFR-003、`domain-entities.md` § ライフサイクル | 型 + CLI 面での verify 内蔵 |
| BR-U4-04 | U4 は evidence store に書き込まない(書き手は U1 C4 単一)。model-map の書き手は U4 単一 | `components.md` §C4/§C6 境界、NFR-004 | API 面の分離 |
| BR-U4-05 | authoring 経由の登録 draft は evidenceBundle 参照必須 — 参照なしの新規登録を受理しない(既存 2 エントリの evidenceBundle 不在は既存互換のための optional であり、新規経路の省略を許す意味ではない) | ADR-3(登録は検証済み bundle への参照を含む)、Q1 裁定 | commit の前段検査 |
| BR-U4-06 | 既存 2 モデル(`FormalElection` / `MirrorLifecycle`)のエントリ・既存 map bytes・既存 validator の受理挙動は不変 | FR-013、AC-008 | 回帰テスト(既存 map の parse green + バイト不変) |
| BR-U4-07 | 判定は決定論的(NFR-001)。`registeredAt` は記録であって判定入力ではない | `component-methods.md` § 共通規約 | 純関数層の分離 |

## 検証規則(fail-closed)

前提段(手順 1)の失敗はすべて `PreconditionFailure` として全数収集し、`preconditions-failed` 1 kind に集約して返す(`domain-entities.md` の 2 層構造 — 全数列挙と判別ユニオンの両立)。

| ルール | 条件 | failure(PreconditionFailure) |
|---|---|---|
| BR-U4-08 | 前提の欠落・不成立(applicability route 不適合 / coverage・proof 不在 / review 非 READY) | `precondition-missing`(該当 precondition を個別に列挙) |
| BR-U4-09 | freshness が stale(記録 identity ≠ 現在 identity) | `stale-evidence`(FR-007、AC-006 の登録面 — stale evidence fixture での登録拒否が `unit-of-work.md` U4 期待デモ) |
| BR-U4-10 | reviewer が `pre.review.modelAuthor` と同名、**または reviewer / modelAuthor のいずれか一方でも空文字** | `reviewer-not-independent`(FR-009 の独立性を登録点でも強制。比較基準は ReviewReceipt.modelAuthor — U5 の独立レビュー段が記入。空 modelAuthor の素通りを許さない — `domain-entities.md` §RegistrationPreconditions の判定文と同一条件) |
| BR-U4-11 | humanApproval の provenance 再照合失敗(HUMAN_TURN 不在・digest 不一致) | `approval-provenance-invalid`(登録は不可逆の可視化点のため receipt 生成時と独立に二重照合) |
| BR-U4-12 | 拡張 validator が draft 込み map 全体を拒否 | `validator-rejected`(書込前に止まる — 壊れた map は決して書かれない)。completeness sensor への無影響は実装時に sensor 実装の実読 + 既存 2 モデルへの発火 green で実測確定する |
| BR-U4-13 | rename 直前再読込の bytes が snapshot と相違 | `concurrent-modification`(retryable — 他 failure と区別し、呼び手の再試行判断を許す) |
| BR-U4-14 | 書込・rename の I/O 失敗 | `io-failure`(旧 map 無傷を failure 経路でも保証) |

## テスト形状(NFR-006、Comprehensive)

- **BR-U4-15**: 前提欠落の全 variant + stale + 非独立 reviewer + provenance 偽装(偽 timestamp / 偽 digest)+ validator 拒否 + 競合 + I/O 失敗の負例 fixture を揃える。**同時複数失敗 fixture(例: coverage 欠落 + stale の併発)で `preconditions-failed.failures` に 2 件が同時に載ることを実測**し、全数集約の退行(最初の 1 件で打ち切る実装)を検出可能にする。provenance 偽装と stale は「落ちる実証」として実際に赤を確認してから green 側を固定する(`memory/team.md` Mandated)。
- **BR-U4-16**: 競合 fixture は「draft 構築後・rename 前に第三者が map を書き換える」手順を注入 seam で決定的に再現する(`memory/project.md` cid:reverse-engineering:c2-parallel-process-repro-harness の決定的再現の系譜)。
- **BR-U4-17**: 既存互換回帰 — 既存 `specs/tla/model-map.json` が拡張 validator で green のまま、かつ既存 2 エントリの bytes が不変であることを AC-008 の受け入れ fixture とする。evidenceBundle 付きエントリと既存エントリの混在 map も green であること。
- **BR-U4-18**: 純関数層は unit、実 FS(temp + rename・再読込)を触る経路は integration 層(`memory/project.md` cid:code-generation:fs-tests-integration-first)。

## 上流トレーサビリティ

- `unit-of-work.md`(U4 境界・期待デモ)、`unit-of-work-story-map.md`(FR-010/FR-013 主担当、AC-008)
- `requirements.md`(FR-007、FR-009、FR-010、FR-013、AC-006、AC-008、NFR-001〜NFR-003、NFR-006)
- `components.md` §C6、`component-methods.md` §C6、`services.md` §S3/§スケーリングと運用特性
- `functional-design-questions.md` Q1 裁定(人間承認 2026-08-04T19:08:57Z)
