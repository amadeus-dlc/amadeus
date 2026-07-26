# Business Logic Model — U2 visualize-hardening

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## U2 が U1 のフローへ加える増分(unit-of-work.md U2 = V-5 / V-7 / --check / C-1 / D-1)

U1 の処理フロー(construction/visualize-skeleton/functional-design/business-logic-model.md の8ステップ)を前提に、以下を追加する。component-methods.md のシグネチャに従う。

## 増分1: `--check` モード(FR-1 / AC-5)

- parseArgs の受理集合へ `--check` を追加(`ArgsOutcome` の mode が `"write" | "check"` へ拡張 — U1 domain-entities の予約どおり)
- フロー: U1 の 1〜6(読込〜描画)は共通 → 生成バイト列と既存 `metrics/index.html` を比較
  - 一致 → exit 0
  - 不一致 → 差分要約(バイト数)を stderr、exit 1
  - 既存ファイル不在 → その旨を stderr、exit 1
- 比較が成立する前提 = U1 で確立済みの renderHtml 決定性(U1 business-rules ルール11)

## 増分2: 劣化強調(V-5、FR-4 S2 / AC-2)

- renderCollectorSection 内で、各キーの最新値 vs 直前値を `regressionClass(collector, key, prev, curr)` で判定し、悪化時はチャート最新点と値表最新セルへ `class="regressed"` を付与
- 判定表(requirements.md FR-4 S2 の列挙、component-methods.md の固定契約): over_threshold↑ / max↑(ccn)、percent↓(coverage)、failedFiles≠0 / failedAssertions≠0(tests)、bytes↑(dist_size)。他は常に非強調
- 比較は numericValue 通過後のみ(どちらか null → 非強調)。スナップショットが1件のみ(prev 不在)→ 非強調(failedFiles≠0 系のみ prev 不問で判定)

## 増分3: サイズガード(V-7、FR-6 / AC-4 残)

- `MAX_HTML_BYTES = 16_384 * METRICS_RETENTION_KEEP_LAST * 2`(retention import+ローカルミラー — ADR-3)
- `--write` / `--check` 共通で、生成バイト列が超過 → stderr に実測値と上限、**書き込みゼロで exit 1**
- ミラー定数のピン: unit テストが `serializeSnapshot`(metrics-snapshot.ts export 済み)を 16_384 超入力で実駆動し throw を assert

## 増分4: CI 同乗(C-1、FR-5 / AC-6)

- ci.yml metrics-snapshot job: retention `--apply`(:449)の直後・commit(:457-462)の前に `- name: Render metrics dashboard` / `run: bun scripts/metrics-visualize.ts --write` を挿入
- 完了条件に「マージ後の main push run で job green+bot PR に index.html 同乗」の実測を含む(delivery-planning の未実測明示の閉包)

## 増分5: docs(D-1、FR-8 / AC-8)

- `docs/guide/` 配下に metrics サブシステム 1ページ(日英ペア)。可視化(--write/--check・CI 自動更新・見方)を主、既存3スクリプトは導線程度
