# Units Generation: Unit of Work 定義

承認済み Application Design(`inception/application-design/` の components.md、component-methods.md、services.md、component-dependency.md、decisions.md)の C1〜C10 を 3 つの Unit of Work へ分解する。要求の正本は `inception/requirements-analysis/requirements.md`(FR-1〜FR-7、NFR-1〜NFR-6、C-1〜C-5)。user-stories stage は本 scope で SKIP のため stories.md は存在しない — 対応付けは `unit-of-work-story-map.md` が FR/NFR 単位で行う。

## Unit 一覧

| Unit | kind | 含む component | 複雑度 | 規模見積(行) |
|---|---|---|---|---|
| U1 `seam-bridge` | library | C1 frontmatter seam bridge、C2 produces overlay 結線 | M | 実装 ~180-330 + テスト ~250-380 |
| U2 `convergence-toolchain` | library | C3 収束述語、C4 台帳生成器、C5 収束 CLI、C6 gh 実行子 | L | 実装 ~460-800 + テスト ~550-900 |
| U3 `plugin-packaging-e2e` | packaging | C7 工程断片、C8 センサー manifest、C9 plugin.json、NFR-1〜3 対実証 | M | md ~260-470 + テスト ~300-450 |

規模の導出: 実装行は components.md の「規模の正当化」表からの機械集約。テスト行のうち U1 の C2 結線ぶんと U3 の対実証(NFR-1〜3 の E2E テスト)は components.md に対応行が無いため本ステージの独自算出(C2 結線 +50-80 行、E2E 対実証 300-450 行)であり、機械集約でない旨をここに明記する。合計: 実装 ~640-1,130 行+テスト ~1,100-1,730 行+md ~260-470 行(数値見積り — inception ガードレール準拠)。

C10(`unitCovered` / `firstUncoveredBatch`)は無変更(データ点火のみ — C-2)のため、どの Unit にも割り当てない。

## 各 Unit の定義

### U1: seam-bridge(library — core 変更)

- **責務**: 実ステージ frontmatter の parse/serialize(バイト保存型、ADR-1)と、既存 seam 機構(merge/台帳/drop 復元)への結線。install 時の `code-generation` produces への `pr-convergence-report` overlay 追記が compiled graph と `unitCovered`(C10 — 無変更)へ到達することまでを所有
- **境界**: core(`packages/framework/core/tools/amadeus-plugin-compose.ts` / `amadeus-plugin.ts`)のみ。plugin バンドルには触れない。既存 `serializeStageSeams`(合成バイト形、t301 固定)は不変
- **独立実装可能性**: fixture plugin manifest(seam 宣言のみの最小 manifest)で E2E 検証可能 — U2/U3 に依存しない
- **主対応**: FR-1a/1b、FR-2a/2b/2c/2d、NFR-1(対実証の install 面)、C-2
- **実装注意**: parse→serialize 往復の byte-identity テスト必須(ADR-1 Consequences)。produces_kinds は導入しない(FR-2c)。requirements A-2(FR-2a 不成立時は実装前停止して人間へ escalate)の対象 Unit である — Bolt 編成・walking-skeleton 該当性・実装順序の決定は Delivery Planning(2.8)が所有する

### U2: convergence-toolchain(library — plugin tools)

- **責務**: 収束述語の単一定義(C3 — thread 4区分・UNKNOWN-retry・CLEAN 判定、ADR-2/ADR-4)、thread 台帳の GraphQL 機械導出(C4 — ページング・`__typename` bot 判定・severity 転記・終端処理)、gh 実行子(C6 — 4契約、ADR-6)、収束 CLI(C5 — status/report/override の3 verb、ADR-3)
- **境界**: `plugins/pr-convergence/tools/` の4ファイル。core への import なし(E-PCP-ADDEV 裁定)。前進可否の判定はしない(ガードは C10 の1定義所有)
- **統合根拠(cid:units-generation:c1 の検証)**: 述語・台帳(検出)と CLI(配送)は片側だけでは利用者価値を出荷できない境界のため単一 Unit へ統合。C6 は C4 の直接依存(独立ファイル)で同一バンドル
- **独立実装可能性**: GraphQL fixture(実 PR 実測から採取 — A-1)と record fixture で U1 なしに全テスト可能
- **主対応**: FR-3a〜3d、FR-4a〜4c、FR-5(CLI 面)、FR-7a〜7c、NFR-2、NFR-3
- **実装注意**: 外部 seam 語彙は実装前に実 PR で実測し fixture 化(A-1)。override は最新実 HUMAN_TURN 束縛(ADR-3)。retry はタイミングシームで決定的テスト(ADR-4)

### U3: plugin-packaging-e2e(packaging)

- **責務**: plugin manifest(C9 — tools 4ファイル+import 閉包全数)、収束ループ工程のステージ本文断片(C7 — 工程(0)-(5)+トリアージ基準+Guardrail self-contained、FR-5c)、レポート様式センサー manifest(C8 — core 側配置、ADR-5)、および NFR-1〜3 の対実証(install/未 install・落ちる実証・述語赤 fixture)
- **境界**: `plugins/pr-convergence/` バンドル+`packages/framework/core/sensors/` の manifest 1点+E2E テスト
- **依存**: U1(seam 受理)と U2(tools 実体)の両方に依存 — compose の E2E は両者が揃って初めて成立
- **主対応**: FR-1(opt-in 境界の実証)、FR-5a〜5c、FR-6a/6b、NFR-1〜NFR-4、NFR-6
- **実装注意**: C8 は plugin stage frontmatter の `sensors:` 宣言より先に core へ着地(compile の未知 id loud 拒否 — ADR-5。同一 Bolt 内なら着地順で担保)。tNNN は t444 以降を予約(NFR-5)

## Unit 分割の検証(Delivery Planning 前の独立実装可能性)

- U1 ∥ U2 は並行実装可能(編集面: core tools vs plugins/ — ファイル非交差)
- U3 のみ直列依存(U1+U2 の統合点)
- 検出と記録・判定と配送のように片側だけで価値を出荷できない境界は U2 内へ統合済み(上記統合根拠)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T07:44:24Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(実装順序・critical path 言及)は3成果物全域で解消済み、FOLLOW-UP/NIT も是正確認、規模合算値も再計算で一致

### Findings

- FOLLOW-UP | components.md 自体が現在 AD Review Iteration 2 で NOT-READY(C6 所在の矛盾: components.md=C5内埋め込み vs component-dependency/component-methods=独立モジュール)であり、unit-of-work.md U2 は独立モジュール側の記述を採用している — AD が逆方向で確定した場合は U2 境界記述の再同期が必要
