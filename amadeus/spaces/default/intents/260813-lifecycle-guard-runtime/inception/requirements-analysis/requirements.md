# Requirements — Issue #2771: 全ライフサイクル共通の Guard Runtime 導入

上流入力(consumes 全数): business-overview.md, architecture.md, code-structure.md

> 事実の出典規律: ガード棚卸し(G1〜G40)・判定語彙 5 系統・G7/G9 の fail 方向・2 層構造は、本 intent の RE が更新した codekb `architecture.md`「ライフサイクル進行ガードの集約構造と分散(260813-lifecycle-guard-runtime、現在、observed `89532174c`)」節と `re-scans/260813-lifecycle-guard-runtime.md` から引く。`business-overview.md`(フレームワークの目的・利用者価値)と `code-structure.md`(`packages/framework/core/` 正本と dist 投影の境界)は本 intent の RE で「レビュー済み無変更」の面であり、一般文脈としてのみ前提にする(cid:requirements-analysis:c4-consume-header-is-not-citable-content)。Issue #2771 本文・クロスレビュー 2 名(run `xrev-2771-20260813131430`、CONFIRMED_WITH_REFINEMENTS ×2)・requirements-analysis-questions.md の裁定 Q1〜Q4 を一次入力とする。G1〜G40 の個別番号の詳細(file:line・verbatim・分類)は `re-scans/260813-lifecycle-guard-runtime.md` が一次ソースであり、`architecture.md` 現在節はその構造の転記のみを持つ。

## Intent 分析

