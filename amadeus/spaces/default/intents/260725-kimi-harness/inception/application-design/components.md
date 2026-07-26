上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

# Components — 260725-kimi-harness

requirements.md の FR-1〜FR-10 を、codekb(architecture / component-inventory)が確定した既存構造の上に載せるコンポーネント群。team-practices の Walking Skeleton(最初の Bolt = C1)に従い、Bolt 分割の単位とも対応する。

## C1. harness/kimi 定義群(FR-1)

- **責務**: packager への宣言的な登録(manifest)と authored surfaces の提供
- **構成**: `packages/framework/harness/kimi/manifest.ts`・`skills/amadeus/SKILL.md` + `question-rendering.md`・`onboarding.fills.ts`・`dot-gitignore`・`hooks/amadeus-hooks.snippet.toml`(managed block の正本スニペット)
- **境界**: 「データで宣言できる 80%」を担う。ロジックは持たない(09-porting の三懸念ルール)
- **所有**: harness 表層。`emit: null`・`rulesRename: null`・runner-gen 既定

## C2. hook adapter(FR-2)

- **責務**: Kimi の hook payload(stdin JSON)を Claude 契約へ正規化し、core hooks へパイプする
- **構成**: `hooks/amadeus-kimi-adapter.ts`(薄い shim: stdin 読取・ターゲット分岐・subprocess 呼出のみ) + `hooks/amadeus-kimi-lib.ts`(変換ロジック。テスト対象はこちらに集約 — cursor 踏襲)
- **公開面**: 9 target(`session-start | session-end | mint | audit-and-sensors | state-sync | runtime-compile | validate-state | log-subagent | stop`)
- **境界**: core hooks は一切改変しない(byte-shared を維持)。fail-open は全 target で共通、Stop の block 契約のみ verbatim 中継

## C3. setup マージモジュール(FR-3)

- **責務**: ユーザーの `~/.kimi-code/config.toml` への managed block 冪等マージ/除去
- **構成**: `packages/setup/src/domain/kimi-hooks.ts`(managed block の生成・識別・除去の純粋ロジック) + `packages/setup/src/modules/kimi-hooks.ts`(plan report への差分表示組込み・wizard confirm 連携) + 既存 ports(fsops/apply-write)の再利用
- **境界**: TOML の parse/serialize は最小の構造的処理に留め、既存 `[[hooks]]`・ユーザーの他記述を保持。kimi 独自 UX を新設しない(cli.ts:190/:194/:296 の流儀に従う)

## C4. コア編集3箇所(FR-4)

- **責務**: ハーネス固有の「ロジックでしか表せない」編集(サンクション済み)
- **構成**: (a) `amadeus-utility.ts` の doctor arm(kimi 版) + otherTrees (b) `amadeus-swarm.ts` の `HARNESS_VALUES` (c) `amadeus-harness.ts` の `HarnessType`/`HARNESS_DIR_TO_TYPE`/`KNOWN_HARNESS_DIRS`/`KNOWN_RULES_SUBDIR`
- **境界**: これ以外の core 編集は行わない(09-porting の例外は doctor arm + 列挙のみ)

## C5. 配布・CI 列挙(FR-5)

- **責務**: 3閉集合と setup のハーネス列挙への kimi 追加
- **構成**: `packages/setup/src/domain/harness.ts`・`engine-layout.ts`・`modules/reporter.ts`・`scripts/plugin-projection.ts`・`scripts/promote-self.ts`・`scripts/detect-ci-changes.sh`

## C6. live driver(FR-9)

- **責務**: `kimi -p` 非対話駆動による journey 実行基盤
- **構成**: `tests/harness/kimi-print-drive.ts`(新規) + journey テスト `tests/e2e/t-print-kimi-*.serial.test.ts`(`AMADEUS_KIMI_PRINT_LIVE=1` ゲート)
- **境界**: 既存 driver(tui-drive/sdk-drive/kiro-acp-drive)と同じポート形状(skipReason・env ゲート・credits 明記)

## コンポーネント所有境界まとめ

| Component | 置き場所 | 変更種別 |
|---|---|---|
| C1 harness 定義 | `packages/framework/harness/kimi/`(新規) | 新設 |
| C2 adapter+lib | 同上 `hooks/`(新規) | 新設 |
| C3 マージモジュール | `packages/setup/src/`(新規2ファイル) | 新設 |
| C4 コア編集 | core tools 3ファイル | 列挙追加 |
| C5 列挙 | setup + scripts 6ファイル | 列挙追加 |
| C6 live driver | tests/harness + tests/e2e(新規) | 新設 |

## FR ↔ Component トレーサビリティ(requirements.md の FR 全件)

| FR | Component |
|---|---|
| FR-1 ハーネス定義・dist 生成 | C1 |
| FR-2 hook adapter | C2 |
| FR-3 配線マージ機構 | C3 |
| FR-4 コア編集3箇所 | C4 |
| FR-5 配布・CI 列挙 | C5 |
| FR-6 dogfood | C5(promote-self 機構) + C4(doctor 検査)。実機検証(FR-6b)は C6 の driver 先行使用でも確認 |
| FR-7 決定的テスト | 各 Component の検証面: C2 lib(契約テスト)・C3 マージ(単体)・C4b swarm(分岐)・C1 dist(構造 smoke/t145) |
| FR-8 ドキュメント | C1(onboarding fills) + ADR-4 の snippet 単一ソース(docs から参照) |
| FR-9 live journey | C6 |
| FR-10 セッションスキル全量 | C1(runner-gen 既定の coreDirs) |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T09:31:30Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-10 は C1〜C6 へトレースでき、移植契約と3経路(hook/導入/doctor)は整合し循環依存もない。emit:null ADR は本セッションの実行がライブ実証。検出3件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / components.md) FR-6b/FR-7/FR-8 の明示ラベルなし → 修正済み(FR↔C トレーサビリティ表を追加)
- (minor / decisions.md) ADR-5〜7 の4要素欠落 → 修正済み(Consequences・Alternatives Considered を補完)
- (minor / 4ファイル) 上流入力の本文実参照不足 → 修正済み(実消費箇所の参照行を追記し upstream-coverage 再発火 PASSED)
