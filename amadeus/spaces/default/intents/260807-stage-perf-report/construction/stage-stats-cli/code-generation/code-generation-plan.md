# Code Generation Plan — stage-stats-cli(Bolt 1、walking-skeleton ゲート付き)

上流入力(consumes 全数): requirements(FR-1〜FR-7 / NFR-1〜5 の AC を完了条件として消費)、business-logic-model(A1〜A9 を実装仕様として消費)、business-rules(BR-1〜BR-14 を不変条件として消費)、domain-entities(型定義・母集団恒等を実装契約として消費)、performance-design(単一パス走査・cache 不採用・60 秒回帰上限を実装方針として消費)、security-design(read-only 構造保証・信頼境界外入力のバケット集約・集計値限定出力を実装制約として消費)、unit-of-work(U1 stage-stats-cli の境界・実装ノート・複雑度 M を Bolt スコープとして消費)、decisions(ADR-1〜6 を実装裁定として消費)

## 実装ステップ(受け入れ基準の述語は requirements.md から逐語で写す — 縮小しない)

1. **土台**: `packages/framework/core/tools/amadeus-stage-stats.ts` 新設(ADR-1/ADR-3)。依存は `node:fs`(read)/`node:path`/`amadeus-journal.ts` のみ(ADR-2)。`export function main(argv: readonly string[]): number` + `import.meta.main` ガード(NFR-3)
2. **TDD で vertical slice を反復**(tdd-default-with-narrow-exceptions — 合意済み公開 seam へ失敗テスト 1 件 → Red 実測 → 最小実装で Green): 純関数(窓構成・idle 減算・統計・review パース・レンダリング)は `tests/unit/t481-stage-stats.test.ts`、実 FS+CLI spawn は `tests/integration/t482-stage-stats.integration.test.ts`(NFR-2 twin、独立オラクル — 自己参照比較の禁止)
3. **FR-1 AC**: 混在スキーマ+破損行入り fixture corpus で (i) 両世代の行が集計に載る (ii) 破損行数が出力に現れる (iii) `intentId:"intents"` の行がパス由来 intent へ帰属される (iv) 読取不能シャードを 1 件注入した実行が exit 1 を返す — 独立オラクルで検証
4. **FR-2 AC**: (i) idle 3 種いずれかを跨ぐ fixture 窓で net < raw が成立 (ii) 重複 idle 区間で二重減算されない (iii) 未クローズ AWAITING を持つ fixture 窓が net 統計に入らず件数報告される (iv) idle が窓末尾に接するケースで負値が出ない (v) 0 秒窓の件数が出力に現れる (vi) 統計母集団の恒等が出力上で検証できる — 恒等は FD の層別定義(恒等 W: 構成済み窓数 = net 統計母集団数 + unclosedIdle + zeroSecond)に従い、zeroSecond/unclosedIdle の判定は排他化(両条件同時成立 fixture を含める — FD/ND FOLLOW-UP の閉包)
5. **FR-3 AC**: 正常見出し・接尾辞付き見出し・`{unit-name}` パスを含む fixture record で、正常分の iteration 分布+unparseable 件数+リテラルバケットが出力に現れる(2 段マッチは amadeus-reviewer-runtime.ts:660 の実在を実装時に再検証)
6. **FR-4 AC**: fixture で `Stage slug` と `Stage` が異なる値を持つ行を混在させ、センサー集計が前者のみで束ねられることを検証
7. **FR-5 AC**: Model 有り(複数値)・無しの混在 fixture で、モデル別内訳と UNKNOWN 件数の和が全数と一致
8. **FR-6 AC**: (i) 同一 fixture に対する 2 回実行の出力が byte 一致 (ii) 出力先頭にシャード数・行数・除外件数が実在する (iii) FR-6c の仮説明記文言が出力に実在する — Markdown/CSV/`--json`(ADR-4)の 3 形
9. **FR-7 AC**: (i) 対象ソースへの fs write API import が 0 件であることを検査する自動テストが存在し green (ii) 正常コーパス / 読取不能シャード入りコーパス / 未知フラグ の 3 入力に対する exit code がそれぞれ 0 / 1 / 2 であることを実測 assert
10. **NFR-5 落ちる実証**: 除外バケット報告・fail-loud exit へ失敗ケースを注入して赤の実働を確認(注入は「テストが実際に読む面」の実行時消費行へ — injection-surface-verify / inject-runtime-consumed-lines)
11. **検証一式**: `bun run typecheck` / `bun run lint` / 対象テスト(t481+t482)+既存 t460/t461 green 維持(C-2)。coverage seam は純関数 export + in-process main 駆動で確保(NFR-3)。出荷コメント・文字列に `scripts/` トークンなし(NFR-4)
12. **性能**: t482 で実コーパス相当規模の回帰上限(60 秒 — NFR-1)を assert

## 検証水準の開示(swarm referee 非使用)

本セッションはハーネスの worktree 隔離ガード下にあり、cid:code-generation:c1-pcp-isolated-session-swarm-incompat の実効経路に従う: builder は Agent の worktree isolation で実装し、conductor が fidelity diff 空の機械確認付きで取込み、検証コマンドを conductor ツリーで再実行する。swarm referee(check/finalize)の converged 表記は用いない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-08T03:16:11Z
- **Iteration:** 1
- **Scope decision:** none

plan/FD/ND の相互整合・AC 述語の忠実な転記・NFR-5 落ちる実証・swarm referee 非使用の開示は問題なし。ただしレビュー対応で追加した invalid-timestamp バケットが BR-4 の 7 フィールド閉集合契約と衝突したまま、上流 FD/ND への改訂も申告付き逸脱への追記もされていない点が未解決の BLOCKER。

### Findings

- BLOCKER | business-rules.md:10; domain-entities.md:17-32; code-summary.md:62,65 — invalid-timestamp バケット追加により windowing が 5 バケット(計 8 フィールド)になったが、BR-4 は 7 フィールド閉集合、domain-entities の型定義と全 7 バケット報告義務も 7 のままで record 内自己矛盾。cid:code-generation:cg-invariant-conflict-explicit-revision が要求する明示的改訂を経ておらず、申告付き逸脱にも未記載 — FD/ND 該当節の改訂または追加裁定の記録が必要。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-08T03:30:32Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(invalidTimestamp 追加が BR-4 の 7 フィールド閉集合と衝突したまま無申告)は解消。3 成果物が正本を domain-entities へ一意化して一致し、code-summary の申告付き逸脱 5 が明示改訂の要求を満たす。恒等 W の参加集合は不変で requirements FR-2c / FR-2 AC vi とも齟齬なし。

### Findings

- None
