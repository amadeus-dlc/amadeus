# Logical Components — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(明記): 同 unit の business-rules.md、domain-entities.md。本書の保証機構表は、前4書(performance / security / scalability / reliability)の設計が確定した**後に**そこから導出した(`cid:nfr-design:c7` — 設計途中の断定的インベントリを避けるため、本書を nfr-design の最後に書いた)。

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(FD 群の ref `c8702be09` との対象パス差分は空)。

---

## 1. モジュール構成(2 ファイル)

business-logic-model.md §1 / business-rules.md BR-MP-2 の閉集合をそのまま採る。

| # | モジュール | 種別 | 責務 |
| --- | --- | --- | --- |
| M-1 | `tests/helpers/arbitraries/mirror-snapshot.ts` | 新規 | 妥当な `MirrorStateSnapshot` 値の**生成**。3 つの export(`mirrorTimestampArb` / `mirrorEventArb` / `validMirrorSnapshotArb` — domain-entities.md §3) |
| M-2 | `tests/unit/t274-amadeus-mirror-state-codec.test.ts` への追記 | 既存への追記 | プロパティ **P-MR1** の宣言と判定。seed 定数 `MIRROR_PBT_SEED` と DEEP 分岐の保持 |

依存方向は **M-2 → M-1 → 正本(`packages/framework/core/tools/`)** の一方向のみ。M-1 は M-2 を知らず、正本はどちらも知らない。循環は無い。

## 2. 保証機構の層別

**一枚岩の「構造的に保証される」という断定は置かない**(`cid:nfr-design:c4`)。保証は層ごとに機構が異なり、強さも異なる。下表は「何が・どの層で・どう保証されるか」と、**その層では保証されないもの**を並記する。

| 層 | 保証されること | 機構(強さ) | その層で保証されないこと |
| --- | --- | --- | --- |
| L-1 正本(`amadeus-mirror-state-codec.ts` ほか) | ワイヤ形の正規化と意味検証。破損入力の棄却 | 型と実装(`MirrorStateParse` 判別ユニオン `:111-117`、`validate*` / `check*` 群)。**本 unit の変更対象外**なので、本 unit は強さを増やしも減らしもしない | 生成器が作る値が妥当であること — 正本は「与えられた値を検証する」だけで、テストが妥当な値を作ることは保証しない |
| L-2 生成器 M-1 | 生成値が受理ドメイン内であること | **構成的生成**(status を先に引き、必要フィールドを同ステップで付与 — domain-entities.md §3)。正本関数 `mirrorEventKey`(`amadeus-mirror-policy.ts:111`)の呼び出しで key を導出。強さは中 — 生成器の欠陥は L-3 の `kind === "ok"` 判定で赤として現れるが、**被覆の欠落**(生成されない領域)は自動検出されない | 受理ドメイン**全域**の被覆。v1 は domain-entities.md §3 の表で非対象を明示列挙しており、非対象は「未被覆」であって「検証済み」ではない |
| L-3 プロパティ M-2 | `render ∘ parse ∘ render = render` が生成域で成立すること | `fc.assert` + 2 点判定(BR-MP-6)。強さは numRuns と生成分布に依存する**確率的**保証であり、証明ではない | 生成域外の入力に対する round-trip。および棄却契約(それは既存 example 16 件 `:72-313` と Must unit の担当 — business-rules.md BR-MP-7) |
| L-4 実行規約 | 再現性・非空回り | 固定 seed(reliability-design.md §2)+ 落ちる実証(同 §3)。seed は決定性を機械的に固定するが、**空回りは seed では防げない**ため落ちる実証が別途要る | 実行時間の上限遵守 — これは L-5 の実測転記が担う |
| L-5 ゲート | 時間予算・変更面・既存資産の非退行 | 機械合否(`bun test` 実測転記 = BR-MP-10、`git diff --name-only` = BR-MP-2、削除行 0 = BR-MP-3、`grep -c` 各種 = BR-MP-4 / 6 / 7 / 8) | 設計意図の妥当性 — 機械合否はレビューを代替しない |

層の独立性についての注記: L-2 の欠陥のうち「妥当でない値を作る」種は L-3 で赤として顕在化するが、「妥当だが偏った値しか作らない」種は**どの層でも自動検出されない**。これは本 unit が受け入れた残存リスクであり、緩和は domain-entities.md §3 の非対象表を明示的に残すこと(=読み手が被覆範囲を誤読しないこと)に限られる。

## 3. 責務の非重複(既存資産との分界)

business-logic-model.md §5 の直交2軸をコンポーネント視点で再掲する。**新旧いずれも相手の軸を振らない**。

| コンポーネント | 振る軸 | 固定する軸 |
| --- | --- | --- |
| 既存 property(`t274:341`「外側」) | 周辺バイト(prefix / suffix)+ revision | snapshot は `EMPTY_MIRROR_STATE` 近傍に固定 |
| 新規 P-MR1(M-2、「内側」) | snapshot 空間(`validMirrorSnapshotArb` 全域) | 周辺バイトは**空**(`renderMirrorStateBlock` 単体、`wrap`(`t274:39`)は使わない) |

M-1 は他の arbitrary ファイル(`election.ts` / `state-receipts.ts` / `state-field.ts` — component-methods.md U8)に触れない。これが batch 2 の非交差条件(unit-of-work-dependency.md「helpers 内は別ファイル」)を満たす構造上の根拠である。

## 4. インベントリ(設計確定後に導出)

`cid:nfr-design:c7` に従い、以下は前4書の設計が確定した後に導出した確定リストである。

**触るファイル(2)**

1. `tests/helpers/arbitraries/mirror-snapshot.ts`(新規、export 3 つ)
2. `tests/unit/t274-amadeus-mirror-state-codec.test.ts`(追記のみ、削除行 0)

**触らないファイル(明示)**: `packages/framework/core/tools/` 配下すべて / `dist/` 配下すべて / `tests/helpers/arbitraries/` の既存3ファイル / `t274` の既存テスト本体。

**規模**: components.md U7 の **60〜90 行**(内訳見積: arbitrary 40〜55 行 + プロパティ 20〜35 行 — domain-entities.md §3 が転記)。

**新設しない機構**: 新規テストランナー / 新規 CI ジョブ / 新規 sensor / キャッシュ層 / 妥当性判定述語(BR-MP-8 が禁止) / 後方互換シム。

## 5. 未確定として残すもの

- P-MR1 の実測実行時間(performance-design.md §4 は**推定**。実測は実装時に PR 本文へ転記する)。
- seed 提案値 `0x27_4d17` の最終確定(reliability-design.md §2 の手順を実装時に再実行してから固定 — 本書執筆時点の重複ゼロ実測は当時の ref のもの)。
- 着手可否そのもの(Could unit。business-rules.md BR-MP-1 の3条件を conductor が判定し、見送りも正常な結果として bolt-plan.md に記録される)。
