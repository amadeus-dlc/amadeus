# Developer スキャン — 260710-codecov-project-gate

- intent: #734 選挙 A — 既存 Coverage Report ジョブの lcov から総カバレッジ% を自前算出し、main ベースライン比で fail-closed 判定する project ゲート(Codecov の project status 非依存)
- scope: refactor(既存 CI 経路への追加)
- observed HEAD: `98089faf175e1f39460821303d4682d8ab3cee06`
- base: none(初回 re-scan)
- 凡例: 実測 = 該当ファイル読取で確認済み / 推定 = コード外の推論

---

## 1. Coverage Report ジョブの実体

### 1.1 ジョブ構造(`.github/workflows/ci.yml`)

CI は4ジョブの DAG:

- `check`(:20-58)— typecheck・lint・dist:check・promote:self:check・`test:ci`。カバレッジは扱わない。
- `coverage`(:60-103)— `needs: [check]`。**本 intent の入力元**。
- `codecov-status`(:105-200)— `needs: [coverage]`、`if: always()`。Codecov status 待ち。
- `ci-success`(:202-225)— `needs: [check, coverage, codecov-status]`、`if: always()`。集約ゲート。

### 1.2 coverage ジョブが実行するもの(実測)

- 実行コマンド: `bun run coverage:ci`(ci.yml:82)
- `coverage:ci` の定義(`package.json`):
  `bun tests/run-tests.ts --ci --coverage --coverage-dir coverage`
- 出力先: リポジトリルートの `coverage/` ディレクトリ
  - `coverage/lcov.info`(結合済み・正規化済み LCOV)
  - `coverage/html/index.html`(人間向けサマリ)
- artifact アップロード(ci.yml:84-93): `amadeus-coverage-report` として `coverage/lcov.info` と `coverage/html` を上げる。`if: always()`、`if-no-files-found: warn`、retention 14 日。
- Codecov アップロード(ci.yml:95-103): `codecov/codecov-action`(SHA ピン)で `./coverage/lcov.info` を OIDC 送信。`fail_ci_if_error: true`、`flags: ci`、`disable_search: true`。

### 1.3 総カバレッジ% 算出に使える生データの形式(実測)

`tests/run-tests.ts` の LCOV 生成経路:

- 各テストファイルを `bun test --coverage --coverage-reporter=lcov` で個別実行し、per-file の LCOV パーツを `coverage/.parts/<safe-name>/` に出力(:753-776)。
- `combineCoverageReports()`(:641-660)がパーツを結合 → `normalizeCoverageReport()`(:503-563)で正規化 → `coverage/lcov.info` に書き出し。
- **正規化後の LCOV レコード形式**(:546-561):各ファイルにつき
  - `SF:<source>`
  - `FNF:<n>` / `FNH:<n>`(関数 found/hit、存在時のみ)
  - `DA:<line>,<count>`(行ごと)
  - `LF:<lines-found>` = その SF の `DA` 行数(:557)
  - `LH:<lines-hit>` = `count > 0` の `DA` 行数(:558)
  - `end_of_record`

**総行カバレッジ% = Σ(全 SF の LH) / Σ(全 SF の LF)**。この式は既に `writeCoverageHtml()`(:597-599, :627)で実装され、HTML に
`Total line coverage: {pct}% ({totalHits}/{totalLines})` として出力されている(実測)。

> 自前 project ゲートは、この LCOV の `LF`/`LH` を集計すれば追加計測なしに総% を得られる。ただし **総% を機械可読な形で emit する経路は現状ない**(HTML 本文にのみ埋め込み、stdout・JSON には出さない — :627 が唯一)。ゲート実装は (a) `lcov.info` を再パースするか、(b) `run-tests.ts` に総% の機械可読出力(JSON/stdout 行)を追加するか、いずれかを選ぶ必要がある。**推定: (b) の方が二重パースを避けられ、既存 `totalHits/totalLines` 変数(:597-598)をそのまま JSON 化できるため設計上素直。**

### 1.4 重要な差分注意点 — 生 LCOV の% は Codecov 報告% と一致しない(実測ベースの推定)

- `normalizeCoverageReport()` は harness 生成パスを実ソースへ再マップする(:488-501):`.claude/`・`.codex/`・`dist/*/.{claude,codex,kiro}/` → `packages/framework/core/`。よって `lcov.info` の SF は主に `packages/framework/core/…` と `tests/…` になる。
- 一方 `codecov.yml` の `ignore`(下記 §2)は Codecov 側でのみ適用され、`tests/**`・`amadeus/**`・`docs/**`・`dist/**`・`.claude/**` 等を集計から除外する。
- したがって **生 `lcov.info` から素朴に Σ LH/Σ LF した総% は、Codecov が UI で報告する project% とは異なる**(生の方は tests/ 等を含むため)。
- 本 intent は「Codecov 非依存の自前ゲート」なので、ゲートが採る母集団(何を分子分母に含めるか)を**自前で定義する設計判断**が必要。選択肢: (i) 生 LCOV 全体、(ii) `codecov.yml` の ignore 相当をゲート側でも適用して Codecov 定義に寄せる、(iii) `packages/framework/core/` 配下のみ。**推定: 一貫性のため codecov.yml の ignore と揃える(ii)が最も説明可能だが、実装コストは (i) が最小。architect の設計判断事項。**

