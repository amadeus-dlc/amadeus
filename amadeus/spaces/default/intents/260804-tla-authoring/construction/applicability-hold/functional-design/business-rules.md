# Functional Design: 業務ルール — U2 applicability-hold

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U2 の不変条件・検証規則を定義する。処理列は `business-logic-model.md`、型は `domain-entities.md` を正本とする。各ルールは `requirements.md` の FR/AC/NFR、`components.md` §C1/§C9 の境界宣言、`unit-of-work-story-map.md` の U2 主担当行(FR-001/003/004/005/007、AC-001〜004/006)へ trace する。

## 不変条件(invariants)

| # | 不変条件 | 根拠 | 強制点 |
|---|---|---|---|
| BR-U2-01 | 適用判定は判定表 J1〜J6(closed)の上から順の評価のみで確定する。表外の判定・ヒューリスティック追加は Functional Design の改訂を要する | FR-001、`components.md` §C1(closed な判定表) | 判定表の単一実装 + 全行 unit test |
| BR-U2-02 | 無関係な既存モデルの成功・存在を判定・hold 解除の材料にしない。交差判定は subjects × trace 対象の集合演算のみ | `requirements.md` §2.4、AC-001 | J1〜J6 の入力構成(verdict を入力に持たない) |
| BR-U2-03 | non-target / impl-only の receipt は人間承認なしに生成されない。承認は実 HUMAN_TURN の provenance(shard + timestamp + イベント SHA-256)照合済みのみ有効 | FR-004、FR-005、AC-003、AC-004 | `buildReceipt` の approval 検査(生成時に閉じる) |
| BR-U2-04 | U2 は evidence store・model-map へ書き込まない。receipt の永続化は U1(C4)、登録は U4(C6)の責務 | `unit-of-work.md` U2 境界、NFR-004 | 書込 API の不在 |
| BR-U2-05 | hold 解除の唯一の経路は C9 の no-hold verdict。C7(authoring 作業)も conductor も checkpoint を迂回できない | `components.md` §C9、`services.md` §S7/§オーケストレーションパターン | 既存 engine checkpoint(実読確認済みの機械強制)|
| BR-U2-06 | C9 は人間の明示的 risk defer を上書きしない。defer の記録・提示は engine checkpoint 側の既存責務 | `components.md` §C9 境界 | C9 の出力語彙(verdict のみ。defer 概念を持たない) |
| BR-U2-07 | 判定・hold 評価は決定論的(同一入力 → 同一出力)。timestamp・乱数を判定に混入させない | NFR-001、`component-methods.md` § 共通規約 | 純関数層の分離 + property test |
| BR-U2-08 | checkpoint 機構(発火点・directive 契約・解除規則・report 拒否)は無変更。engine 変更は宣言読取の 2 一般化点に閉じる | ADR-6 改訂(2026-08-04T18:29:01Z 裁定) | code-generation の変更面レビュー + 既存 checkpoint テストの無回帰 |

## 検証規則(fail-closed)

`requirements.md` NFR-003 に基づき、欠落・矛盾・読取不能は成功・非対象へ暗黙変換せず typed failure で全数列挙する。

### C1 判定・receipt 面

| ルール | 条件 | failure |
|---|---|---|
| BR-U2-09 | subjects 空・model-map 読取欠落 | `missing-evidence` / `undecidable`(J1) |
| BR-U2-10 | 宣言 kind と実状態の矛盾(J2 の 4 形 — new-subject×交差 / semantic-change×非交差 / impl-only×非交差 / non-target×交差) | `undecidable`(矛盾の全数列挙) |
| BR-U2-11 | terminal 経路で approval null または provenance 照合失敗 | `approval-missing`(AC-004 の「承認欠落時は失敗する」) |
| BR-U2-12 | 判定不能を「非対象」へ丸めない — non-target は宣言 + 承認による明示経路のみ | J3 の条件(`undecidable` と `non-target` の分離。FR-005) |

### C9 hold 面