ライフサイクル進行可否を判定するガードが 5 系統の判定語彙(`error()` exit / recovery 付き判別ユニオン / boolean / typed error class / `{ok, reason}` Result)に分裂し、新ガード追加のたび全完了経路への手作業配線(#2747 の実例: +75 行/テスト +182 行)が必要で、配線漏れは無音で fail-open に倒れる。目標は、権威あるライフサイクル遷移のチェックポイントに共通の Guard Runtime Interface を通し、宣言駆動の適用解決・決定的実行順序・fail-closed 集約・監査・復旧案付き結果語彙を一貫させること。裁定 Q4 により、これは新規モジュールのゼロベース新設ではなく**既存機構の汎化・昇格**(G5 chokepoint の Interface 化、G7/G8 宣言駆動様式の checkpoint 汎化、G38 結果型の拡張)として実現する。

## 機能要件

### FR-1: 共通 Guard Interface と結果語彙

checkpoint と context を受け、対象ガードを解決・評価して verdict を返す共通 Interface を `packages/framework/core/tools/` に定義する。結果語彙は `ALLOW` / `DENY` / `UNKNOWN` / `NOT_APPLICABLE` の判別ユニオンとし、理由・証跡・policy identity・対象 revision・復旧案(recovery)を表現できる。新規のユニオン重複を作らず、`IntentOperationGuardResult`(`amadeus-lib.ts:3042`)系の `{kind, error:{recovery}}` 様式を拡張する(裁定 Q4)。受け入れ: 型と評価関数が存在し、後述 FR-8 の対照テストが全語彙を消費する。

### FR-2: 4 checkpoint + 前進 jump の Runtime 経由(迂回不能の測定述語)

Intent 生成(`handleIntentBirth`、G1〜G4)、Stage 完了(`verifyStageCompletionGuards` 呼出 4 ハンドラ、G5)、Phase 遷移(`verifyPhaseCheckArtifact` 呼出 5 箇所 — 前進 jump `amadeus-jump.ts:581` を含む、G11)、Workflow 完了(G12〜G17)の各遷移 commit 経路が、状態書込前に共通評価関数を呼ぶ。「迂回できない」の測定述語: 対象遷移ハンドラの census テストが評価関数呼出の存在を固定し、census 外の新規遷移ハンドラ追加はテスト赤で検出される(裁定 Q1)。受け入れ: census テストが 4 checkpoint + jump の全 commit 経路を列挙し green。

### FR-3: fail-closed 集約規則の決定性と文書化

適用対象ガードの verdict 集合に `DENY` / `UNKNOWN` / 例外 / タイムアウトが 1 件でもあれば遷移を確定せず、状態ファイルと関連部分状態を書き換えない(既存の error()-before-write 様式を契約化)。複数ガードの適用判定・実行順序・集約規則は決定的とし、設計文書に記録する。fail-closed は Runtime の**集約規則**に適用し、個別ガード内部の判定ポリシー(G9 真理値表を含む)は変更しない(裁定 Q2)。受け入れ: 集約規則の単体テスト + 順序決定性のテスト。

### FR-4: ガードの無権限性(判定と状態変更の分離)

ガード(Adapter)は verdict を返すのみで、ライフサイクル状態を直接変更する権限を持たない。状態更新は Runtime の判定後にコア(既存の遷移ハンドラ)だけが原子的に行う。受け入れ: Adapter Interface に状態書込手段が渡らないこと(型レベル)と、評価中に状態ファイルが不変であることのテスト。

### FR-5: built-in / ユーザ空間 Adapter の信頼区分

システム不変条件のガードは built-in Adapter として登録し、利用者から無効化できない。ユーザ空間 Adapter は明示的な信頼・設定がある場合のみ実行され、未設定プロジェクトの挙動を変えない。登録 Seam は既存 sensor サブシステムの登録面(`.claude/sensors/*.md`、dormant 実例 `amadeus-sensor-self-scope-consistency.ts` の scope 活性化様式)を信頼区分付きで流用し、消費者ゼロの新規登録スロットを先行着地させない(裁定 Q4、inception ノルム E-PM9 C7 整合)。受け入れ: built-in の無効化不能テスト + 未設定プロジェクトでの挙動不変テスト。

### FR-6: 既存ガードの棚卸し分類と移行対象の確定

RE の G1〜G40 棚卸しを正本として、各ガードを built-in / policy(ユーザ空間相当)に分類し、移行対象(FR-2 の 4 checkpoint + jump に係るガード)と移行対象外(batch gate G37、swarm retry G35、park G30、delegate 系 G26/G27 等)を根拠併記で成果物に確定する(裁定 Q1)。★ base 以後着地の G22(`admitProductionStageFailure`)も分類対象に含める。受け入れ: 分類表が G1〜G40 を全件被覆し、対象外に根拠が付く。

### FR-7: 移行の無変更回帰

移行対象ガードについて、移行前後で判定結果と復旧可能性が変わらないことを回帰テストで確認する。G9(`amadeus-sensor.ts:19-31`)の fail-open 真理値表は「個別ガードが判定するポリシー内容」として無変更で保存し、既知の逸脱として本節に明記する — 是正は別 Issue 起票候補(裁定 Q2)。`AMADEUS_SKIP_*` off-switch 4 種・blocking sensor の日付 cutoff の挙動も保存する。受け入れ: 移行前後の判定結果を突き合わせる回帰テスト green。

### FR-8: 主要 checkpoint の対照テスト

各主要 checkpoint(Intent 生成 / Stage 完了 / Phase 遷移 / Workflow 完了)について、allow / deny / unknown / not-applicable / 例外 / タイムアウト / 複数ガード競合の対照テストを備える。前進 jump は Phase 遷移の試験マトリクスへ折り込み、完了ガード(`verifyStageCompletionGuards`)を通らない設計上の非対称も対照観点に含める。受け入れ: 7 観点 × 4 checkpoint(+jump 折込)の組で、適用不能な組は根拠付きで明記のうえ省略可(無言の省略は不可)。

### FR-9: 設計記録(ADR)

Module、Interface、Seam、Adapter、信頼区分、監査、原子性、fail-closed 規則、および「新規新設でなく既存機構の汎化・昇格」の裁定(reuse inventory: G5 chokepoint / G7/G8 宣言駆動 / G38 結果型 / sensor 登録面)を ADR または同等の設計文書へ記録する。代替案(ゼロベース新設、Interface のみ先行着地)は Alternatives Rejected に記録する。受け入れ: 設計文書が上記全項目を含む。

## 非機能要件

- **監査**: ガード評価の結果は既存 audit 語彙(`knowledge/amadeus-shared/audit-format.md`)の範囲で監査に残す。新規イベント種別の発明はしない(必要なら設計段で既存種別への写像を確定)。
- **決定性**: 同一入力(checkpoint、context、登録集合)に対し評価順序と集約結果は決定的。
- **性能**: 実時間の性能目標を宣言する承認済み NFR は存在しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — ベンチマークは作らない。この判定を覆す条件: 遷移レイテンシの実測退行が Issue として起票された場合)。

