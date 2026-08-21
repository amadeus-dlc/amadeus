# TLA+ Authoring — Applicability Assessment(terminal: not-applicable)

- intent: 260820-fmc-drift-batch / scope: self-feature
- 判定日: 2026-08-21 / 判定断面: origin/main `99f61828c`(全4 Bolt PR 着地後)
- 上流入力: `inception/requirements-analysis/requirements.md`

## 検査した識別子(全数)

FR-ARM-1〜7 / FR-REG-1〜5 / FR-BND-1〜6 / FR-RET-1〜4 / FR-X-1〜4 / NFR-1〜3(requirements.md の FR/NFR 全見出しを列挙 — `grep -n '^###\|^- \*\*FR-\|^- \*\*NFR-'` による)。

## subject 選定(選定基準: 共有状態を持つ並行・再開可能アクター + 無音で残存しうる安全性違反)

**選定 0 件。** 各候補の棄却根拠(cid:tla-authoring:tla-spec-change-discriminator の判別規則 — 状態・遷移・相互排除規則を追加するかで見る):

| 候補 subject | 棄却根拠 |
|---|---|
| FR-ARM(適用性判定の2本の腕) | 純粋述語群の追加(`tla-applicability-arms.ts`、import-only 統合)+ fail-closed 拒否ガード。新しい状態機械・遷移・相互排除を導入しない。engine の advisory/hold 機構自体は非接触(tier (ii) は既存機構の消費) |
| FR-REG(registration committer の revise-model 置換) | 単一プロセス CLI のデータ操作 + 不在名の loud 拒否(fail-closed ガード追加)。並行アクターなし |
| FR-BND(実装境界3面是正) | validator/loader/glob の fail-closed 強化と既存契約への対称性回復 — 判別規則が spec 変更に当たらないと明示する2類型そのもの |
| FR-RET(authoring-hold 経路の完全退役) | 経路の削除であり状態・遷移の追加なし。engine 非接触(amadeus-orchestrate.ts diff 0 — advisory-retirement code-summary BR-2)。登録モデルは advisory authoring-hold を被覆しない(下記語彙 probe) |
| waiting terminal(FR-3 系 subject) | 本 intent の Out of Scope — 別 intent 裁定済み(Issue #3246、requirements.md Out of Scope 節) |

## 実測根拠

1. **pin 交差ゼロ**: model-map の実装ハッシュピン全 21 entries(BoltPrAttestationGate 6 / FormalElection 5 / MirrorLifecycle 4 / PrConvergenceGate 6、origin/main 断面)に対し、4 merge commit(`1a1ffb58f` / `e28ed4cf3` / `40090987e` / `3ae6223f4`)の `git show --stat -- <pinned paths>` は**全て空**(pin 対象 0 ファイル接触)。触っていない pin は non-target 側(cid:tla-authoring:tla-impl-only-evidence-shape)
2. **語彙 probe(対照つき)**: 登録7 .tla ファイルへの subject 語彙 grep(大小文字非区別)— `authoring` 0 / `revise` 0 / `registration` 0。`applicability` 1 hit・`boundary` 3 hit は実読で同音異義(mirror action の applicability suppression / mirror event boundary — 本 intent の subject と意味論不一致)を確認。対照 `VARIABLES` は各実モデルで非ゼロ(probe 健全)
3. **namedInvariants 列挙**: 4 モデルの不変量(EvidenceCurrentHead / SensorRequiresAttestation / QuestionIdsUnique / NoCloseWithoutLandedSync / CodeGenerationGuarded 等 — model-map vocabulary 全列挙)に authoring-hold / revise-model / 実装境界 / 適用性判定の腕を扱うものは存在しない

## 判定

選定 subject 0 件につき、ステージ本文 Step 1 の定めどおり **terminal `not-applicable`** を記録してステージを正常終了する(CLI receipt・human gate は非該当アーム — 本アームは「record a terminal not-applicable assessment with the inspected identifiers and stop the stage successfully」)。author-new / revise-model / impl-only のいずれの経路にも入らない。

## 未検証面の書き分け

本判定は「本 intent の変更が形式モデルの新設・改訂を要求しない」ことのみを確定する。既存4モデルの drift 不在検証は formal-model-check ステージ(および CI の model-completeness ゲート — 4 PR の CI Success に包含)の担当面であり、本ステージの検証実績ではない(cid:formal-model-check:c1-authornew-separation-halt-exemption 条件 (b) の書き分け)。
