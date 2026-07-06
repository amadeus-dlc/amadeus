# Code Generation Plan — implicit unit

Intent: 260704-engine-namespace（refactor scope、Minimal depth、test strategy: minimal）
対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/445
上流成果物: `../../../inception/requirements-analysis/requirements.md`（R001〜R008、N001〜N005）、`../functional-design/`（処理順序・disambiguation 規則・改名対応表）

refactor scope のため user stories は存在しない。traceability は requirements の ID へ張る。
実行順序と照合規則は functional-design の `business-logic-model.md` を正、対応表は `domain-entities.md` を正とする。

## 実装ステップ

### Step 1: RED — parity eval の拡張（R007 前半）

- [x] `dev-scripts/evals/parity/check.ts` に `nameMappings` 対応表 fixture（engine-dir、tool、hook、common-dir、shared-dir、rules-file、sub-agent の各 kind + 逆方向衝突の担保）を追加する
- [x] 現行実装で fail することを確認し、RED の証跡を記録する（`code-summary.md` 3節）

### Step 2: parity-check の一般化（R007 後半）

- [x] `parity-map.json` に `nameMappings` 配列を導入し、path 解決と内容正規化を対応表駆動へ書き換える
- [x] 既存 `subAgentNameMapping` を `kind: sub-agent` の行として吸収する
- [x] `checkRulesAidlcMd`（`checkRulesFile` へ改称）にも同じ内容正規化を通す（現行は生バイト hash 比較だった）
- [x] 照合は disambiguation 規則（tool/hook = 拡張子込み完全一致、engine-dir = `.agents/` 込み path 接頭辞、common/shared = セグメント一致、rules-file = path 一致）を実装する
- [x] fixture eval が GREEN になることを確認する（実データ投入は Step 6）

### Step 3: 改名の実行（R001〜R005）

- [x] `git mv` で tools 26 → hooks 11 → `aidlc-common/` → `knowledge/aidlc-shared/` → `rules/aidlc.md` → `.agents/aidlc/` → `.agents/amadeus/` の順に改名する（中間状態でコミットしない）

### Step 4: 参照の一括更新（R006）

- [x] 対応表トークンを disambiguation 規則に従い repo 全体で置換する（許容例外 3 箇所を除く）。engine .ts の import、skills、`.agents/rules/**`、docs（`CONTEXT.md` 含む）、`dev-scripts/**`、`package.json`、`CLAUDE.md`、`AMADEUS.md` を含む。実装中に tool 間 import の `.js` 拡張子参照を追加発見し disambiguation を拡張した（`code-summary.md` 2.1・5節）
- [x] `.claude/settings.json` は hook コマンド参照と `permissions.allow` のハードコードパスの両方を更新する。**改名直後に最優先で更新し、セッション hook が旧パスを参照する時間を最小化する**
- [x] `aidlc-state.md`、`intents.json`、audit 語彙、bare `aidlc/`、`aidlc-docs` が無傷であることを確認する

### Step 5: symlink の張り替え（R001、grilling Q1 回答）

- [x] `.claude/` 配下の symlink をリンク先 `.agents/amadeus/` へ張り替える
- [x] `.claude/aidlc-common` は symlink 名も `.claude/amadeus-common` へ改名する（`.claude/rules/aidlc.md` も同様に `.claude/rules/amadeus.md` へ改名した）
- [x] `claude-wiring:check` で整合を確認する

### Step 6: parity-map の relocations 更新と実データ投入（R001、R007）

- [x] `relocations` の `localPath` を `.agents/amadeus/...` へ更新する
- [x] `rulesAidlcMd` の解決先を `rules/amadeus.md` へ mapping する
- [x] `nameMappings` に実データ行（tools 26 + hooks 11 + engine-dir + common-dir + shared-dir + rules-file + sub-agent 吸収分、計 42 行）を投入する

### Step 7: 昇格同期（R008）

- [x] 参照更新した skill を `dev-scripts/promote-skill.ts <name> --replace` で昇格する（40 skill、`test:it:promote-skill` で drift なしを確認）

### Step 8: GREEN — 検証（N001〜N005）