## 制約

- `packages/framework/core/` を正本とし、`bun run build` で全ハーネス dist とセルフインストール面を再生成する(dist は編集しない)。
- TDD 既定(team.md Testing Posture): 公開 seam への失敗テスト先行 → 最小実装の vertical slice 反復。
- ブロッキング CI 集合(typecheck / lint / 再現性 / source-only / グラフ不変量 / テスト / Project & Patch Coverage / plugin-conformance-e2e)を満たす。`tests/.coverage-patch-allowlist.json:124` の `authorizeWorkflowCompletion` エントリはガード実装変更時に整合を取る。
- 認可に関わる変更のため directive contract / state transition / audit invariant / race / harness drift のテスト検証を行う(project.md Mandated)。
- 配布フレームワークへ runtime dependency を追加しない。

## 前提

- Issue #2771 は enhancement だがユーザーが scope `self-fix` を明示指定した(ワークフローは 10 stages / Minimal)。深度助言: 本件は system-wide の複雑度であり Minimal と強く乖離する — `--depth` override の検討をゲートで助言する(stage-protocol §8。本ワークフローは full autonomy のため記録のみ)。
- クロスレビュー 2 名の refinement(chokepoint 既存、jump 明示、AC 衝突の切り分け、語彙重複、reuse inventory)は要件へ反映済みで、Issue 本文の書き直しは要しない(本 requirements が設計入力の正本)。

## スコープ外

- 個別ガードが判定するポリシー内容の変更(G9 真理値表の fail-open 是正を含む — 別 Issue 起票候補)。
- 新しいリポジトリ固有ポリシーの追加、`self-*` rebase/build 整合性ポリシー(#2772)。
- harness hook 層(G30 Stop hook 二重実装 / G40 PreToolUse deny)の Runtime 統合 — 状態遷移の commit は CLI 層でのみ確定し、hook 層は defence-in-depth として現状維持(裁定 Q3)。
- `AMADEUS_SKIP_*` 4 種の再設計・`writeStateFile` の単一所有者化(reviewer-1 観測事実 B — 迂回不能 AC は FR-2 の census 述語で測定し、テスト用 off-switch は保存)。
- 移行対象外ガード(G30/G35/G37 等)の Runtime 移行(FR-6 で分類・根拠記録のみ)。
- 入力検証・CLI 構文検証・一般 FS 安全確認の共通化(Issue 定義どおり)。

## 未解決の問い

- G9 fail-open 是正の別 Issue 起票(実測付き)— build-and-test 段までに起票判断(§14 経路)。
- `DecisionReviewState` 同名別定義並存(reviewer-2 範囲外指摘)— 本 intent 対象外、起票候補。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-13T16:30:10Z
- **Iteration:** 1
- **Scope decision:** none

READY — BLOCKER 0。FOLLOW-UP 1(G番号一次ソースの明記、適用済み)+ NIT 2(FR-8 jump 折込は適用済み、Q4 出典は同ヘッダ補記で対応)。AC trace・裁定 Q1〜Q4 反映・スコープ外の申告性は確認済み

### Findings

- FOLLOW-UP | requirements.md FR-1/2/6/7 | G 番号詳細の一次ソースは re-scans/260813-lifecycle-guard-runtime.md であり architecture.md 現在節は構造転記のみ — 出典ヘッダへ補記(適用済み)
- NIT | requirements.md FR-8 | jump が対照テスト対象として未明記 — Phase 遷移マトリクスへの折込と完了ガード非対称の観点を追記(適用済み)
- NIT | requirements-analysis-questions.md Q4 | verifyBlockingSensors 特徴付けの一次証跡が consumed 節に不在 — 一次ソース明記で対応(適用済み)
