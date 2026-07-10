# Architect 合成サマリ — 260710-codecov-project-gate

- intent: #734 選挙 A — 既存 Coverage Report ジョブの lcov から総カバレッジ% を自前算出し、main ベースライン比で fail-closed 判定する project ゲート(Codecov の project status 非依存)
- scope: refactor(既存 CI カバレッジ経路への追加)
- observed HEAD: `98089faf175e1f39460821303d4682d8ab3cee06`
- base: none(本 intent 初回 re-scan、差分ベースなし)
- 手法: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(project.md cid:reverse-engineering:c3)
- 入力: `developer-scan.md`(同ディレクトリ)、per-intent ベース点 `codekb/amadeus/re-scans/260710-codecov-project-gate.md`

---

## 1. 今回の更新要約

このスキャンは **codebase の構造変化を検出したものではない**(HEAD は前回スキャン以降も配布/CI 構造が不変)。既存 codekb 本文は前 intent(bug-zero-batch、バグ6件)に焦点を当てて書かれているため、本 intent の coverage CI 面を **加算的に(surgical)** 補った。

### 更新した成果物

- `codekb/amadeus/re-scans/260710-codecov-project-gate.md` — 形式確認・最終化。stage 定義 per-intent 節が要求する `date`(2026-07-10)欄を補い、`scope` の typo(`refract` → `refactor`)を是正。base=none / observed=98089faf / focus は準拠済みを確認。
- `codekb/amadeus/reverse-engineering-timestamp.md` — 共有鮮度ポインタを今回スキャンで last-writer-wins 更新(本 intent メタデータを先頭へ、前回 bug-zero-batch メタデータは「参考・上書き前」として注記保持)。#707 の「このファイルは差分ベース点ではない」旨を先頭注記に明示。
- `codekb/amadeus/code-structure.md` — 「Coverage CI 経路」H2 を新設。ci.yml の4ジョブ DAG(coverage/codecov-status/ci-success)、run-tests.ts の総%算出箇所、ラチェット機構を file:line 付きで記述。
- `codekb/amadeus/component-inventory.md` — 「Coverage / ゲートコンポーネント」H2 を新設。ゲート配線に関わる各コンポーネントを責務・依存・本 intent 関係で表形式化。

