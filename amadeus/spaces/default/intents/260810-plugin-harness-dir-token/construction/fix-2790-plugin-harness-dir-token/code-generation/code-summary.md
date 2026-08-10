# コード生成サマリ — fix-2790-plugin-harness-dir-token

Intent: `260810-plugin-harness-dir-token` / Scope: `self-fix` / Depth: **Minimal** / Test strategy: Comprehensive
入力の由来: `units-generation` / `application-design` はスコープ SKIP により不在（`consumes_absent` の `expected: true`）。
requirements.md（FR-1〜FR-9）と codekb（N-1〜N-9）から scope した。不在成果物の内容は創作していない。

## 変更ファイル

**ソース**

- `plugins/pr-convergence/stages/pr-convergence.md` — 患部 1 行を `{{HARNESS_DIR}}/tools/amadeus-sensor.ts` へ（FR-1）
- `scripts/plugin-projection.ts` — `projectInTemporaryWorkspace` の verbatim `cpSync` を新設 `seedPluginsTransformed()` へ（FR-2）
- `packages/framework/core/tools/amadeus-plugin.ts` — `stagingHarnessDirOf()` / `seedBytesForHarness()` を新設、`copyRealFiles` に `harnessDir` 引数追加、`stagingEntryState` を同一変換越しの比較へ（FR-3）
- `packages/framework/core/tools/amadeus-harness.ts` — 既存の非公開 `KNOWN_RULES_SUBDIR` を `rulesSubdirFor(dir)` として export

**テスト**

- 新規 `tests/helpers/harness-dir-fixture.ts` — `harnessDir` を manifest から読む唯一の入口（ハーネス名のハードコード禁止の実装）
- 新規 `tests/integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts` — 4 テスト（FR-3）
- `tests/unit/t146-core-hygiene.test.ts` — 2 → 4 テスト（FR-6 / FR-7 / FR-8）
- `tests/integration/t416-self-install-plugin-projection.integration.test.ts` — 1 テスト追加（FR-2）
- `tests/integration/t-plugin-projection-packaging.test.ts` — 1 テスト追加（FR-4）

生成物（`dist/`、self-install 5 面）は git 追跡外。コミット対象に含めない。

## 主要な実装判断

- 置換点は **seeding の 2 箇所**に置いた。compose 本体は byte-faithful なコピー機のまま（Q1-A の裁定どおり。N-7 の staleness digest 問題に触れない）
- core 側（`seedBytesForHarness`）とパッケージャ側（`transform()`）は**意図的な二実装**。`amadeus-plugin.ts` は dist へ出荷されるため `scripts/` を import できない（t442 の import closure 制約）。両者が同じ 2 規則（トークン置換 + rules rename）を適用することはテストで固定
- `stagingEntryState` を同一変換越しの比較に変更したのは**必須の付随修正**。入れないと staged（変換済み）と src（中立）が永久に `different` になり、毎回再シード + drop 時の staging 残留という 2 つの退行が出る

## 受け入れ判定（すべて実測）

