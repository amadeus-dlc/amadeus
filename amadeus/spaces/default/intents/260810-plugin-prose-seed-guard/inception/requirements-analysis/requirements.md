# Requirements — 260810-plugin-prose-seed-guard

上流入力(consumes 全数): `business-overview.md`(Amadeus の中核契約 = ハーネス中立な単一方法論の全ハーネス投影 — 本要件の価値根拠として参照)、`architecture.md`(rename データ源二重化と 3 消費経路・plugin 配布二経路の実測 — FR-2812 系の患部特定に使用)、`code-structure.md`(#2811 が持ち込んだテストヘルパー/ガードの配置 — FR-2/FR-4 の設置先導出に使用)。

測定 ref: 特記なき file:line は observed `c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131`(#2811 着地後の origin/main)。

## 承認系譜(approval lineage)

1. **着手承認**: ユーザーが Issue #2810 / #2812 のバグ修正 intent 開始を明示指示(2026-08-10、intent birth 時)。
2. **依存 PR**: #2811 のマージをユーザー承認 → squash `c51afbd0a` 着地(2026-08-10)。
3. **クロスレビュー**: #2810 = ESTABLISHED_WITH_REFINEMENTS / #2812 = REFRAME_REQUIRED(run `xrev-2810-20260810T080817Z` / `xrev-2812-20260810T080817Z`)。
4. **#2812 reframe のユーザー裁定**(2026-08-10): 本文へ訂正節を追記し、**`KNOWN_RULES_SUBDIR` の修正を in scope 化**、等価性テストは `transform()` へ manifest の `rulesRename` を渡す形、S3-MAJOR/P2 へ引上げ。
5. **兄弟分離**: plugin.json:61 evaluator argv クラスは #2823 として起票済み(本 intent スコープ外)。
6. **明確化質問 4 問**: autonomy=full 下の `decide-question` で裁定(questions ファイルに decision id 記録。Q1=B: 13 行 / Q2=A: t146 / Q3=B: integration 層(§12a iteration 1 BLOCKER を受けた是正裁定 — 初回 A-unit は code-structure.md:33 と自己矛盾) / Q4=A: 合成面 assert+A/B 再演)。

## Intent analysis

consumer ワークスペース(repo-root に `plugins/` を持たない導入形態)でも plugin の stage prose どおりにコマンドが解決し(#2810)、plugin 配布二経路の変換規則が黙って乖離しない(#2812)状態を作る。どちらも「dogfood リポジトリが偶然成立させる前提」が consumer で破れるクラス(#2790 と同族)であり、修正+再発ガードの両方を出荷する。

## Functional requirements

### FR-1: plugin prose の root-relative ツール参照のトークン化(#2810)

対象 13 行 — #2810 本文の 11 行(`pr-convergence.md:54,80,162,214` / `formal-model-check.md:48` / `tla-authoring.md:65,68,110,113,116` / `formal-model-check/README.md:111`)+ Q1 裁定の adjacent 2 件(`formal-model-check.md:12` / `README.md:101`)— の `plugins/<name>/…` を `{{HARNESS_DIR}}/plugins/<name>/…` 形へ改める。
AC-1a: 対象 3 ファイル+README に対する grep 述語 `(^|[^/A-Za-z0-9._-])plugins/[a-z0-9-]+/(tools|stages|specs|hooks)/`(RE 述語 P1)が `plugins/pr-convergence/stages/` / `plugins/formal-model-check/stages/` / `plugins/formal-model-check/README.md` で 0 hit。
AC-1b: 変換後の合成面(`<harnessDir>/plugins/<name>/stages/*.md`)で当該コマンド行が `<harnessDir>/plugins/<name>/tools/…` 形に解決している(FR-4 の検証で assert)。

### FR-2: 再発ドリフトガード(#2810 完了条件 3)

`tests/unit/t146-core-hygiene.test.ts` に新述語を追加し(Q2 裁定)、`plugins/` 配下の `.md` prose への root-relative `plugins/<name>/(tools|stages|specs|hooks)/` 参照の再混入を赤にする。
AC-2a: 落ちる実証 — 患部 1 行を fixture 注入して赤を実測(既存の t146 注入実証様式 `:120-137` に倣う)。
AC-2b: corpus green — FR-1 適用後の実 corpus(`STRAY_ROOTS` の `.md` 全数)で 0 findings(cid:code-generation:corpus-sweep-for-new-guards の両側実測)。

### FR-3: KNOWN_RULES_SUBDIR の 2 キー補完(#2812 reframe)

`packages/framework/core/tools/amadeus-harness.ts:59-65` の `KNOWN_RULES_SUBDIR` へ `".cursor": "amadeus-rules"` / `".opencode": "amadeus-rules"` を追加する(値は manifest 実測値 `cursor/manifest.ts:74` / `opencode/manifest.ts:76` に一致させる)。
AC-3a: `rulesSubdirFor(".cursor") === "amadeus-rules"` かつ `rulesSubdirFor(".opencode") === "amadeus-rules"` をテストで固定(現状 `rulesSubdirFor` を参照するテストは 0 件 — RE 実測 — のため新規)。
AC-3b: 既存テストは全緑を維持(RE のテストピン棚卸しで明示改訂必要 0 件を確認済み。t144 に `.cursor`/`.opencode` の pin は 0 hit)。

### FR-4: transform ⇔ seedBytesForHarness の等価性テスト(#2812 完了条件)

`tests/integration/` に(Q3 是正裁定 — manifest 実値の供給に `harness-dir-fixture.ts`(`readdirSync`/`require` の実 FS 読取)を使うため、code-structure.md:33 の既存流儀と test-size ratchet に整合する integration 層へ置く)、共有コーパスへの `transform(rel, bytes, harnessDir, rulesRename)` と `seedBytesForHarness(rel, bytes, harnessDir)` の出力**バイト一致**を assert するテストを追加する。`rulesRename` は **manifest の実値**を渡す(`rulesSubdirFor` からの導出は自己参照 = 検証劇場のため禁止 — #2812 訂正節)。
AC-4a: コーパスは prose/非 prose(`.md`/`.md.example`/`.json`/`.ts`)× トークン有無 × `<harnessDir>/rules/` パス有無 × 全 8 manifest ペア(distinct 7)を覆う。
AC-4b: 落ちる実証 — FR-3 適用**前**の実装に対して本テストが `.cursor`/`.opencode` で赤になることを実測(既存乖離がそのまま実証になるため人工注入不要 — #2812 訂正節)。

### FR-5: 修正後閉包の実測(#2810 完了条件 1 の本 intent 水準)

Q4 裁定に従い: (a) 合成面 assert — t2790 の compose E2E を拡張し、合成後 stage prose にトークン未解決残存が無く、コマンド行が `<harnessDir>/plugins/<name>/tools/…` 形であることを assert。(b) A/B 再演 — repo 外の consumer 型レイアウト(reviewer-1 と同型)で、FR-1 適用後の prose 記載どおりのコマンド(置換済み形)が CLI 本体へ到達する(旧 A 形の exit 1 Module not found が再現しない)ことを実測し、結果を record に記録する。
AC-5: (a) がテストとして常設、(b) は build-and-test 段の実測記録(exit code 付き)。

### FR-6: 関連 Issue への反映

FR-1〜5 の着地時に: #2810 / #2812 を closing keyword で閉じる PR 構成とし(cid:requirements-analysis:closing-keyword-refs — 部分対応は Refs)、`.ts` usage 文字列 3 件(`node-ci-model-check-port.ts:223` / `run-skeleton-ci.ts:19,:60`)がトークン機構の届かない同根残余であることを #2823 へ参照コメントで追記する。
AC-6: コメント投稿済み+PR 本文の closing keyword が正しい対象のみを指す。

## Non-functional requirements

- NFR-1: 既存 CI ブロッキング集合(typecheck / lint / 再現性 / source-only / graph 不変量 / run-tests --ci / coverage 両ゲート / patch gate / complexity / plugin-conformance-e2e)を全て green で維持する。
- NFR-2: TDD 既定(team.md tdd-default)— FR-2/3/4 は失敗テスト先行(Red 実測)で実装する。FR-1 は prose 変更だが FR-4/FR-5(a) の Red が先行する構成でよい。
- NFR-3: 新規テストは test-size classification に適合(FR-4 は manifest 実読ヘルパーを import するため integration。純関数のみで完結するテストを追加する場合に限り unit 可)。

## Constraints

- `{{HARNESS_DIR}}` 置換は両経路とも `.md`/`.md.example` 限定(`harness-transform.ts:28` / `amadeus-plugin.ts:671`)。この拡張子限定設計は #2790 要件 :84 で維持が固定されており、本 intent でも変更しない。
- `packages/framework/core/tools/` は `scripts/` を import できない(t258 boundary / source-only)。等価性テストは `tests/` に置くことで両者を import する(先例 88 ファイル — RE 述語 P8)。
- 正本編集は `packages/framework/core/` / `plugins/` とし、dist/self-install は `bun run build` 再生成(source-only 境界)。

## Assumptions

- `KNOWN_RULES_SUBDIR` の `.cursor`/`.opencode` 欠落は意図的方針ではなく転記漏れ(両レビュアー+RE の推論。反証となる設計記録は 0 件)。値の正は manifest とし、descriptor(`t149` 実測 `"amadeus-rules"`)とも一致する方向へ寄せる。
- rename family の残り 2 系統(`codex/emit.ts:228,:245` / `opencode/emit.ts:161`)は core ソース由来 prose の生成器で `transform()` と別面のため、本 intent では変更しない(実装時に交差が実測されたら逸脱停止 → 裁定)。

## Out of scope

- #2823(plugin.json evaluator argv / pluginManifestPath の consumer 不成立)— 分離済み。
- `.ts` 内 usage 文字列 3 件(Q1 裁定 C の否決分)— トークン機構が届かないため #2823 側の裁定へ(FR-6 で参照追記のみ)。
- 実 consumer の INSTALL.md→compose→実行 end-to-end(Q4 裁定 — #2823 が塞ぐため構造的に完結不能)。
- `rulesSubdir()` の env 分岐 `:194`・descriptor fallback `:196` の挙動変更(FR-3 の表補完はこれらを「より正しい値」へ寄せるが、経路自体の再設計はしない)。

## Open questions

- `rulesSubdir():196` fallback の到達条件(descriptor 不在ツリーの実在形態)は未計測 — 実装時に FR-3 の影響確認として観測できれば記録する(RE 仮説 2)。
- `.cursor`/`.opencode` が plugin staging の compose 対象として実運用されるか(RE 仮説 4)— FR-4 の等価性固定により、運用有無に関わらず乖離は検出可能になる。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T10:15:41Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-3・FR-5・FR-6 の記述は上流3成果物（architecture.md の #2810/#2812 患部特定、file:line、grep 述語、observed ref）と精密に一致しており、承認系譜・Q1/Q2/Q4 の裁定内容も requirements.md へ整合的に反映されている。しかし FR-4（および NFR-3）が固定するテスト配置（`tests/unit/`）は、requirements.md 自身が設置先導出に使ったと明記する code-structure.md の該当節が明示的に反対の結論（integration 層が既存流儀）を述べており、かつ test-size ratchet が実 FS 読取ヘルパーを medium(=integration) 側へ強制する旨も同じ節に記録されている。この自己矛盾は放置すると実装段でテスト配置の作り直しやゲート赤を招くため、要件段で解消してから次工程へ進めるべきである。次点として、上流入力ヘッダが実在しない `FR-GUARD`/`FR-EQ` という擬似IDを使っており（実際は `FR-2`/`FR-4`）、装飾的な参照になっている点はMINORとして是正を推奨する（本findingには含めず口頭補足）。

### Findings

- BLOCKER | amadeus/spaces/default/intents/260810-plugin-prose-seed-guard/inception/requirements-analysis/requirements-analysis-questions.md | Q3 の [Answer] 裁定（および requirements.md FR-4 / NFR-3 のテスト配置決定） | Q3 の裁定は #2812 等価性テストを `tests/unit/` に置くと決め、その根拠を「実 FS を触らない純関数比較のため fs-tests-integration-first の適用外」としているが、これは同一区間の code-structure.md が明示的に述べる結論と正反対である。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T10:25:56Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1のBLOCKER(Q3のunit配置決定がcode-structure.md:33と自己矛盾)は是正裁定で解消されている。questions.mdのQ3 [Answer]は初回裁定の失効と是正裁定(auto-decision-9785bf88b4af18bf75ae625845ea06cd)の根拠を明記し両decision idを保存。requirements.mdのFR-4/NFR-3は一貫してtests/integration/を指し、疑似ID FR-GUARD/FR-EQもFR-2/FR-4へ修正済み。fix-diff範囲外に新規矛盾なし。

### Findings

- None
