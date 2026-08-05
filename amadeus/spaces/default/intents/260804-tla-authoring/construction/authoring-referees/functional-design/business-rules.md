# Functional Design: 業務ルール — U3 authoring-referees

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U3 の不変条件・検証規則を定義する。処理列は `business-logic-model.md`、型は `domain-entities.md` を正本とする。各ルールは `requirements.md` FR-006/FR-008/AC-005、`components.md` §C3/§C5 の境界、`unit-of-work-story-map.md` の U3 主担当行へ trace する。

## 不変条件(invariants)

| # | 不変条件 | 根拠 | 強制点 |
|---|---|---|---|
| BR-U3-01 | U3 は評価のみを行う referee — モデル作成(C7)・登録(C6)・evidence 永続化(C4)を行わず、自律的に次工程を起動しない | `unit-of-work.md` U3 境界、`services.md` §オーケストレーションパターン | API 面の不在(評価関数と CLI のみ) |
| BR-U3-02 | `CoverageProof` / `ProofEvidence` は全条件成立時のみ構成される — 部分成立の証明型は存在しない(無効状態の表現不能化) | FR-006、FR-008、NFR-003 | ブランド型 + スマートコンストラクタ |
| BR-U3-03 | TLC 実行は注入 toolchain の child process 契約のみ。toolchain の実装・schema・verdict 経路に手を入れない(依存は authoring → toolchain の一方向) | ADR-5(`services.md` §S4)、FR-013 | port 注入 + 依存方向のレビュー |
| BR-U3-04 | 評価は決定論的: 同一 canonical inputs + identity + toolchain 条件で同一判定(NFR-001)。timestamp・乱数を判定に混入させない | `component-methods.md` § 共通規約 | 純関数層の分離 |
| BR-U3-05 | falling proof の変異成果物(違反注入済み `.tla`/`.cfg`)は実測後に破棄し、正本モデル・正本 `.cfg` へ残さない — 注入 → 赤の実測 → 破棄を 1 セットとする | `memory/team.md` cid:code-generation:falling-proof-injection-one-set の形式検証面 | C5 実装の一時領域規律 + レビュー観点 |

## 検証規則(fail-closed)

### C3 coverage 面

| ルール | 条件 | 結果 |
|---|---|---|
| BR-U3-06 | subjects 内の同一 StableId 重複 | `duplicateSubjects` に全数収集(FR-006「重複 identity」) |
| BR-U3-07 | row の subject / invariant が入力集合で解決不能 | 解決不能として failure に全数収集(FR-006「解決不能な identity」) |
| BR-U3-08 | いずれの row にも現れない subject | `uncoveredSubjects`(AC-005 の主経路 — 未対応 stable ID を仕込んだ fixture はここで拒否) |
| BR-U3-09 | いずれの row にも現れない宣言 invariant | `orphanInvariants`(FR-006「孤立した invariant」) |
| BR-U3-10 | 3 リストの検査は独立に全数実行してから同時返却 — 最初の欠陥で打ち切らない | NFR-003 の全数列挙(`component-methods.md` §C3「部分報告しない」) |
| BR-U3-11 | 欠陥が 1 件でもあれば CoverageProof を生成しない — failure と proof の同時存在は型上あり得ない | AC-005「coverage failure として登録を拒否」 |

### C5 proof 面

| ルール | 条件 | 結果 |
|---|---|---|
| BR-U3-12 | completion marker または state 統計が欠けた TLC 実行を「完全探索成功」と扱わない — 部分探索・timeout・harness error は missing: "tlc-exploration" | `memory/project.md` cid:application-design:finite-exploration-not-detected-proof、FR-008 第 1 条件 |
| BR-U3-13 | falling proof は invariant ごとに個別評価し、1 件でも DETECTED を実測できなければ当該 invariant を missing に列挙 — 部分成功を成功へ丸めない | FR-008 第 2 条件、`unit-of-work.md` U3 実装注意 |
| BR-U3-14 | 変異系で NOT_DETECTED が出た場合(壊したはずなのに赤が出ない)は falling proof 不成立 — 変異が実際に invariant を壊せていない(空振り注入)ことを意味し、成功へ読み替えない | 落ちる実証の空振り防止(`memory/team.md` 検証劇場 Forbidden の形式検証面) |
| BR-U3-15 | reduction manifest に意味保存の対応が書けない縮約項目が 1 つでもあれば missing: "reduction-evidence" | FR-008 第 4 条件 |
| BR-U3-16 | ProofFailure は欠けた obligation の全数 + falling の欠け invariant 一覧を同時列挙 | NFR-003 |
| BR-U3-17 | ProofEvidence の boundIdentity は評価実行時点の現在 identity(U1 C2)であり、呼び手の申告値をそのまま信用しない — CLI は identity を引数で受けるが、bundle 化(U1 C4)時の verify で envelope の subjectIdentity と照合される | FR-008 第 5 条件、NFR-002 |

## テスト形状(NFR-006、Comprehensive)

- **BR-U3-18**: C3 は 3 欠陥それぞれの単独 fixture + 3 欠陥同時 fixture(全数同時列挙の実証)+ 全数成立 fixture の 5 系を unit 層(純関数・in-process)に置く。
- **BR-U3-19**: C5 は fake toolchain 注入で 5 条件の判定表を全分岐 unit test し(completion marker 欠損・統計欠損・falling 空振り・reduction 対応欠落を含む)、実 TLC を使う経路は integration 層で最小 1 系(既存 toolchain 契約の実測 — `unit-of-work.md` Bolt 3 DoD「ローカル TLC で実測」)に留める(`memory/project.md` cid:build-and-test 系規律)。
- **BR-U3-20**: 落ちる実証は「テストが実際に読む面」= 判定表の実行行へ注入する(`memory/team.md` cid:code-generation:inject-runtime-consumed-lines)。

## 上流トレーサビリティ

- `unit-of-work.md`(U3 境界・DoD)、`unit-of-work-story-map.md`(FR-006/FR-008 主担当、AC-005)
- `requirements.md`(FR-006、FR-008、AC-005、NFR-001〜NFR-003、NFR-006)
- `components.md` §C3/§C5、`component-methods.md` §C3/§C5/§共通規約、`services.md` §S4
- `functional-design-questions.md`(0 件判定、人間承認 2026-08-04T18:48:19Z)
