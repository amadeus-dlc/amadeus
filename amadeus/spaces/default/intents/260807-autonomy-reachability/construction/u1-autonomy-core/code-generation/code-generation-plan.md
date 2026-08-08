# Code Generation Plan — u1-autonomy-core

上流入力(consumes 全数): functional-design/domain-entities.md(AutonomyRefusalEvent / StateAutonomyFields / PreviewNonAutoKinds)、functional-design/business-logic-model.md(フロー1〜4・エラー分類)、functional-design/business-rules.md(BR-U1-1〜8)、nfr-design/reliability-design.md(失敗様式4点)、nfr-design/logical-components.md(論理構成・テスト層配置)、nfr-design/security-design.md(認可境界の不変)。補助参照: inception/requirements-analysis/requirements.md(FR-2a〜2d)、codekb/amadeus/re-scans/260807-autonomy-reachability.md(findings 2/3/5/6/12)。

測定 ref: worktree `worktree-intent-2378-autonomy-reachability` の HEAD `9ed09fec2`(fork 基点)。file:line は同 ref の実測。

## 受け入れ基準(requirements.md からの逐語転記 — 述語を縮小しない)

> - FR-2a: `authorizeInteraction` の拒否理由(`SCOPE_OUT` / `MODE_REQUIRES_HUMAN` の2値 — `AUTHORITY_BOUNDARY` は存在しない、finding 3)を、`autoApprove === false` の経路で audit イベントとして emit する。seam: `amadeus-intent-autonomy-production.ts:227-231`(現状 `authorizationReason` は production 消費点ゼロ — finding 2)。イベントは新設1種とし、occurrence の kind / stage / reason を属性に含める。**受け入れ基準**: (i) semi 有効下で phase-gate occurrence を発生させると新設イベントが reason=`MODE_REQUIRES_HUMAN` で audit shard に1行出現する(integration テストで audit 行を直読 assert) (ii) mode 未設定 intent の stage-gate で reason=`SCOPE_OUT` 相当の human-required 経路が同様に記録される (iii) 認可判定の戻り値は変更前後で不変(観測のみの実証)
> - FR-2b: `preview-autonomy` の出力に「この mode/grant で自動裁定されない対話種別」を列挙する。実効は semi 側(`SEMI_ROUTINE_INTERACTIONS` が phase-gate / walking-skeleton を除外)。full は `ALL_INTERACTIONS` のため「なし」と表示。**受け入れ基準**: semi の preview 出力に `phase-gate` / `walking-skeleton` の2種が「人間裁定」として列挙され、full の preview では非裁定種別が空であることを CLI 出力の逐語 assert で固定
> - FR-2c: state 3フィールド(`Intent Autonomy Mode` / `Intent Grant` / `Construction Autonomy Mode`)の書込を `applyProductionAutonomyMode` 側へ canonical 化し、`amadeus-bolt.ts:1075-1081` はその呼出しへ縮約する(finding 5)。受け入れ基準: C13 経由宣言後に (i) state 実読で mode 反映 (ii) `amadeus-stop.ts:196-198` の question carve-out が semi で開く (iii) statusline セグメント表示 — の3点を実測(finding 6 の解消)
> - FR-2d: 読み手6系統(`amadeus-lib.ts:4942` / `amadeus-orchestrate.ts:1894-1899` / `amadeus-stop.ts:150,160,196-198` / `amadeus-log.ts:180`)を消費側棚卸しとしてテストで固定する

NFR-1(安全性): すべての変更で fail-closed 原則を維持する。FR-2a の可視化は認可判定を変えない(観測のみ)。
NFR-2(互換): 後方互換レイヤー・移行シム・二重実装を追加しない。

## 予約したテスト番号

既存最大は `t480`(`tests/integration/t480-declare-units-done.integration.test.ts` / `tests/unit/t480-degrade-unit-declaration.test.ts`)。`t481`〜`t483` が未使用であることを `ls tests/unit tests/integration | grep -cE "^t4(8[1-9])"` = 0 で実測し予約する。

- `t481` — FR-2c/FR-2d: canonical 書込と6読み手の一貫性(integration、実 FS)
- `t482` — FR-2a: refusal イベントの audit 行直読+対照テスト(integration、実 FS)
- `t483` — FR-2b: `nonAutoDecidedKinds` の集合差導出(unit、純関数)

## 実装ステップ(TDD — 各 slice で Red を実測してから最小 Green)

### Step 1 — FR-2b: `nonAutoDecidedKinds`(最小の垂直スライス)