- [x] `npm run parity:check` が pass（`engineFileExceptions` 空のまま）
- [x] `npm run test:all` が pass（`grilling-wiring:check`、`claude-wiring:check`、`test:it:promote-skill`、engine-e2e を含む、exit 0）
- [x] `AmadeusValidator`（workspace 全体）を実行した。レビュー対応後の最終実行では **pass**（`code-summary.md` 7.5節）。1 回目実行時点の pre-existing・対象外 2 件（本 Intent 自身の registry エントリの `repos`/`status`）は、本ラウンドまでに外部で解消された
- [x] N005 の残存 grep を実行した。`dev-scripts/data/parity-map.json`（nameMappings 定義自体）と `dev-scripts/generate-parity-baseline.ts`（上流スキーマ処理、機能上不可避）の 2 ファイルが残存し、0 件ではない。理由と判断根拠を `code-summary.md` 4.4・7.5節に記録した

### Step 9: code-summary の作成

- [x] `code-summary.md` に変更ファイル一覧、実装判断、RED→GREEN 証跡、検証結果、plan からの逸脱を記録する

### Step 10: レビュー指摘対応（Gate: Request Changes、追加スコープ）

- [x] `domain-entities.md` の追記（scopes 9 + sensors 4）に従い、`.agents/amadeus/scopes/aidlc-*.md`（9 件）・`.agents/amadeus/sensors/aidlc-*.md`（4 件）を `git mv` で改名する
- [x] `parity-map.json` に scope-file / sensor-file kind の nameMappings 行（実ファイル名 13 + プレースホルダ 2 = 15 行）を追加する
- [x] 41 ファイル（protocols 2、stages 32、tools 5、`tools/data/stage-graph.json`、`skills/amadeus/SKILL.md`）の参照を更新し、`skills/amadeus` を再昇格する
- [x] fixture 追加 → RED（一時的に scope-file/sensor-file ケースを無効化）→ GREEN（復元）を確認する
- [x] N005 grep パターンへ 13 件の旧 `.md` ファイル名 + プレースホルダを追加し、再実行する
- [x] `code-summary.md` に「7. 追記: レビュー指摘対応」節を追加する

## Traceability

| Plan Step | Requirement |
|---|---|
| Step 1〜2 | R007-parity-generalization、N001-parity-pass |
| Step 3 | R001〜R005（各 rename） |
| Step 4 | R006-reference-update、N004-out-of-scope-preserved |
| Step 5 | R001-engine-dir-rename（symlink）、grilling Q1 回答 |
| Step 6 | R001、R007（実データ） |
| Step 7 | R008-promotion-sync |
| Step 8 | N001〜N005、受け入れ条件（Issue #445） |

## テスト方針（minimal strategy）

新規テストは Step 1 の parity eval fixture に集約する（requirement-driven: 各 kind の mapping 1 fixture + 逆方向衝突の担保）。
旧名残存は N005 の grep、構造整合は既存の `claude-wiring:check` / `grilling-wiring:check` / engine-e2e が回帰検知を担う。

## リスク注記（自己改名）

本変更は実行中のエンジン自身を改名する。hook（`.claude/settings.json` 参照）が旧パスを指す時間を最小化するため、Step 3 の直後に Step 4 の settings.json 更新を最優先で行う。hook の一時的な失敗は非致命（警告）であり、Step 8 の検証で最終整合を確認する。

## Review

**Verdict: READY**

再レビュー（iteration 2）。前回指摘した非ブロッキング事項（`scopes/`・`sensors/` の 13 ファイルが改名対象表から漏れていた件）への対応を、Request Changes 後の再実装として、実リポジトリの diff・検証コマンドの再実行・監査証跡の突き合わせで検証した。

### 前回指摘への対応確認