| ルール | 条件 | 結果 |
|---|---|---|
| BR-U2-13 | 現在 identity への applicability receipt 不在 | hold `no-applicability-receipt`(AC-001 — 判定未実施のまま下流工程を通過させない) |
| BR-U2-14 | route=author-new / revise-model で current な authoring-bundle + 登録が未完 | hold `authoring-incomplete`(AC-001、AC-002) |
| BR-U2-15 | evidence の記録 identity が現在と不一致 | hold `stale-evidence`(AC-006 — 旧 verdict で解除を試みる fixture はここで拒否) |
| BR-U2-16 | evidence 読取失敗・corrupted 非空・model-map 読取失敗 | `HoldFailure`(hold と同様に前進を止める。壊れた evidence は no-hold の根拠にならない — BR-U1-23 の消費側) |
| BR-U2-17 | hold 理由は該当全行を列挙(最初の 1 件で打ち切らない) | NFR-003 の全数列挙 |

### 宣言駆動結線面(ADR-6 改訂)

| ルール | 条件 | 結果 |
|---|---|---|
| BR-U2-18 | plugin.json の advisories 宣言が parse 不能・予約トークン解決不能 | 当該 plugin の advisory を hold 側へ倒す(無音 skip 禁止 — 壊れた宣言は「advisory なし」ではない) |
| BR-U2-19 | evaluator / formalCheck の起動は argv 配列のみ。shell 展開・文字列結合コマンドを許さない | `memory/project.md` gh-scripts-boundary と同型の起動規律(injection 面の遮断) |
| BR-U2-20 | hold/no-hold の判定正本は stdout の typed verdict JSON。exit code 単独で判定しない | `memory/project.md` cid:code-generation:c7-failclosed-inverts-to-misattribution(exit code のみ assert の反面教師) |
| BR-U2-21 | 既存 formal-model-check の spec-hash advisory 経路(engine 内ハードコード)は本 unit では変更しない — 宣言経路は追加であり置換ではない。移行の要否は code-generation の実測後に別判断 | FR-013、AC-008(既存回帰の保護)、ADR-6 改訂注記 |

## テスト形状(NFR-006、Comprehensive)

- **BR-U2-22**: 判定表 J1〜J6 の全行 + 各 failure 分岐の unit test(純関数・in-process)。ChangeKind 4 値 × 交差有無 2 値の 8 組合せを全数被覆し(`business-logic-model.md` §1 の被覆機械確認と 1:1)、J2 の矛盾 4 形は独立ケースにする。
- **BR-U2-22a**: stale 選別の 2 キー分離(系列一致 × 内容不一致 = stale)は、「同一 subjects で本文だけ変えた fixture」により stale が実際に検出されることを実測する — 内容 digest 選別へ退行すると本 fixture が赤になる(AC-006 の構造的な守り)。
- **BR-U2-22b(系列キーの運用特性 — 仕様であり欠陥ではない)**: subjects 集合が 1 件でも増減した宣言は別系列となり `no-applicability-receipt` hold へ落ちる。これは「対象集合の変更 = 新しい適用判定を要する変更」という意図された保守的挙動である(判定なしの対象拡大を許すほうが FR-001 違反)。段階的に subjects が変化する authoring 作業では系列ごとに receipt を取り直す運用になるため、fixture に「subjects 増加 → 新系列 hold → 新 receipt で解消」の連鎖ケースを 1 つ置き、実装者がこの挙動を欠陥と誤解して「緩い系列一致」へ改変する退行を防ぐ。
- **BR-U2-23**: hold 判定表 1〜5 行 + HoldFailure 3 variant の fixture(AC-001/002/006 の受け入れ fixture の基礎 — 判定は build-and-test stage が主体、`unit-of-work-story-map.md` § AC → Unit 対応)。stale fixture は「current verdict 生成後に identity を変化させる」手順で作る(AC-006 の Given を忠実に再現)。
- **BR-U2-24**: 承認 provenance の負例(偽 timestamp・偽 SHA-256・shard 不一致)fixture で `approval-missing` を実測する(検証劇場の防止 — 落ちる実証)。
- **BR-U2-25**: 宣言 parse 失敗 → hold 側へ倒れる経路の落ちる実証(BR-U2-18 の赤の実在確認)。

## 上流トレーサビリティ

- `unit-of-work.md`(U2 境界)、`unit-of-work-story-map.md`(FR-001/003/004/005/007 主担当、AC-001〜004/006)
- `requirements.md`(FR-001、FR-003〜FR-005、FR-007、§2.4、NFR-001〜NFR-003、NFR-006)
- `components.md` §C1/§C9、`component-methods.md` §C1/§C9/§共通規約、`services.md` §S1/§S7
- `decisions.md` ADR-6 改訂、`functional-design-questions.md` Q1 裁定(人間承認 2026-08-04T18:29:01Z)