1. `t483`(unit)に失敗テストを1件追加: 純関数 `nonAutoDecidedKinds(mode)` が semi で `["phase-gate","walking-skeleton"]`、full で `[]`、none で4値全部を返す。Red を実測(関数未実在)。
2. `amadeus-intent-autonomy-production.ts` に `nonAutoDecidedKinds` を **集合差で導出**して export(BR-U1-7 — リテラル複製禁止)。auto 裁定集合は mode 依存: `full` = `ALL_INTERACTIONS`、`semi` = `SEMI_ROUTINE_INTERACTIONS`(`amadeus-intent-autonomy.ts:581`)、`none` = 空。Green。
3. `previewProductionAutonomyGrant`(`:338-361`)の戻り `preview` に `nonAutoDecidedKinds` を追加。`t483` に CLI 出力形(`JSON.stringify(preview)`)の逐語 assert を追加 — CLI は `handlePreviewAutonomy`(`amadeus-bolt.ts:896-906`)が preview を JSON 1行で出すため、既存様式のままフィールド追加で出力に現れる。

**注記(FD 準拠の確認)**: 委譲ブリーフの一行要約「`ALL_INTERACTIONS − allowedInteractionKinds`」を `grantScope().allowedInteractionKinds` へ字面適用すると、同値は常に `ALL_INTERACTIONS`(`:284`)のため全 mode で `[]` となり FR-2b の受け入れ基準(semi で2種列挙)を構造的に満たせない。正本は domain-entities.md:35「semi = `["phase-gate","walking-skeleton"]`(= `ALL_INTERACTIONS − SEMI_ROUTINE_INTERACTIONS` の導出値)、full = `[]`」であり、本ステップはそちらに従う。

### Step 2 — FR-2a: refusal イベントの新設と登録同期

1. `t482`(integration)に失敗テストを1件: semi 有効下の phase-gate occurrence で audit shard に `INTENT_AUTONOMY_HUMAN_REQUIRED` が reason=`MODE_REQUIRES_HUMAN` で1行出現。Red を実測。
2. イベント登録を**同一変更で**同期(BR-U1-8 / NFR-4):
   - `amadeus-audit.ts` の `VALID_EVENT_TYPES`(`:95` 近傍)と `EVENT_HEADINGS`(`:241` 近傍)
   - `otel/event-registry.ts` の `REGISTERED_EVENTS`(`:218-226` 近傍)、durability=canonical、requiredAttributes = Interaction Kind / Stage slug / Reason / Mode
   - `otel/event-registry.ts` の `EXPECTED_CANONICAL_COUNT` を 90 → 91、`tests/integration/event-registry-drift.test.ts` の cardinality pin(`:50-55`)も同数へ
   - `packages/framework/core/knowledge/amadeus-shared/audit-format.md`(`:280` 近傍の表)
   - `docs/reference/12-state-machine.md`(`:484` 近傍)と対訳 `docs/reference/12-state-machine.ja.md`(`:423` 近傍)— `t48-audit-event-emitters.test.ts` が md-md 一致を検査するため両方を同一変更で
3. `productionStageAutonomy`(`:212-231`)の `autoApprove === false` 分岐に私有 `emitAuthorizationRefusal` を追加。属性は Interaction Kind / Stage slug / Reason / Mode。**reason は2値のみ**(BR-U1-4)— `authorizeInteraction` 由来の `SCOPE_OUT` / `MODE_REQUIRES_HUMAN` 以外(`projection === null` 早期 return の `"intent-autonomy-unavailable"`、`qualityRepair === "error"` 由来の非認可)では emit しない。
4. **fail-open**(BR-U1-6): emit は `emitAuditEvent`(`otel/audit-emit.ts:48`、非 guarded)を try/catch で包み、例外も `appended === false` も stderr 警告のみ。`emitAuditEventGuarded` は使わない(throw して認可経路を巻き込むため)。
5. **BR-U1-5 対照テスト**: `productionStageAutonomy` の戻り値(`mode` / `autoApprove` / `grantId` / `authorizationReason` / `qualityRepair`)が emit の成否にかかわらず同一であることを assert。emit 失敗注入下でも同一であることを含める。

### Step 3 — FR-2c: canonical 書込への集約

