# Unit of Work — インセプション固定費バッチ(#3181 + #2415)

上流入力: `requirements.md`(FR 群と制約)、application-design の `components.md`(C1〜C7 と LOC 見積)・`component-methods.md`(seam 定義)・`services.md`(オーケストレーション)・`component-dependency.md`(依存マトリクス)・`decisions.md`(ADR-1〜3)。分解プラン承認: 梯子 AUTO_DECIDED `auto-decision-8ea0e53ca5508ffee2b9904556c24798`。

## U1: issue-evidence-upstream

- **kind**: `library`(standalone runtime を持たない再利用コード — gateway adapter / CLI verb handler / path resolver + 契約改訂)
- **対象 Issue**: [#3181](https://github.com/amadeus-dlc/amadeus/issues/3181)
- **説明**: クロスレビュー済み Issue エビデンス(本文+独立2名コメント)を record の第一級上流入力にする取り込み機構と stage 契約
- **境界(所有ファイル)**: `packages/framework/core/tools/amadeus-github-gateway.ts`(C1 追加面)、`amadeus-utility.ts`(C2 verb)、`amadeus-lib.ts`(C3 resolver)、契約 `requirements-analysis.md`(C4)・`intent-capture.md`(C6)・`reverse-engineering.md` の U1 面(consumes+Focus 導出 — C5 の frontmatter/Focus 節)、対応テスト
- **責務・提供物**: FR-EVD-1〜8 の全 AC。issue-evidence artifact 様式(component-methods.md 定義)での取得・書込・consume 配線。オーケストレーション制約は services.md の定義に従う — **fetch は conductor によるインセプション冒頭の1回実行に固定**(stage 側の暗黙再取得 choreography は導入しない — 取得時刻 provenance の一意性維持)、失敗時は可視記録+Request 自由文 fallback で続行
- **デプロイモデル**: embedded(フレームワーク本体、`bun run build` で全ハーネス dist へ投影)
- **複雑度**: M
- **規模枠**: 正味 〜250 LOC + 契約 md 〜65 行 = C4 25 + C6 15 + **C5 の U1 面シェア 〜25**(components.md の C5 見積 〜50 行を U1 面/U2 面で折半)、tests 込み総枠 〜700 LOC(components.md の較正注記 — 2.1〜2.6 倍実績を織込済み)
- **実装ノート・制約**: TDD 既定(seam = component-methods.md のシグネチャ)。gh readiness 失敗の loud fail + fallback 続行(FR-EVD-5)は error path も TDD 対象。`amadeus-utility.ts`/`amadeus-lib.ts` の行移動 → `.coverage-patch-allowlist.json` 再アンカー、テスト新設 → `.coverage-registry.json` regen 同梱。dist 再生成+隔離2回ビルド(NFR-3)

## U2: re-input-exclusion

- **kind**: `spec`(その場で消費される契約 — RE 差分入力の除外クラス宣言+検証テスト)
- **対象 Issue**: [#2415](https://github.com/amadeus-dlc/amadeus/issues/2415)
- **説明**: RE 差分リフレッシュ入力からのワークフロー排出物除外規定(ADR-2 のクラス宣言)と落ちる実証・帰属検査述語
- **境界(所有ファイル)**: 契約 `reverse-engineering.md` の U2 面(Step 2 走査対象+除外宣言+ADR-3 の新規引用禁止文 — C5)、`RE_SCAN_EXCLUDED_PATHSPECS` 定数とテスト(C7、tests/ 配下)
- **責務・提供物**: FR-EXC-1〜6 の全 AC(specs/** 非除外の実測 pin、既知非ゼロ区間での正件数、帰属検査述語、契約⇔定数の drift 検査)
- **デプロイモデル**: embedded(同上)
- **複雑度**: S
- **規模枠**: 契約 md **〜25 行(C5 の U2 面シェア — components.md の C5 見積 〜50 行の折半。U1 と同一 50 行を二重計上しない)** + 定数/述語 〜40 LOC、tests 込み総枠 〜350 LOC
- **実装ノート・制約**: 落ちる実証は不可分1セット(注入→赤実測→revert)。pathspec は使用前に既知非ゼロ区間で正件数を実測(FR-EXC-5)。U1 と同一ファイル(`reverse-engineering.md`)を触るため取込順序は delivery-planning の直列化に従う

## 効果測定の帰属(FR-MEAS)

- FR-MEAS-1(N=5・中央値35分未満の目標固定)と FR-MEAS-2(baseline 固定)は両 Unit の成果物(契約文と record)に分散して着地する — U1: baseline 47分の測定手法を issue-evidence 契約の効果測定節へ記載。U2: RE 入力縮小率の測定手順を除外宣言と同じ節へ記載。専用 Unit は立てない(実測は後続 intent)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-17T23:44:52Z
- **Iteration:** 2
- **Scope decision:** none

All 3 iteration-1 findings resolved with verifiable fixes: unit-of-work-story-map.md now carries a complete 'Unit 内実装順' section (7-step U1 / 6-step U2 FR sequencing) explicitly derived from component-dependency.md's C1/C3-parallel-then-C2 intra-unit ordering; unit-of-work.md's U1 責務 now substantively restates services.md's single-conductor-fetch/no-choreography/provenance-uniqueness/fallback orchestration constraint instead of a bare header mention; and the shared C5 contract-md line budget is now explicitly split 25/25 between U1 and U2 (with an explicit no-double-count note), summing exactly to components.md's C4+C5+C6 total of 90 lines. No new issues found on this re-read of the 3 produced artifacts.

### Findings

- None