| FR | 判定 | 主要な証跡 |
|---|---|---|
| FR-1 | PASS | `.claude/tools` = 0 件（exit 1）、`{{HARNESS_DIR}}/tools/amadeus-sensor.ts` = 1 件 |
| FR-2 | PASS | self-install 5 面すべてで (i)=1 / (ii)=0 / (iii)=none |
| FR-3 | PASS | dogfood codex 1 面 + claude 面の冪等性。実証面数は **codex 1 面**に固定（Review FOLLOW-UP への回答） |
| FR-4 | PASS | consumer 導入バンドル 8 面すべてで (i)=1 / (ii)=0 / (iii)=none。`kiro` / `kiro-ide` はともに `.kiro` |
| FR-5 | PASS | FR-2 / FR-4 の両面で修正前の赤を実測（下記） |
| FR-6 | PASS | 患部を戻すと赤（報告は患部 1 件のみ = 偽陽性 0）、復元で緑 |
| FR-7 | PASS | 新規 4 dir それぞれで実コーパス挿入により赤を実測（4/4）。既存 corpus 緑、carve-out 2 件維持 |
| FR-8 | PASS | 下限テストは `walkMd(CORE)` のみ走査。core 78 件（> 50）/ plugins 1 件 |
| FR-9 | PASS | [Issue #2810](https://github.com/amadeus-dlc/amadeus/issues/2810) を起票（人間の確認を経て conductor が実施）。判定が DEDUCED である旨と実測での確定を完了条件 1 に明記。#2790 / #2799 / intent record と相互リンク |

## failing-first の断面（FR-5）

修正前の赤が、欠陥を段階的に単離した記録として重要。

1. **Step 3（consumer 8 面）修正前 = RED**。事前の見立て「経路A は置換器を持つので緑だろう」は**外れ**だった。経路A は確かに `transform()` を呼ぶが、修正前のソースにトークンが 0 件（`grep -rn "HARNESS_DIR" plugins/` = 0、exit 1）で置換すべきものが無く、`.claude/tools/…` がそのまま 8 面へ配られていた。N-1 の直接的な実証
2. **Step 4（トークン化）後**、consumer 8 面は**緑になった** — 経路A は Step 4 単独で解決
3. しかし self-install 5 面は**依然 RED、かつ失敗面が `codex` から `claude` へ移動**。トークン化により全 5 面が生の `{{HARNESS_DIR}}` を受け取り、Claude を含む全面が落ちた。要件が主張した「片方だけ直すと退行する」の直接実証
4. **Step 5（seeding 修正）後** に緑

## staging 側 5 件（判定対象外・記録のみ）

要件「前提」節の約束どおり記録する。5 件とも `own-sensor-path=1 / raw-token=0 / foreign=none` で**置換済み**になった。
変換点を seeding に置いた以上、staging（seeding の着地点）が変換後になるため。
N-4 が実測した漏洩 10 ファイル（composed 5 + staging 5）は全 10 件が解消。

## 非退行

- 経路A ピン 7 ファイル: 57 pass / 0 fail
- 経路B ピン（t416 系）6 ファイル: 28 pass / 0 fail
- plugin 関連 unit + integration 全 43 ファイル: 382 pass / 0 fail
- plugin e2e serial 2 ファイル: 11 pass / 0 fail
- `bun run typecheck` exit 0 / `bun run lint` exit 0（警告はすべて既存。`projectInTemporaryWorkspace` の complexity 18 は HEAD 断面でも 18 で増分 0）/ `bun run build` exit 0
- **全スイート `bun run test:ci`（conductor 実行）— 最終結果: 933 ファイル PASS / 0 FAIL / `RESULT: PASS` / exit 0**

### 全スイートで発見し修正した 2 件（developer agent の実行範囲外）

1. **`tests/integration/t-coverage-mechanism-ratchet.test.ts`** — 新規 integration テストが CLI を spawn するため、`EXPECTED_NONE_TO_CLI` への登録が必要だった。
   `"integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts"` を追加。
   これは honesty ratchet の設計どおりの挙動（新しい spawner は人手の編集なしには着地できない）
2. **`packages/framework/core/tools/amadeus-plugin.ts` のコメント** — 追加したコメントが
   `scripts/harness-transform.ts` を名指ししており、`t258-boundary-guard` が正しく拒否した。
   出荷される core がホストに存在しない `scripts/` を指してはならないため。
   「its own prose transform」と書き換えて解消（コード挙動の変更なし）

### 失敗の切り分け（1 回目の全スイートで 10 ファイル FAIL）

| 分類 | ファイル | 判定根拠 |
|---|---|---|
| 本変更起因（修正済み） | `t-coverage-mechanism-ratchet`, `t258-boundary-guard` | 決定的に再現。上記のとおり修正し緑 |
| 負荷起因（前景の個別実行が並走していた） | `t222-migration-routing`, `t227-codex-migration-walking-skeleton`, `t222-metrics-publication`, `t225-upstream-v2-migration-preflight`, `t231-harness-hook-correctness`, `t416-self-install-plugin-projection`, `t435-intent-autonomy-production` | いずれもタイムアウト。静かな状態での単独実行および最終全スイートで緑 |
| 既存（本変更と無関係） | `t224-upstream-v2-migration-cli` | ソース変更を stash して HEAD 断面で再ビルドしても同一の 1 件が失敗（symlink clone-id の lock path、5s タイムアウト）。最終全スイートでは緑 |

**訂正の記録**: 切り分けの初期段階で「`t227` は HEAD で緑・本変更で赤ゆえ実際の退行」と判断したが、これは**誤り**だった。
その「分離実行」の裏で全スイートがまだ走っており、負荷でタイムアウトしていた。静かな状態では本変更を適用したまま緑になる。

## 計画からの逸脱

1. Step 2 のテストを fixture plugin でなく実コーパスで書いた — `buildSelfInstallProjection` が `dist/<name>` と `amadeus/config.json` の実在に依存し、fixture では投影経路の模倣（実装の写し）になるため。実コーパスなら受け入れ条件と述語が文字通り同一になる
2. Step 1 と Step 9 が単一の構造変更になった — t146 の 2 テストは元々どちらも `walkMd(CORE)` を呼んでおり、stray テストにだけ `plugins/` を足す行為が walk scope 分離そのものだった。両者の受け入れは個別に測定済み
3. `stagingEntryState` の変更（計画に明記なし）— 上記「主要な実装判断」の必須付随修正
4. FR-7 の陽性判定を、要求された 4 件の一時挿入に加えて恒久テストとしても残した — 一時挿入は測定後に消え、将来 dir が増えたときに再発するため
5. core 側の変換が `harness-transform.ts` の再利用でなく二実装になった — import closure 制約（上記）

## 未充足・留保

- FR-9 は [#2810](https://github.com/amadeus-dlc/amadeus/issues/2810) 起票により充足。PR 本文からの相互リンクは PR 作成時に付与する
- 兄弟 11 行の判定は **DEDUCED のまま**（実 consumer ワークスペースでの実行実測なし）。Issue 本文の完了条件 1 に送った
- `.pi` / `.kiro` / `.kiro-ide` の self-install 面は存在しない（`SELF_INSTALL_HARNESSES` は closed five）ため、これらは consumer 導入バンドル 8 面の実測のみが証跡