1. `t481`(integration)に失敗テストを1件: `applyProductionAutonomyMode` を単体で呼ぶと(bolt verb を経由せず)state の3フィールドが書かれる。Red を実測(現状は書かれない — finding 5)。
2. `applyProductionAutonomyMode`(`:434-471`)に state 書込を内部化。**audit 先行・state 追従**(BR-U1-2): `coordinator.applyHumanCommand` 成功後にのみ書く。書込値は既存 verb 契約と逐語同一 — `Intent Autonomy Mode` = mode、`Intent Grant` = `applied.projection.currentGrant?.grantId ?? "none"`、`Construction Autonomy Mode` = full なら `autonomous`、それ以外 `gated`。`setOrInsertField` / `setFieldStrict` / `writeStateFile`(`amadeus-lib.ts:5183` / `:5168` / `:4890`)を使う。
3. **冪等収束**(BR-U1-3): audit 成立済み+state 未反映での再実行は transaction を重複発行せず state のみ書く。判定は `before.mode === input.mode` かつ `before.modeProvenance.kind === "human-command"` かつ `before.modeProvenance.commandOccurrenceId === commandOccurrenceId` の一致。
4. **state 書込失敗は loud error**(reliability-design 表の3行目): audit 成立後の書込失敗は `{ ok: false, error }` で報告し、再実行で収束することをテストで固定。
5. `handleSetAutonomy`(`amadeus-bolt.ts:1062-1090`)から書込4行(`setOrInsertField` ×2 / `setFieldStrict` / `writeStateFile`)を削除し canonical 呼出しへ縮約。**verb 契約不変** — stdout の JSON(`emitted` / `mode` / `grant_id` / `state_updated`)は逐語同一を保つ。
6. C13 経路(`amadeus-orchestrate.ts:1272` の `applyMode`)は呼出しのまま — 内部化により同経路も自動的に是正される(finding 6 の解消)。

### Step 4 — FR-2d: 6読み手の一貫性(+7点目)

`t481` に integration テストを1本追加し、canonical 適用後に**関数直呼び**で直列 assert する(component-dependency.md FR-2d 表が正本):

1. state 実読で3フィールド反映
2. `isQuestionCarveoutIntent`(`hooks/amadeus-stop.ts:192-203`)が semi で `true`
3. `autonomySegment`(`tools/amadeus-lib.ts:4941`)が非空
4. `readAutonomyMode`(`tools/amadeus-orchestrate.ts:1894-1902`)が反映
5. `stopContinuationDefaultCap`(`hooks/amadeus-stop.ts:150-155`)= 8
6. `stopBudgetMode`(`hooks/amadeus-stop.ts:160-163`)が非 interactive
7. `isAutonomousMode`(`tools/amadeus-lib.ts:4955`)の一貫

`readAutonomyMode` は現状 module 私有(`function readAutonomyMode`)のため、関数直呼びのために export する(seam export のみ。判定ロジックは不変)。本番コードに test 専用分岐は置かない(logical-components.md「検証専用 — 本番コードに test seam 分岐を置かない」)。

### Step 5 — 失敗注入(reliability-design 表の4点)

| 失敗点 | 注入 | 期待 |
|---|---|---|
| audit commit 前の検証失敗 | provenance 不成立(HUMAN_TURN 不在) | fail-closed・state 未書込・呼出し前バイトのまま |
| audit commit 失敗 | repository commit 失敗 | fail-closed・state 未書込・再実行で新規 commit |
| audit 成立後の state 書込失敗 | state パスを dangling symlink(不在ターゲット)にして書込失敗を誘発 | loud error → 再実行が transaction を重複発行せず state のみ書いて収束 |
| refusal emit 失敗 | emit 経路の失敗注入 | fail-open 警告のみ・認可判定の戻り値は不変 |

ENOENT 注入は不在パス、ディレクトリ読取分岐は dangling symlink を使う(`cid:code-generation:bun-readfilesync-dir-platform-divergence`)。

### Step 6 — 回帰確認と配布同期

- `applyProductionAutonomyMode` を直接呼ぶ既存 integration テスト8ファイル(`t121` / `t195` / `t378` / `t433` / `t435` / `t455` / `t456` / `t458`)は state 書込という新しい副作用を受けるため、**変更前ベースラインを確認**してから差分を評価する。
- `bun run build` で self-install/dist を再生成し、追跡ファイルが不変であることを `git status` で確認する。
- テスト path 集合は配列展開で実在確認し、runner の `Ran ... across M files` と期待ファイル数を照合する(`cid:build-and-test:test-path-set-completeness` / `bt-path-existence-array-expansion`)。

## 検証コマンド(exit code を個別に記録 — パイプ越しに捕捉しない)

1. `bun run typecheck`
2. `bun run lint`
3. `bash tests/run-tests.sh --ci`
4. `bun run build` → `git status --short`(追跡ファイル不変の確認)

coverage 実行(`coverage:ci` / `--coverage`)は conductor が直列所有するため builder 側では実行しない(`cid:code-generation:c1-coverage-single-owner`)。

## 逸脱の扱い

要件・設計と異なる実装が必要になった場合(既存様式への準拠と判断する場合も含む)は実装前に停止して報告する。Step 1 の「集合差の被減数」と Step 3 の「冪等判定の述語」は、いずれも設計本文(domain-entities.md:35 / BR-U1-3)と一次証拠から一意に導かれる執行として実施し、その導出根拠を code-summary.md に記録する。
