# Code Summary — fix-1248-cursor-clear

上流入力(consumes 全数): requirements.md(FR-1〜4/NFR — {unit-name} 系設計成果物は units-generation SKIP により不在 = expected、code-generation-plan.md が設計代替)

## 実装(Bolt bolt/fix-1248-cursor-clear、commit `22593bb8f`、base origin/main `a326f47bc`)

- **FR-1a**: `packages/framework/core/tools/amadeus-lib.ts` に `clearActiveIntentCursor(projectDir, dirName, space?)` 新設 — `setActiveIntentCursor` と対称の best-effort(read → 内容一致時のみ `rmSync`、swallow)。`amadeus-state.ts` `handleCompleteWorkflow` の `updateIntentStatus(...,"complete")` 直後に配線(監査4行 emit → state write → registry complete → clear の順序維持 = AC-3a)。
- **FR-1b**: `amadeus-lib.ts` に seam `intentStatusForAudit(projectDir, intent?, space?)` 新設(`activeIntent` 解決 → registry status、不明は "unknown")。`amadeus-audit.ts` `appendAuditEntryUnlocked` 冒頭ゲート: status === "complete" で追記せず stderr advisory 1行(留保 e2)+ `{appended:false, reason:"intent-complete", event, timestamp}`。戻り型は判別ユニオン `AppendAuditResult`(互換シムなし — 消費6箇所を第3再列挙し、`.timestamp`/`.event` は両アーム保持で追随不要、`handleAuditMerge` の明示型のみ更新)。`activeIntent` resolver 非改変(留保 e4)。
- 設計判断(plan の委譲範囲内、逸脱でない): (i) ゲートは `VALID_EVENT_TYPES` 検証直後 — 無効イベントは従来どおり throw (ii) unknown status は追記続行(肯定的 complete のみ抑止 — plan の NFR-3 明文化どおり)。

## テスト

`tests/integration/t243-post-complete-audit-stop.test.ts`(6テスト・20 assert、in-process 駆動・shipped dist import): カーソル解放/他 intent カーソル温存/明示 intent 抑止+advisory/lone-intent fallback 抑止/unknown 続行/in-flight 増加。`tests/integration/t51.test.ts` の helper に lone-intent fallback 追加(FR-1a 作用の必然的追随)。

## 検証(builder 実測+conductor 裏取り再実行)

| コマンド | exit |
|---|---|
| typecheck / lint / complexity-gate | 0 / 0 / 0 |
| tests/run-tests.sh --ci | PASS(388ファイル・5493 assert・fail 0) |
| dist:check / promote:self:check | 0 / 0 |
| ローカル lcov 新規行 | 未カバー 0(catch 行・配線行 DA>0 個別確認) |
| conductor 裏取り(t243 単独+typecheck+dist:check) | 6 pass / 0 / 0 |

## 落ちる実証(falling-proof-no-stash 準拠、対象ファイル checkout 切替)

- pre-fix 全戻し: t243 = 0 pass / 1 fail(export 不在)。
- audit のみ pre-fix(behavioral): 抑止2テストが `Expected: false / Received: true` で赤 — ゲートが因果。
- HEAD 復元: 6 pass / 0 fail、`git status` クリーン。

## Origin repro 閉包(fix-review-replays-origin-repro — conductor が scratch で verbatim 逆転を実測)

#1248 クロスレビューの再現手順を修正版 dist で再適用: complete-workflow 後 (1) カーソル消滅 (2) SENSOR_FIRED CLI append → `appended:false`+advisory+シャード 33行不変(単一 intent = lone-intent fallback 経路でも抑止) (3) 実フック mint-presence HUMAN_TURN → 抑止・HUMAN_TURN 0件 (4) 完了監査4行は解放前に記録済み(33行に WORKFLOW_COMPLETED 実在)。

## 変更ファイル(37)

正本3(lib/audit/state)+dist 6ハーネス+self-install 6ハーネス(×3ファイル)+テスト2+coverage registry/ratchet 2。