既存のバグ6件記述(#674 等)は温存し、一切改変していない。

---

## 2. 後続ステージ(requirements / functional-design)への引き継ぎ

以下の3つが設計判断事項。**固定材料**(実測で確定済み・議論不要)と**選択肢**を分けて明示する。

### 論点 (a) 母集団定義 — 何を分子分母に含めるか

**固定材料(実測)**:
- 生 LCOV(`coverage/lcov.info`)の総% = Σ LH / Σ LF は、正規化後 SF が `packages/framework/core/…` と `tests/…` を含む(run-tests.ts :488-501, :546-561)。
- 一方 `codecov.yml` の `ignore`(8 パターン: `tests/**`・`amadeus/**`・`docs/**`・`dist/**`・`.claude/**` 等)は **Codecov 側でのみ**適用される。
- したがって **生 LCOV 素朴 Σ の総% は Codecov 報告 project% と一致しない**(生は tests/ 等を含む)。

**選択肢**:
- (i) 生 LCOV 全体をそのまま母集団 — 実装コスト最小、ただし絶対値は Codecov UI と乖離。
- (ii) `codecov.yml` の ignore 相当をゲート側でも適用し Codecov 定義に寄せる — 最も説明可能、ただし ignore の二重管理(codecov.yml とゲート)が発生。
- (iii) `packages/framework/core/` 配下のみ — 中間。

**観点(重要)**: 本ゲートは **main ベースライン比の前後比較**が本質。分子分母の定義が **PR CI と main ベースラインで同一**であれば、絶対値が Codecov と何%ズレていても「下がったか否か」の判定は正しく成立する。したがって絶対値の意味付け(Codecov 一致)は二次的で、**定義の一貫性(前後で同じ母集団)** が一次要件。この観点なら (i) が「一貫性 × 低コスト」で有力。ただし将来 Codecov project が再稼働した際に二重ゲートで値が食い違うと運用者が混乱するため、(ii) の説明可能性とのトレードオフは requirements で明示的に決めること。

### 論点 (b) 総%の取得経路

**固定材料(実測)**:
- 総% は既に run-tests.ts の `writeCoverageHtml()`(:597-599, :627)で `totalHits/totalLines` から算出され HTML に埋め込まれている。
- ただし **機械可読(stdout 行/JSON)な emit 経路は現状ゼロ**(HTML 本文のみ)。

**選択肢**:
- (b1) run-tests.ts に機械可読 emit(JSON ファイル/stdout 行)を追加 — 既算出の `totalHits/totalLines` をそのまま再利用でき、HTML と**乖離ゼロ**。単一情報源。
- (b2) ゲート側で `coverage/lcov.info` を再パースして Σ LH/LF — ツール独立(run-tests.ts に手を入れない)だが、正規化ロジックとの二重実装リスク(母集団定義がずれる余地)。

**推奨の傾き**: (b1) が乖離ゼロ・単一情報源で設計上素直。母集団定義(論点 a)を run-tests.ts の既存正規化に一致させられる利点も大きい。(b2) を採る場合は母集団定義を run-tests.ts と厳密一致させる責務がゲート側に生じる点を requirements で明記。

### 論点 (c) CI 配線

**固定材料(実測)**:
- `ci-success`(:202-225)は `require_result()`(:213-220)で `check`/`coverage`/`codecov-status` の3ジョブ result を `success` 厳格比較。
- `codecov-status`(:105-200)は Codecov 外部 status の polling 実装。**自前ゲートは自リポ内で lcov を算出・判定するため polling 不要**。

**選択肢**:
- (A) 独立ジョブ(例 `coverage-project-gate`)を新設し `ci-success` の `needs` と `require_result` に追加 — 「project ゲート」を独立 check 名で GitHub に見せられ、ブランチ保護 required check に指定しやすい。配線コストは中。
- (B) 既存 `coverage` ジョブ内に判定ステップを追加 — ジョブ失敗が `coverage.result != success` として既存 require_result に拾われる。**最小変更**(coverage ジョブは既に lcov を生成済み、新ジョブ・新 needs 配線不要)。
- (C) `codecov-status` と同型の polling は **採らない**(自前判定は外部 status を待たないため polling は不要な複雑化)。

**推奨の傾き**: 最小変更なら (B)。ただしブランチ保護で独立 required check として運用したいなら (A)。(C) の polling 型は本ゲートに不適(明示的に除外)。

---

## 3. ベースライン運用の設計テンプレート(既存 ratchet 慣行)

**このリポジトリには既にベースライン運用の確立された前例がある** — requirements/design はこれを設計テンプレートとして踏襲するのが慣行整合。

固定材料(`tests/gen-coverage-registry.ts` + `tests/.coverage-ratchet.json`、実測):
- **リポ内コミット済みファイル**方式(`tests/.coverage-ratchet.json`。artifact 参照や外部ストアではない — artifact は現状「保存のみ・比較未使用」ci.yml:84-93)。
- **単調 fail-closed**: `runCheck()`(:1242-1266)が `now < base` を検知して fail(「増やせるが黙って減らせない」)。
- **env 差し替えでの落ちる実証**: `AMADEUS_COVERAGE_RATCHET`(:104-105)で temp tree にベースラインを差し替え、`tests/unit/gen-coverage-registry.test.ts`(`spawnSync` :152/:267/:279)が実際に red を実証。
- **人間レビュー付き更新手順**: `writeAll()`(:1275-1278)が `--check` なし実行で再生成、レビュー付きコミットで更新。

自前 project ゲートのベースライン(main のカバレッジ%)も **同型**にするのが慣行整合・低コスト・fail-closed 実証容易。requirements では threshold(codecov の `threshold: 0.02` 相当の許容幅)と更新ガバナンス(誰が・いつベースラインを更新するか)を確定すること。なお ratchet は「件数」、本ゲートは「%」を扱う点だけ形式が異なる(前例の**運用構造**を借り、単位は別)。

---

## 4. その他の引き継ぎ論点(実測ベース)

- **既存 project status の扱い**: `codecov.yml` の `coverage.status.project.default`(`target: auto`, `threshold: 0.02`, `if_not_found: failure`)を残すか削除するか。Codecov が本リポに `codecov/project` を emit しないため現状無効だが、残すと将来 emit 再開時に自前ゲートと二重化する。requirements で決定。
- **#717 の supersede/close**: PR #717(`fix/683-enable-codecov-project-wait`、park 中、ci.yml 1行 `requiredChecks` を `["codecov/project"]` に)は本 intent が置換対象。close 判断を delivery で明示タスク化。
- **落ちる実証(team.md Mandated)**: 一時的カバレッジ低下で自前ゲートが確実に red になることの実証は必須。§3 の ratchet temp-tree 実証(env 差し替え)が実装パターンの直接参考。
