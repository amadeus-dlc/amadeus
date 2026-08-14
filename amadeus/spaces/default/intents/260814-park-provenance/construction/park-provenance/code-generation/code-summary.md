# Code Summary — park-provenance

Unit: Issue #3016(FR-1〜FR-6)。Bolt branch `bolt-3016-park-provenance`(base = origin/main `2c5d78923f`)、PR #3053(record checkpoint 同梱、created report mint 済み)。user-stories は scope SKIP のため各変更は FR へ直接トレース(plan の traceability 参照)。Bolt スラッグは `park-provenance`(intent 名由来)、worktree ブランチ名は `bolt-3016-park-provenance`(前 unit の §12a NIT 対応で対応関係を明記)。

## 変更ファイル(実装4コミット + record checkpoint 1)

- `54f5c137e` fix(state): accept an autonomous park backed by a fresh human turn
  - `packages/framework/core/tools/amadeus-state.ts` — ガード置換: 旧 `if (getField(content, "Construction Autonomy Mode")?.trim() === "autonomous") { error(...) }` → 新 `if (isAutonomousMode(content) && outstandingHumanTurns(pd).length === 0) { error("Refusing to park: ... no unconsumed HUMAN_TURN is on record. ...") }`。虚偽コメント(「Stop hook's identical guard」)を実態へ是正
  - `packages/framework/core/tools/amadeus-lib.ts` — `scanPresenceLedger` に `WORKFLOW_PARKED` → `res: "park"` を追加(consume-once。delegation の gate/answer スロット非干渉、新規イベント属性なし)
  - `packages/framework/core/tools/amadeus-orchestrate.ts` — コメント1箇所の実態是正のみ(挙動不変)
  - `tests/unit/t17.test.ts`(受理/拒否/consume-once の3件へ書換)、`tests/integration/t3016-park-provenance.integration.test.ts`(新設4件: resume+grant 保持、engine 層パススルー)、`tests/e2e/t122-stop-hook-e2e.test.ts`(行ピン drift 是正含む)
- `508cb0caa` docs(reference): sync the park contract and resync the TLA impl pins — docs 4面(12-state-machine / 06-hooks-and-tools の en/ja)+ model-map impl ピン(`updateModelMap --impl-only`)
- `0b70fb5a1` chore(tests): resync the coverage ledgers — coverage-registry 再生成(park/unpark を mechanism: cli で登録)、allowlist の `amadeus-state.ts#<module>` を gate 自身の `createSemanticSelector` で再アンカー(43→58行、手編集なし)
- `ec3bd967a` chore(tests): none→cli ラチェットへ新規テストファイルを記録(テスト内 MAINTENANCE 注記の指示手順)
- `016fbe269b` chore(record): checkpoint(自 intent の record のみ。並行 intent の節は除外)
- `c0fed35a5` test(park): drive the resume round trip through the engine — §12a iteration 1 BLOCKER 対応。FR-4 の受け入れ確認が名指す engine 経路(`amadeus-orchestrate.ts next --resume` = Branch 2.6)での往復テストを新設。実測により Branch 2.6 は非 mutating の print directive(unpark を名指し)であることを確認し、`resumeThroughEngine()` ヘルパで「`next --resume`(print + marker 残存の固定)→ 名指しされた `amadeus-state.ts unpark`(marker 消滅)→ `next --resume` 再入(parked 非再発火)」の3手すべてを engine 側から駆動して固定。park 前後 + resume 後の `Intent Autonomy Mode` / `Intent Grant` / `Construction Autonomy Mode` 不変を検証(grant 空文字の無意味一致は排除)。**FR-3 の consume-once テストの resume ステップも同ヘルパへ揃えた**(FR-3/FR-4 とも resume は engine 経由。CLI unpark 直呼びが残るのは state tool 断面を意図するテストのみ)。実測: t3016 単体 5 pass / 0 fail(exit 0)、t17 87 pass / 0 fail(exit 0)、typecheck 0、gen-coverage-registry --check 0

## TDD 実測(4 slice)

- slice 1(受理): 旧実装で赤(`Expected: 0 / Received: 1`)→ 置換で green
- slice 2(consume-once): 赤(`Expected: not 0`)→ resolution 追加で green(t17 フル 87 pass / 0 fail)
- slice 3/4: 新設 integration 4 tests を pre-change ツリー(`git stash` 断面)で 4 fail 実測 → 適用後 4 pass(落ちる実証)
- fixture: `state-construction.md` seed + `mintHumanPresence` + `resetOtelPerProject`(cid:code-generation:c2)。full grant は production 経路(preview digest)で宣言

## 検証(exit code)

- `bun run build` 0(追跡ファイル不変)/ typecheck 0 / lint 0 / source-only:check 0 / distribution:check 0 / `updateModelMap --impl-only` 0 / `gen-coverage-registry --check` 0
- フルスイート最終完走(全実装コミット適用後): Failed assertions **1 / 13430** — 唯一の赤は既知の負荷依存フレーク t07(壁時計 300ms。単独実行 16 pass / 0 fail、同一コードで run 間判定が割れることを実測、経路不交差 grep 0 hit / exit 1。#3040 と同族のフレーククラス)

## プランからの逸脱

- 設計逸脱なし。Assumption 適用1件(触った行の open-coded 述語を `isAutonomousMode` へ寄せ — requirements Assumptions の条件内)、テスト層配置1件(production 宣言を伴う受理系は size classifier に従い integration 新設ファイルへ。unit allowlist 不増)

## 未検証面(申し送り — push-first 方針でリモート CI へ委譲)

- `coverage-patch-quick`: ツール内部 timeout(10分)で判定なし。CI の Patch Coverage Gate が `amadeus-lib.ts` の新規 resolution 行(spawn 経由でのみ到達)を uncovered とした場合、in-process unit test 追加で閉じる(allowlist 追加はしない)
- CI 正本の Patch/Project Coverage Gate・base drift(origin/main 前進)は PR #3053 の収束ループで処理
- (解消済み — iteration 1 BLOCKER 対応)FR-4 の engine 経路往復は `c0fed35a5` のテストで実測済み
