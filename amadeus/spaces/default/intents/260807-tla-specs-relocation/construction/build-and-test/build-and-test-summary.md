# Build and Test Summary — Intent 260807-tla-specs-relocation

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

`code-generation-plan.md` の検収基準と `code-summary.md` の実装面目録を、本ステージの検証計画(build / unit / integration / performance / security の各 instructions)へ写像し、実行結果を `build-test-results.md` に確定した。本書はその総括である。

## Verdict

**条件付き READY** — 受け入れ基準(FR-1〜9 / NFR-1〜4)に対する検証はすべて充足し、ブロッカーは残っていない。条件は次の1点の申し送りに限る。

- **申し送り(受け入れ基準の外)**: ローカルフルスイートの3件の失敗は、当ワークスペースに進行中の active intent が存在するときだけ再現する既存挙動(`lookup next-stage` が引数 scope より active intent の runtime graph を優先解決する / `runtime-graph.json` の実在が exit code を分ける)。未改変ベースへ同じ ambient 状態を与えて同型の失敗を再現し、ベース由来と立証済み(`build-test-results.md` の立証手順を参照)。本 intent のスコープ(`specs/tla` の移設と spec root resolver)外であり、修正はここでは行わない。

`cid:build-and-test:verdict-names-unverified-facets` および `cid:build-and-test:c2-unconditional-ready-boundary` に従い、未検証・未修正の面を verdict 本体に明示した。無条件 READY としなかったのは、この3件が「AC 外」ではあるものの、ローカルスイートの赤という可視の残余であり、読み手が担保面を誤解しないためである。

## Test Strategy と実行範囲

Test Strategy: **Comprehensive**。ただし `cid:build-and-test:c4`(Comprehensive でも対応する NFR が不在なら専用試験を新設しない)に従い、性能試験は新設していない — 判定根拠と既存性能面への影響確認は `performance-test-instructions.md` に記載。

| 面 | 指示書 | 実行 | 結果 |
|---|---|---|---|
| ビルド | `build-instructions.md` | `bun run build` / `source-only:check` / graph invariants | PASS(再現性検査は CI `Reproducible build` を正の判定面とする) |
| 単体 | `unit-test-instructions.md` | `bash tests/run-tests.sh --ci`(unit 層を含む) | PASS(帰属済みの既存3件を除く) |
| 結合 | `integration-test-instructions.md` | 同上(integration / e2e 層を含む) | PASS(同上) |
| 性能 | `performance-test-instructions.md` | 該当なし(NFR 不在) | N/A(根拠を指示書に明記) |
| セキュリティ | `security-test-instructions.md` | containment / legacy fail-closed / space 整合の3面 | PASS |
| 形式検証 | engine advisory | `run-model-check.ts`(相関3フラグ付き) | `NOT_DETECTED` |

## 要件充足のトレース

| 要件 | 担保面 |
|---|---|
| FR-1(移設) | `git mv` 9ファイル + 自己参照5行 + model-map path 5箇所。全域 grep の残存は正当10 hits のみ(`code-summary.md`) |
| FR-2(単一 resolver) | `resolveSpecRoots()` 新設。core / plugin / sensor / loader の全消費者が委譲。unit 16 + integration 群で green |
| FR-3(activation 配線) | watch 基底を所有ルートへ、glob `tla/**`。t320 で新パス配下の drift 発火を実測 |
| FR-4(plugin tools) | loader / module-deps / ci-domain / diagnostic / applicability / authoring / evidence を新規約へ |
| FR-5(正準パスと digest) | E-2 正準パス生成 + identity 再ピン3件。t482 が旧パス値 reject と非 default space 受理を両方向で pin |
| FR-6(legacy fail-closed) | `LegacySpecError`(移設手順入り)。t481 が legacy-only と新旧両存の両方を assert |
| FR-7(sensor) | manifest matches を固定深度形へ、基準解決を resolver 委譲。sensor CLI 実リポジトリ実行 green |
| FR-8(docs) | reference 21/22/07、guide 19、amadeus-files を英日ペアで同期 |
| FR-9(テスト) | 既存51 + support 4 を更新、新規 t481 / t482。フルスイートで回帰なし |
| NFR-1(TLC 実行契約不変) | sandbox / Docker 隔離・network deny に変更なし(`security-test-instructions.md`) |
| NFR-2(依存追加なし) | `node:fs` のみ。外部依存の追加なし |
| NFR-3 / NFR-4 | source-only 境界 clean、グラフ不変量 OK、plugin 鏡像 byte-identity(guard green) |

## 落ちる実証

`code-generation` 段で実施済みの3件を本ステージで再確認した(`code-summary.md` の Test coverage summary)。

- (a) `t481` — legacy 配置で fail-closed
- (b) `t320` — 新パス配下の spec 変更で drift advisory 発火
- (c) `t482` — 旧パス値 model-map の validator reject

## PR 収束

PR [#2419](https://github.com/amadeus-dlc/amadeus/pull/2419) は head `bb12d0a7`(= ローカル HEAD)で `MERGEABLE` / `CLEAN`、必須チェック全件 pass、レビュー糸9件すべて解決済み(`pr-convergence-report.md` = pr-convergence plugin CLI の機械生成物、`converged: true`)。マージ承認は人間の判断事項であり、本ステージでは実行しない。
