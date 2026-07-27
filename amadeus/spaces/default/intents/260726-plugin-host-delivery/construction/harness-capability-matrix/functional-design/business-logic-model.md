# Business Logic Model — U1 harness-capability-matrix

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> U1 の「ロジック」= プローブ実施と判定の手順(コード変更なし — unit-of-work.md U1 の deployable 境界どおり record 文書 PR)。services.md の常駐なし判定に従い、全手順は単発実行。

## プローブ手順(ハーネスごとに反復)

1. **面の列挙**: distribution / trust / composeTrigger / rootResolution / userOps / degradeContract の 6 面(requirements FR-1)を対象に固定(seam-feasibility-multi-facet — 単一面の実測で「可」を確約しない)
2. **一次資料の直読**: リポジトリ内の実装(`packages/framework/harness/<name>/` の manifest / hooks / settings)と、ホスト公式資料(ある場合)を読み、引用は file:line で記録
3. **実測プローブ**: composeTrigger は「書き手の起動条件」まで実測する(seam-writer-mode-precondition — フック定義の存在だけで発火可と確約しない)。プローブは本番経路の前処理を全数再現(probe-preprocessing-parity)。ライブ起動が本セッションで不能な面は `deferred(実装時実測)` として記録し、確定条件を 1 行で書く
4. **クラス割当**: ADR-4 の 3 値(components.md C9)へ判定。判定不能は manual-only へ fail-closed
5. **degrade 契約の起草**: 非対応面ごとに「利用者は何を 1 コマンドで行うか+doctor に何が出るか」を明文化(unit-of-work-story-map ジャーニー 1/2 の該当ステップへ trace)

## 判定ロジック(決定的)

- `native-manifest`: ホスト標準のプラグイン導入コマンド/UI が実在し(実測)、かつ install 後の成果物配置が Amadeus の compose 入口から到達可能
- `folder-drop-auto`: 標準導入機構はないが、セッションライフサイクルのフックから `bun` スクリプトを起動できることが実測できる
- `manual-only`: 上記いずれも実測不能。手動 1 コマンド(component-methods.md C1 の compose verb)のみを契約とする
- 3 値のどれに落ちるかは実測結果からの機械的判定であり、希望的割当(存在しない機構の仮定)は FR-1 合否で不合格

## 出力

judgment を含む能力マトリクス文書(domain-entities.md の HarnessCapabilityRow × 7)+プローブ記録(ProbeRecord 列)。両者は同一成果物内の別節とし、マトリクスの各セルからプローブ記録へ参照 ID で trace する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:43:33Z
- **Iteration:** 1
- **Scope decision:** none

6 面契約の個数照合・決定的判定・BR テスト可能性・UI 非該当は妥当。Major 1: ADR-4 3 クラスの literal が上流 component-methods.md(folder-drop)と本 Unit(folder-drop-auto)で逐語不一致 — U3 のコード分岐で機械判別不能になる。Minor 1: domain-entities の列数記述の自己矛盾。

### Findings

- [Major] component-methods.md:30 vs domain-entities.md:11 / business-logic-model.md:17 の folder-drop クラス literal 逐語不一致(cross-unit-type-verbatim-check)— canonical(decisions.md ADR-4)へ統一が必要
- [Minor] domain-entities.md:29 の列数記述が自己矛盾(7 フィールド vs 6 列)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:45:53Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の 2 指摘は閉包。folder-drop-auto literal は component-methods.md と U1 FD で逐語一致(ADR-4 正準 3 値統一)、列数記述も requirements の 7 行×6 列定義と整合。

### Findings

- None
