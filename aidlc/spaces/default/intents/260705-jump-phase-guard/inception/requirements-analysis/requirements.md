# Requirements — jump の phase 境界整合（260705-jump-phase-guard）

対象 Issue: [#481](https://github.com/amadeus-dlc/amadeus/issues/481)

## 意図分析

PR #479 は「PHASE_VERIFIED の emit ⇔ Phase Progress の Verified 更新 ⇔ phase-check 成果物の存在」という契約を advance / complete-workflow / state-init / approve に実装したが、`amadeus-jump.ts` の境界越えは対象外だった。
jump は PHASE_VERIFIED を emit する一方で Phase Progress を更新せず、phase-check 不在でも通過できるため、#464 と同型の不整合と新ガードのバイパス経路が残っている。

## 機能要求

- R000（閉じる phase の列挙アルゴリズム）: forward jump が閉じる phase は、正準 phase 順序（initialization → ideation → inception → construction → operation）で「現在ステージの phase（含む）から target ステージの phase（含まない）まで」を列挙して求める。複数 phase を同時に跨ぐ jump（例: ideation 途中 → construction）では、挟まる中間 phase も 1 つずつ個別に評価する。既存の二値 `crossesPhaseBoundary` フラグだけでは不十分であり、閉じる phase ごとに R001〜R003 を適用する。
- R001: R000 で列挙した各 phase に `[x]` のステージが 1 つ以上あるなら、その phase について PHASE_VERIFIED の emit と同一トランザクションで Phase Progress を Verified にする（#479 の `markPhaseVerified` を再利用する）。
- R002: R001 のケースで、当該 phase が phase-check 要求対象（ideation / inception / construction）なら、状態変更・audit emit の前に `verification/phase-check-<phase>.md` の存在を要求し、不在なら状態を一切変更せず明示エラーで拒否する（`verifyPhaseCheckArtifact` を再利用する。エラーメッセージは同関数の既存文言をそのまま使い、生成すべき成果物パスを含むため「conductor へ生成が指示される」という Issue の受け入れ条件を満たす）。複数 phase を閉じる jump では、対象全 phase の検証をいずれの状態変更・audit emit よりも先に完了させる（jump 全体で原子的に成功または不変更）。
- R003: R000 で列挙した各 phase に `[x]` のステージが無い場合、その phase は PHASE_VERIFIED ではなく PHASE_SKIPPED を emit し、Phase Progress を Skipped にする（phase-check は要求しない。state.md「phase 遷移」の既存規定に一致。questions Q2 = A）。
- R004: backward jump では phase 境界イベント（PHASE_COMPLETED / PHASE_VERIFIED / PHASE_STARTED / PHASE_SKIPPED）を emit せず、Phase Progress を変更しない（Verified を巻き戻さない。questions Q1 = A）。「戻りの表現」は既存の `STAGE_JUMPED`（Direction: BACKWARD）と対象ステージのリセットが担っており、新規イベント種別は追加しない。
- R005: `--stage` / `--phase` の単発 runner が使う `amadeus-jump.ts execute` 経路が同じ修正で保護されることを eval で確認する（orchestrate は jump execute を print directive で名指しする同一経路である）。

## 非機能要求

- N1: eval は隔離 workspace で実 CLI を駆動する形式（`dev-scripts/evals/hooks-state-bugfix/check.ts` と同型）。手書き fixture を正にしない。
- N2: 既存検証の退行なし（hooks-state-bugfix の既存 23 assertion、engine-e2e、`npm run test:all` 全件）。
- N3: エンジンファイル修正の手続き: `dev-scripts/data/parity-map.json` の `engineFileExceptions` へ `tools/aidlc-jump.ts` を宣言し、上流ドリフト追跡（#428）から追えるようにする（project.md learning c3）。

## 受け入れ条件（Issue #481 と対応）

| AC | 内容 | 担保する要求 |
|---|---|---|
| 1 | jump 経由で phase 境界を越えた record（複数 phase 跨ぎを含む）が、手作業なしに AmadeusValidator を pass する | R000 + R001 + R003 |
| 2 | phase-check 不在時、forward の境界越え（実行済みステージのある phase）が拒否され、state は変更されず、エラーが生成すべき成果物パスを指示する | R002 |
| 3 | backward jump が Verified を巻き戻さない | R004 |
| 4 | 既存検証に退行がない | N2 |

## スコープ外

#478 の 3 ギャップ（audit-fork、slug 制約、Per unit 表現）、jump の UI/UX 変更、advance 側の再修正。