- [解消確認] `.agents/amadeus/scopes/`・`.agents/amadeus/sensors/` 配下に旧名 `aidlc-*.md` は 0 件（`find .agents/amadeus -iname "*aidlc*"` が無結果）。13 ファイル（scopes 9 + sensors 4）すべてが `amadeus-*.md` へ改名済みで、`git diff --stat -M50% HEAD` でも全件がリネームとして検出されている（内容差分は 0〜2 行で、scope 名・sensor id 自体は無変更という設計どおり）。
- [解消確認] `domain-entities.md` に「scopes（9 件）」「sensors（4 件）」の節が追加され、正準対応表が拡張された。`parity-map.json` の `nameMappings` は 42 → 57 行（`scope-file` 10 行＋`sensor-file` 5 行の内訳で、実ファイル名 13 行＋プレースホルダ 2 行）に増え、実測で内訳一致を確認した。
- [プレースホルダ正規化の健全性確認] `stage-definition.md`・`stage-protocol.md` など byte-match 対象の engine ファイル内に埋め込まれた命名規則プレースホルダ表記（`aidlc-<name>.md`／`aidlc-<id>.md`）が `amadeus-<name>.md`／`amadeus-<id>.md` へ正しく書き換わっていることを実ファイルで確認した。`parity-check.ts` の `mappingRegex()` は scope-file/sensor-file kind に対し、tool/hook と同型の「拡張子込み（`.md`）完全一致・語境界ガード付き」正規表現を実装しており、プレースホルダトークン（`<name>`/`<id>` を含む 1 トークン）と実ファイル名トークンが互いに誤爆しない設計になっていることをコードで確認した。escape 対象に `<`/`>` は含まれないが、リテラルなプレースホルダ文字列としてそのまま扱われるため問題ない。
- [upstream parity 無drift の確認] `npm run parity:check` を独立に再実行し `parity check: ok（38 skills、197 engine files、engineFileExceptions 空）` を確認した。32 件の stage 定義を含む `amadeus-common/` 配下は byte-match 対象であり、これが pass しているということは、新規追加した 15 行の `nameMappings`（forward 適用でのリネーム後 path 解決、reverse 適用での内容正規化）が上流 baseline と矛盾なく往復できていることを意味する。stage 定義側の drift は確認されなかった。
- [検証コマンドの独立再実行] `npm run parity:check`（pass）、`npm run test:all`（exit 0、typecheck/lint/contracts/parity/claude-wiring/grilling-wiring/test:it:all 全 eval/engine-e2e/diff:check すべて pass）、`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .`（「不足または矛盾: なし」のクリーン pass）をいずれも自分の手元で再実行し、builder の報告と一致することを確認した。N005 残存 grep を、13 ファイル名＋プレースホルダ 2 トークンを追加したパターンで独立に再実行した結果も `dev-scripts/data/parity-map.json`・`dev-scripts/generate-parity-baseline.ts` の同じ 2 件のみで、新規残存は 0 件。
- [decision 追跡性確認] `audit/*.md` に `DECISION_RECORDED`（2026-07-04T15:12:51Z）があり、「reviewer 指摘（非ブロッキング）を Request Changes で採用: scopes 9 + sensors 4 の aidlc-*.md を今回の改名対象に追加する」という決定と選択肢（A: 今回改名／B: 後続 Issue／X: Other）が記録され、人間が A を選択した経緯が確認できる。直後に `domain-entities.md` が更新され、実装・検証・`code-summary.md` §7 への記録という流れが揃っている。

### 軽微な観察（非ブロッキング、今回の対応可否に影響しない）

- N005 の許容例外に関する `requirements.md` 本文（N005 の記述・grep パターン）は今回のラウンドでは更新されておらず、scopes/sensors 分の拡張は `domain-entities.md` と audit の decision log にのみ記録されている。一方、前回ラウンドの N005 例外 4・5 の追加は `requirements.md` 本文も改訂されていた。記録先が今回とスタイルがやや不揃いだが、audit の decision log で日時・決定内容・選択肢が明確に追跡できるため実害はなく、ブロッカーとはしない。
- スポットチェック中に、`amadeus-common/protocols/stage-definition.md` 内で `amadeus-graph.ts`（拡張子込み、改名済み）と `aidlc-graph compile`（拡張子なしの bare CLI 表記、未改名）が同一ファイル内で混在しているのを確認した。これは tool/hook の disambiguation 規則が意図的に bare token を対象外にしている（`aidlc-state` と `aidlc-state.md` の衝突回避のため）ことの副作用であり、既存レビューで承認済みの設計判断の範囲内。upstream 本文自体がこの bare 表記を使っており、reverse 正規化でも触れられないためparityは崩れない（実測で `parity:check` pass を確認済み）。機能・検証への影響はなく、今回の指摘対応の評価には含めない。

以上により、前回の非ブロッキング指摘は人間承認込みで適切に解消され、新たな回帰は確認されなかった。R001〜R008・N001〜N005 はすべて到達しており、developer は本成果物だけで build-and-test に進める状態にある。
