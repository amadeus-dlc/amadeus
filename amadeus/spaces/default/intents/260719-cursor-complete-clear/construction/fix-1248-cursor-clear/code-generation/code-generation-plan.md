# Code Generation Plan — fix-1248-cursor-clear

上流入力(consumes 全数): requirements.md(FR-1〜4/NFR/制約。units-generation は SKIP のため {unit-name} 系設計成果物は不在 = expected、本 plan が設計代替を兼ねる)

## 方式(E-CCCRA 裁定 C の実装展開)

### FR-1a: complete 時のカーソル解放

- `packages/framework/core/tools/amadeus-lib.ts` に `clearActiveIntentCursor(projectDir, dirName, space?)` を新設: カーソルファイルを読み、**内容が `dirName` と一致する場合のみ** `rmSync` で削除(他 intent へ切替済みのカーソルを誤消去しない)。per-user カーソルにつき失敗は swallow(`setActiveIntentCursor` :1725-1733 と対称の best-effort)。
- `amadeus-state.ts` `handleCompleteWorkflow` の `updateIntentStatus(...)`(:1668-1669)直後に呼び出す。順序: 監査4行 emit(:1636-1659)→ state write(:1661)→ registry complete → **cursor clear(最後)** — AC-3a(完了処理自身の監査記録が解放より先)を構造的に満たす。

### FR-1b: 監査追記チェーン限定の status ゲート

- 配置: `amadeus-audit.ts` の `appendAuditEntryUnlocked`(:314)冒頭 — appendAuditEntry(:281)は Unlocked へ委譲するため1点で全経路(7フック+CLI append+state emitAudit)を被覆。E-CCCRA 留保 e4 どおり `activeIntent` resolver は非改変。
- 判定 seam(in-process テスト可能な exported 純関数): `intentStatusForAudit(projectDir, intent?, space?)` を lib に新設し、追記先 intent(explicit > active 解決 — auditFilePath と同一解決)の registry status を返す。
- ゲート規則: status === "complete" のとき追記をスキップし、**stderr advisory 1行**(留保 e2)を出して `{ appended: false, reason: "intent-complete", event, timestamp }` を返す。呼び出し元の `{ appended: true }` 前提は判別フィールドで置換(互換シムなし — 消費側を同一 PR で棚卸し)。
- 例外ケースの明文化(NFR-3、設計委譲分の確定):
  - registry 不在・行不在・status 不明(`unknown`)→ **追記続行**(ゲートは肯定的 complete のみで発動)。理由: 監査トレイルの可用性が優先 — 読取失敗で監査を落とすと監査欠損という別の S1 級欠陥を作る。無音 fail-open との違いは「complete の確定値でのみ抑止する片方向ゲート」であり、判定不能を成功扱いしない(抑止もしない)こと。
  - complete-workflow 自身の監査4行: updateIntentStatus 前に emit されるため非影響(順序で保証、AC-3a テストで固定)。

### 消費側棚卸し(appended フィールド)

`appended` を読む呼び出し元を `grep -rn "appendAuditEntry" packages/ tests/` で全数列挙し、戻り値を分岐消費する箇所は同一 PR で追随(実装時に第3再列挙 — enumeration-reverify-at-implementation)。

## テスト(AC-2/AC-3 → 回帰テスト)

`tests/integration/t242-post-complete-audit-stop.test.ts`(番号は既存最大+1 を実装時に採番)— 実 FS は integration 層(fs-tests-integration-first)、駆動は in-process(seam 直呼び — spawn 盲点回避):

1. **AC-2a/2b(i)(ii)**: scratch 相当の一時 workspace(2 intent+cursor)で `handleCompleteWorkflow` 相当の complete 実行 → カーソル消滅を assert → `appendAuditEntry(SENSOR_FIRED, …)` が `{appended:false}` を返しシャード行数不変+stderr advisory を assert。
2. **AC-2b(iii)**: 単一 intent workspace(カーソルなし・lone-intent fallback)で complete 済み registry → append 抑止を assert(FR-1b が fallback 穴を塞ぐ実証)。
3. **AC-2c**: in-flight intent への append は `{appended:true}`+行数増を assert(過剰阻止なし)。
4. **AC-3a**: complete 実行後のシャードに WORKFLOW_COMPLETED 等4行が実在(解放前 emit の順序固定)。
5. **落ちる実証**: 本テストは修正前コードで赤(origin repro の逆転)— PR に修正前赤の実測を記録(注入は不要、fix 自体が対象)。

## 検証コマンド(すべて exit code 添付で報告)

`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / `bun scripts/package.ts` → `bun run dist:check` / `bun run promote:self` → `bun run promote:self:check` / ローカル lcov で diff 追加行未カバー 0(local-lcov-pre-push、配線行チェックリスト)。

## 変更ファイル目録(実装完了後に最終確定)

- `packages/framework/core/tools/amadeus-lib.ts`(clearActiveIntentCursor+intentStatusForAudit 新設)
- `packages/framework/core/tools/amadeus-audit.ts`(appendAuditEntryUnlocked ゲート+戻り値判別化)
- `packages/framework/core/tools/amadeus-state.ts`(handleCompleteWorkflow へ clear 呼出)
- `tests/integration/t242-*.test.ts`(新規)
- `dist/` 6ハーネス+self-install `.claude/`(再生成)
- 消費側追随(棚卸し結果による)

## Bolt

単一 Bolt(bolt/fix-1248-cursor-clear、base=origin/main a326f47bc)。PR はスカッシュ、レビュアーは実装者以外(PR 作成時に指名)。
