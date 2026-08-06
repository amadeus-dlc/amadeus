# ビルド・テストサマリー — intent 260805-semi-redefine-autonomy-f(#2253)

上流入力(consumes 全数): `code-generation-plan.md`(全 7 Unit)、`code-summary.md`(全 7 Unit)

Test Strategy: **Comprehensive**(`amadeus-state.md` の `**Test Strategy**` フィールド)。測定 ref: conductor クローン HEAD `74b70f40b`。

## 1. ビルド状況と前提

- `bun install --frozen-lockfile` → `bun run build` の順で exit 0。正本(`packages/framework/core/`、`packages/framework/harness/<name>/`)から未追跡の `dist/` とセルフインストール面を再生成し、追跡ファイルは不変。
- 前提: Bun が非対話シェルの PATH 上にあること、worktree 単位で `bun install` 済みであること。formal-model-check plugin を回す場合のみ JDK 26.0.1 の固定が追加前提。
- 詳細は `build-instructions.md`。

## 2. テスト種別インベントリ

| 種別 | 生成 | 根拠 |
|---|---|---|
| unit | ✅ `unit-test-instructions.md` | 8 ファイル(認可基体・梯子・フラグ parse/apply・policy 搬送・advisory 解決・receipt) |
| integration | ✅ `integration-test-instructions.md` | 5 ファイル(梯子 runtime 貫通・フラグ分岐・policy CLI・質問 carve-out・advisory 解決) |
| security | ✅ `security-test-instructions.md` | 7 Unit すべてが `nfr-design/security-design.md` を持ち、本 intent の主題が認可そのもの。11 の境界へ trace |
| performance | ⚠️ N/A(根拠付き) | `nfr-design/` に performance 成果物ゼロ、`performance`/`性能`/`p95`/`latency` の grep 0 hit、受け入れ基準に性能閾値なし。将来この判定を覆す 3 条件を `performance-test-instructions.md` に明記 |
| E2E / 契約 / アクセシビリティ | 生成せず | 本 intent はユーザー可視 UI を追加せず、CLI 契約面は integration の `t455-semi-policy-cli` と既存 e2e 群で覆われる |

戦略名だけを根拠に検査を機械追加しない方針に従い、performance は反証可能な不存在根拠付きで N/A とした。

## 3. Unit ごとの被覆

| Unit | unit 層 | integration 層 | security trace |
|---|---|---|---|
| semi-authorization-core | t451, t452 | t453 | 認可強度の保存 / 梯子入口の単一述語化 / grant 意味論の不侵食 |
| launch-autonomy-flag | t449, t450 | t450(branch) | 昇格・緩和経路の封鎖 / 入力検証 loud fail-closed / 値の consume |
| autonomy-statusline | t448 | — | (表示面。認可判定を持たない) |
| semi-policy-carrier | t454 | t455 | decision policy 搬送の射程 |
| stop-question-carveout | — | t456 | carve-out が human-declared semi に限定されること |
| advisory-auto-resolution | t457, t459 | t458 | 受理境界の等価強度 / fail-closed 2 分岐 / 強制実行の封鎖 |
| semi-docs-revision | — | — | docs 専任(実行時挙動なし)。docs 検査は既存の doc ガード群が担う |

## 4. 実行結果(要点)

`bash tests/run-tests.sh --ci` → **exit 0 / `RESULT: PASS`**、pass **11,494** / fail **0**、819 ファイル・11,487 テスト。本 intent が追加した 13 ファイルはすべて PASS。静的ゲート(typecheck / lint / source-only / complexity)は全て exit 0。

初回 run は 4 件赤(no-silent-drop の台帳束縛)。cherry-pick で持ち込んだ main 向け台帳が本クローンの base を束縛しないことが原因で、台帳を本クローン自身の束縛へ戻して解消。実装の欠陥ではない。全経過は `build-test-results.md` §4。

advisory(formal-model-check)は ladder の run-now 裁定に従い相関付きで実行し **NOT_DETECTED**(反例なし)。`build-test-results.md` §5。

## 5. 準備状況の評価

| 面 | 判定 | 根拠 |
|---|---|---|
| build-ready | ✅ | build / typecheck / lint / source-only / complexity すべて exit 0 |
| test-ready | ✅ | full CI `RESULT: PASS`、intent 追加 13 ファイル全 PASS |
| deployment-ready | ✅(既に着地済み) | 実装は 7 PR([#2293](https://github.com/amadeus-dlc/amadeus/pull/2293) / [#2294](https://github.com/amadeus-dlc/amadeus/pull/2294) / [#2295](https://github.com/amadeus-dlc/amadeus/pull/2295) / [#2316](https://github.com/amadeus-dlc/amadeus/pull/2316) / [#2317](https://github.com/amadeus-dlc/amadeus/pull/2317) / [#2318](https://github.com/amadeus-dlc/amadeus/pull/2318) / [#2321](https://github.com/amadeus-dlc/amadeus/pull/2321))として main へマージ済み。リリースは release.yml の workflow_dispatch が唯一の経路で、本 intent はバージョン面に触れていない |

## 6. 既知の制約・申し送り

- **#2330(OPEN, bug/P1/S2)**: advisory choice store の schema 1→2 移行経路が製品に存在せず、schema 1 の live store を持つ intent の stage report が恒久ブロックされる。本 intent では machine-local store を退避して回復した(人間裁定は audit seq 239 / 1071 に実在)。恒久修正は未着手。
- **#2354(本セッションで起票 → [#2355](https://github.com/amadeus-dlc/amadeus/pull/2355) で修正・マージ済み)**: CG approve の plan drift ガードが batch 番号のみで実績突合していたため、再ディスパッチで番号がずれた並列 run を「直列」と誤判定していた。Unit 名キーへ移し、fan-out 側・settle 側の両方をグループ単位で照合する形に是正。
- **#1953(OPEN)**: 同ガードの偽 pass 方向(replan 後の stale 実績受理)。本 intent の射程外で不変。
- conductor クローンは origin/main に対し behind。main 上の最終形の検証は PR #2355 の CI(全 check SUCCESS)を正とする。
- coverage は CI 判定を正とし、本ローカル run では計測していない。