---

## 2. codecov.yml の現状(実測、A10 反映後)

全文(`codecov.yml`):

- `fixes`(6 エントリ): `dist/claude/.claude/`・`dist/codex/.codex/`・`dist/kiro/.kiro/`・`dist/kiro-ide/.kiro/`・`.claude/`・`.codex/` をいずれも `packages/framework/core/` へリマップ。→ `run-tests.ts` の `normalizeCoverageSourcePath`(:488-501)と方針一致(ただし run-tests 側は kiro-ide の `.kiro/` 素の 5 番目相当を持たない点は非対称 — run-tests は `.claude/`・`.codex/` のみ素パスを扱う)。
- `ignore`(8 パターン): `dist/**/*`・`.claude/**/*`・`.codex/**/*`・`.kiro/**/*`・`amadeus/**/*`・`docs/**/*`・`tests/**/*`・`tmp/**/*`。
- `coverage.status.project.default`: `target: auto`、`threshold: 0.02`、`if_not_found: failure`、`informational: false`。
- `coverage.status.patch.default`: `target: 100%`、`threshold: 0%`、`if_not_found: failure`、`informational: false`。
- **`github_checks` の明示設定は存在しない**(A10=A で `annotations: false` を試した #723 は棄却済み、現状ファイルに痕跡なし — 実測)。

> project status は codecov.yml 上定義済みだが、#734 の記載どおり Codecov がこのリポジトリに `codecov/project` を emit しないため無効化状態。自前ゲートはこの `project` 定義に**依存しない**。ただし codecov.yml の `project` ブロックを残すか削除するかは architect 判断(残すと将来 emit 再開時に二重ゲートになりうる)。

---

## 3. 既存ラチェット慣行(ベースライン運用の設計材料)

### 3.1 コミット済みベースライン形式(`tests/.coverage-ratchet.json`、実測)

```
{ "note": "...", "coveredByClass": { "function":92,"audit":30,"scope":9,
  "stage":8,"hook":11,"subcommand":73,"render-surface":7 } }
```

クラス別の「covered ユニット数」を単一 JSON にコミット。カバレッジ**%ではなく件数**である点に注意。

### 3.2 ラチェット実装(`tests/gen-coverage-registry.ts`、実測)

- ベースライン path 解決: `AMADEUS_COVERAGE_RATCHET` env 上書き可、既定 `tests/.coverage-ratchet.json`(:104-105)。→ テストが temp tree でラチェットを実証できる仕組み(env で差し替え)。
- 一方向(単調)判定: `runCheck()` 内(:1242-1266)。各クラスで `now < base` なら `ok=false` とメッセージ蓄積。**「増やせるが黙って減らせない」= fail-closed の前例。**
- 更新手順: `writeAll()`(:1275-1278)が `--check` なしの通常実行で registry と ratchet を再生成。人間がレビュー付きコミットで更新(:1259-1262 のメッセージが手順を案内)。
- 実行契約: `--check` は drift・空クラス・cross-check・ratchet を検査し、失敗時 `process.exit(1)`(:1283-1290)。
- **CI での起動経路(実測・重要)**: `ci.yml` には `gen-coverage-registry --check` の直接ステップは**存在しない**。ラチェット `--check` は `tests/unit/gen-coverage-registry.test.ts` が `spawnSync` で駆動する(:152, :267, :279)。ただしこのテストは主に **temp tree** に対して実証する(実ソース・実 registry は不変更、テスト冒頭コメント :22-24 明記)。実リポの registry drift を守るテスト(`emptyClasses` を実ソースで検査 :72-73 等)は存在するが、ラチェット `now<base` 判定自体は temp tree での実証が中心。

> ベースライン運用の前例は明確に「**リポジトリ内コミット済みファイル + 単調 fail-closed + env 差し替え可能で落ちる実証**」。自前 project ゲートのベースラインも同型(リポ内ファイル)にするのが慣行整合。§6 参照。

---

## 4. #717 の park 中 diff と CI Success ゲート構造

### 4.1 #717(実測、`gh pr view/diff`)

- state: OPEN、branch `fix/683-enable-codecov-project-wait`、変更は `.github/workflows/ci.yml` の **1 行のみ**(+1/-1)。
- 変更内容: `codecov-status` ジョブ内 `requiredChecks` を `[]` → `["codecov/project"]`(ci.yml:132 相当)。PR イベント時はさらに `codecov/patch` を push(:134-136)。
- park 理由(#734): Codecov が `codecov/project` を emit しないため常に timeout→CI red。本 intent が **supersede 対象**(自前算出ゲートで置換)。

### 4.2 CI Success の集約構造(実測、ci.yml:202-225)

- `ci-success` は `needs: [check, coverage, codecov-status]`、`if: always()`。
- `require_result()` shell 関数(:213-220)が各 `needs.<job>.result` を `success` と厳格比較、非 success なら `exit 1`。集約対象は `check`・`coverage`・`codecov-status` の3ジョブ result(:222-224)。
- **自前 project ゲートを CI Success に組み込む配線の選択肢**:
  - (A) 新ジョブ(例 `coverage-project-gate`)を追加し `ci-success` の `needs` と `require_result` に足す。
  - (B) 既存 `coverage` ジョブ内に判定ステップを追加(ジョブ失敗で `coverage.result != success` → 既存 require_result が拾う)。
  - **推定: (B) が最小変更**(coverage ジョブは既に lcov を生成しており、そこにベースライン比較ステップを足せば新ジョブ・新 needs 配線不要)。ただし (A) は「project ゲート」という関心を独立 check 名で GitHub に見せられる(ブランチ保護 required check として指定しやすい)利点あり。architect 判断。

---

## 5. CI の status 待ち機構(自前ゲート配線の参考、実測)

`codecov-status` ジョブ(ci.yml:105-200)は `actions/github-script`(SHA ピン :117)で外部 status を polling する既存実装:

- `requiredChecks` を組み立て(:132-138、#717 が触る箇所)。
- `waitForCheck()`(:144-178): 最大 60 回・10 秒間隔で check-run または combined status を polling。`completed && conclusion==success` で return、失敗結論で throw、timeout で throw(:177)。
- `latestCheckRun()`(:180-195)/ `latestCommitStatus()`(:197-200): check-run API と combined-status API の両経路で status 名を探す(Codecov が check-run/status のどちらで来ても拾う設計)。
- 先頭で `COVERAGE_RESULT !== "success"` なら即 throw(:124-127)= 上流 coverage 失敗の伝播。

> **自前ゲートは外部 status を待たない**(自リポ内で lcov を算出・判定するため polling 不要)。この `codecov-status` ジョブは Codecov の `codecov/patch` を待ち続ける役割が残る(patch ゲートは #687 で稼働中と #734 記載)。自前 project ゲートは patch とは独立に追加する。**推定: `codecov-status` はそのまま(patch 待ち)残し、project は自前ジョブ/ステップで別建て。**

---

## 6. ベースライン置き場の選択肢(既存慣行との整合)

| 選択肢 | 内容 | 既存慣行との整合 | コスト |
|---|---|---|---|
| (I) リポ内ファイル | `tests/.coverage-ratchet.json` 同型でベースライン%(または LH/LF)をコミット | **高**(§3 ラチェットと同一パターン、単調 fail-closed・env 差し替え・落ちる実証まで前例あり) | 低。人間レビュー付き更新手順が既に確立 |
| (II) main artifact 参照 | main の最新 `amadeus-coverage-report` artifact を PR CI が取得し比較 | 低(artifact retention 14 日 :93、期限切れ・並行 main push でレース)。前例なし | 中〜高。GH API で artifact 取得・認証・欠損時 fail-closed 設計が必要 |

**実測: 既存慣行は明確に (I) リポ内ファイルに寄っている**(`tests/.coverage-ratchet.json` が唯一のベースライン前例、artifact をベースライン比較に使う既存機構は無い)。artifact は現状「保存のみ・比較に未使用」(ci.yml:84-93)。

**推定(強)**: 自前 project ゲートのベースラインは (I) リポ内ファイル方式が慣行整合・低コスト・fail-closed 実証容易。ラチェットと同じく「main のカバレッジ% を単調に記録し、PR で下回ったら fail、意図的低下はレビュー付きコミットで更新」という運用に自然に乗る。architect が threshold(codecov の `threshold: 0.02` 相当の許容幅)と更新ガバナンスを設計する材料になる。

---

## 7. architect への引き継ぎ(設計判断事項の要約)

1. **総% の母集団定義**: 生 LCOV 全体 / codecov.yml ignore 準拠 / core 配下限定 のいずれか(§1.4)。
2. **総% の機械可読 emit**: `run-tests.ts` に JSON/stdout 出力を足す(既存 `totalHits/totalLines` を再利用 :597-598)か、ゲート側で `lcov.info` 再パースか(§1.3)。
3. **ベースライン置き場**: リポ内ファイル(ラチェット同型)が慣行整合・推奨(§6)。
4. **CI 配線**: 独立ジョブ(A)か coverage ジョブ内ステップ(B)か(§4.2)。
5. **既存 project status の扱い**: codecov.yml の `coverage.status.project` を残すか削除するか(§2)。#717 は supersede/close(§4.1)。
6. **落ちる実証**: team.md Mandated に従い、一時的カバレッジ低下で自前ゲートが確実に red になることを実証必須。ラチェットの temp-tree 実証(§3.2、gen-coverage-registry.test.ts)が実装パターンの参考。
