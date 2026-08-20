# Logical Components — boundary-three-face(U2 / #2929)

上流入力: `construction/boundary-three-face/functional-design/business-logic-model.md`(3面是正手順)/ `security-design.md`(本ステージ同梱)。NFR Requirements 群(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は不在かつ設計どおり(security-design.md 冒頭と同じ宣言)。本書は境界是正の**論理コンポーネント台帳** — デプロイ基盤を持たない intent のため、境界はコード面(validator / loader / sensor / 台帳)で表す。

## コンポーネント境界と blast radius

| 論理コンポーネント | 本 unit での扱い | blast radius / 隔離根拠 |
|---|---|---|
| validator 境界(`amadeus-formal-verif-model-map.ts` の `IMPLEMENTATION_PATHS` + `isCanonicalImplementationPath`) | 形状変更 + export 化(FD 手順1) | 受理集合の拡大のみ・拒否メッセージ契約不変(FD business-rules.md BR-2)。既存13 entries(全て core 配下)の受理に影響なし(包含証明 — FD「OQ-3 の確定」) |
| loader 境界(`tla-model-loader-internal.ts` `verifyImplementationEntries`) | ハードコード撤去 → 共有述語 import(FD 手順2) | 1定義化で validator/loader の不整合クラス(#2890 由来の休眠バグ)が構造的に消滅。spec-dir 検査の `isContained` 用途は非接触 |
| sensor manifest(`sensors/amadeus-model-completeness.md` `matches` glob) | entries 全被覆へ更新 + drift テスト新設(FD 手順3〜4) | advisory sensor — over-coverage は余剰発火で安全側、under-coverage は drift テストが赤で検出(fail-closed) |
| model-map.json(`amadeus/spaces/default/specs/tla/model-map.json`) | PR系2モデルへ +8 entry(FD 手順5) | model/cfg identity・vocabulary 非接触。本 intent で本ファイルを書くのは U2 のみ(unit write scope 非交差 — unit-of-work.md「非交差の正確な主張」) |
| `run-model-check-artifacts.ts` の `isContained` | **非接触**(FR-BND-6 の名指し境界) | 用途が異なる同名関数 — failure domain の外 |
| engine ファイル(`amadeus-orchestrate.ts` / `amadeus-state.ts`) | **非接触** | 既存 hash pin は resync 不要(U2 は engine 非接触 — FD「生成台帳・CI 整合」) |
| pr-convergence plugin 4ファイル | **読取のみ**(sha256 計算 + governed 化) | ファイル内容は不変 — governed 化以後の変更義務(pin resync)は将来の変更側 PR に帰属(FD domain-entities.md ライフサイクル) |
| テスト面(t-formal-verif-canonical-core 拡張・loader 境界テスト新設・glob drift テスト新設) | FD「落ちる実証」の3面 | 着地先は既存テストファイル + 新規1本 — 実 map 消費テスト(tla-toolchain-harness 等)は境界一般化と entries 追加の同一 PR 原子性で parse 互換保存 |
| 生成台帳(`tests/.coverage-registry.json`) | 新規テスト分の regen 同梱 | 全 unit 共有の既知面 — registry-merge-recomposition の既定運用対象 |

## 障害ドメインと封じ込め検査

- **3面同時是正の原子性**: validator 一般化 → loader 1定義化 → entries 追加は同一 PR で原子的に着地し、「validator は受理するが loader が拒否する」中間状態を main に置かない(FD 手順6)。
- **封じ込めの機械検査**: (a) glob drift テスト(entries ⊆ glob を fail-closed 検査)、(b) SOURCE_DRIFT 実測(sha256 1 byte 改変で `hash differs` 拒否 — FD 手順6)、(c) validator 境界の受理/拒否 両側テスト。いずれも FD「落ちる実証」節を唯一の正本として参照(本書で再定義しない)。

## NFR パターン適用点(Infrastructure Design への橋渡し)

本 intent はデプロイ基盤・常駐サービスを持たず(`inception/application-design/services.md`「新設サービスなし」)、infrastructure-design ステージはスコープ外。本書の境界台帳が NFR 設計と code-generation の間の唯一の橋であり、追加のインフラコンポーネントは存在しない。
