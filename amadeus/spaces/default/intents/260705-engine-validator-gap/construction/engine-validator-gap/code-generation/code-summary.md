# Code Summary — engine-validator-gap

Intent: 260705-engine-validator-gap（bugfix scope）
対応 Issue: [#457](https://github.com/amadeus-dlc/amadeus/issues/457)、[#458](https://github.com/amadeus-dlc/amadeus/issues/458)
実装方式: TDD（RED 確認 → 最小修正 → GREEN 確認）

## 変更ファイル

| ファイル | 変更内容 | 対応要求 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-state.ts`（L998） | handleAdvance の stdout JSON `memory_path` に `relativeRecordDir(pd)` を第 3 引数で渡し、record prefix 付き path へ統一 | R001（#457） |
| `skills/amadeus-validator/validator/lifecycle-v2.ts`（`checkStageMark`） | scope 外ステージの合法表記に「`[ ]` ＋ annotation `SKIP`（`SKIP:` 前置含む）」を追加。`[S]` は従来どおり合法 | R002（#458） |
| `.agents/skills/amadeus-validator/validator/lifecycle-v2.ts` | `promote-skill.ts amadeus-validator --replace` による昇格先同期 | R002（#458） |
| `dev-scripts/data/parity-map.json` | `engineFileExceptions` に `tools/aidlc-state.ts` を追加し、reason へ #457 修正を追記 | R001（#457） |
| `dev-scripts/evals/aidlc-state/check.ts` | RED 検査追加: advance stdout の `memory_path` が record prefix で始まること | R001（#457） |
| `dev-scripts/evals/amadeus-validator/check.ts` | RED 検査追加: エンジン実出力形（`- [ ] <slug> — SKIP`）fixture を validator が pass すること。V4 のラベル文言を拡張後の契約に合わせ更新 | R002（#458） |

## 主要な実装判断

- エンジン側（state-build の `[ ] — SKIP` 出力）は変更しない。上流 v2 パリティを維持し、`[S]`（ジャンプ由来）と `— SKIP` suffix（scope 除外）の語彙の意味を区別したまま、validator の受理条件を実契約に合わせた（requirements Q2 で確定した方針どおり）。
- 既存 eval fixture が `[S] <slug> — SKIP: out of bugfix scope` という手書き形でエンジン実出力と乖離していたことが #458 の見逃し原因だった。既存 fixture を壊さずエンジン実出力形の検査を追加した。

## テスト結果

- RED 証拠: #457 は `memory_path=aidlc/spaces/default/intents/inception/...`（dirName 欠落）で fail、#458 は scope 外 26 ステージ全件が `[ ]` で fail することを修正前に確認した。
- GREEN 証拠: `test:it:aidlc-state`、`test:it:amadeus-validator`、`test:it:promote-skill`、`test:it:engine-e2e`、`npm run test:all` すべて成功（exit 0）。

## advance stdout の消費者調査（R001 の確認事項）

`memory_path` の参照箇所は `amadeus-runtime.ts`（PR #456 で record prefix 対応済み）と `amadeus-learnings.ts`（runtime graph 経由）のみで、`amadeus-state.ts advance` の生 stdout の `memory_path` を読む消費者はコード・docs のいずれにも存在しなかった。旧形式前提の消費者はない。

## 計画からの逸脱

1. `dev-scripts/evals/aidlc-state/check.ts` に tNN 形式の既存テストはなく、実際の規約（`check(name, condition, evidence)` ヘルパー）に合わせて実装した。
2. Step 8 で範囲外の第三の不整合（audit に `PHASE_VERIFIED` が記録済みでも `## Phase Progress` を `Verified` へ更新する仕組みがエンジンに存在しない）を発見した。値の書き換えだけでは `phase-check-<phase>.md` 成果物欠落の別 fail に置き換わるため、儀式の証跡を捏造せず現状のまま残した。#458 の再現ケース自体は pass するが、この別系統の既存不整合により本 record の AmadeusValidator 全体判定は fail のままである。[Issue #464](https://github.com/amadeus-dlc/amadeus/issues/464) としてスコープアウト済み（詳細は `code-generation-plan.md` 末尾）。受け入れ条件の読み替えは `requirements.md` の追補に記録した。

## Review

判定: READY

- R001（#457）: `.agents/amadeus/tools/amadeus-state.ts` L998 の diff を確認した。`handleAdvance` の stdout `memory_path` が `relativeMemoryPath(nextStage.phase, nextStage.slug, relativeRecordDir(pd))` へ変更されており、`amadeus-runtime.ts` L372 の `relativeMemoryPath(phaseInfo.phase, slug, relativeRecordDir(projectDir))` と完全に同型である。`relativeRecordDir`/`relativeMemoryPath` の実装（`amadeus-lib.ts` L465-474、L1742-1745）を読み、record prefix が解決できない場合は従来どおり bare space prefix にフォールバックすることも確認し、既存の呼び出し規約と整合している。`pd`（`resolveProjectDir(projectDir)`）は同ファイル内の他箇所（L2163、L2325）でも同じ用途に使われている既存変数であり、import 追加も妥当である。
- R002（#458）: `skills/amadeus-validator/validator/lifecycle-v2.ts` の `checkStageMark` diff を確認した。`isJumpSkip`（`[S]`）と `isBirthSkip`（`[ ]` かつ `annotation` が `SKIP` で始まる）の 2 条件で scope 外ステージを合法とし、要求どおり `[S]` は従来のまま合法、`[ ]`＋`SKIP`/`SKIP: ...` の両方の annotation 形を受理する。`annotation` フィールドは `aidlc-state-contract.ts` の checkbox 正規表現（`— (.+)` キャプチャ）で既に取得済みの実データであり、型定義の拡張だけでなく実際に `doc.stages` から渡ってくる値であることを caller（`checkStageProgress`）を辿って確認した。`amadeus-utility.ts`（state-build、L2349-2351）の実装を確認し、エンジンが scope 外ステージに対して常に `- [ ] <slug> — SKIP`（reason 注記なしの bare "SKIP"）を書くことも確認済みで、`isBirthSkip` の判定条件と一致する。in-scope ステージの `[x]`/`[-]` はこの分岐（`operationSlugs.has(...) || !inScope` の外）に入らないため無影響であり、operation ステージが scope 内でも常に `[S]` を要求する既知の別論点（範囲外・記録済み）にも触れていない。
- 昇格同期: `skills/amadeus-validator/validator/lifecycle-v2.ts` と `.agents/skills/amadeus-validator/validator/lifecycle-v2.ts` を diff で突き合わせ、完全に同一であることを確認した。
- parity-map: `dev-scripts/data/parity-map.json` の `engineFileExceptions` に `tools/aidlc-state.ts` が追加され、`exceptions` の reason 文が #457 の内容を追記する形で自然に拡張されている。`npm run parity:check` を実行し pass を確認した。
- テスト十分性: `dev-scripts/evals/aidlc-state/check.ts` の新規検査は、`.agents/amadeus/{tools,amadeus-common,sensors,scopes,agents,knowledge}` を隔離 temp workspace にコピーし、実際に `bun ... intent-birth` → `bun ... advance intent-capture` を CLI として起動して stdout の `memory_path` を検査しており、手書き fixture ではなく実エンジン出力そのものを検証している。`dev-scripts/evals/amadeus-validator/check.ts` の V4b は、`amadeus-utility.ts` の実装（`- [ ] ${slug} — ${suffix}` で suffix は常に bare "SKIP"）と一致する形へ既存 fixture を変換しており、修正前は fail（`[S]` 以外は全て fail）、修正後は pass することを diff とロジック確認の両方で検証した。いずれも「エンジンの実出力形」を根拠にしており、回帰があれば検出できる。
- 実行確認: `npm run test:it:aidlc-state`、`npm run test:it:amadeus-validator`、`npm run test:it:promote-skill`、`npm run test:it:engine-e2e`、`npm run parity:check`、`npm run test:all` をすべて本レビューで再実行し、exit code 0（全 ok）を確認した。
- スコープ規律: `git status --short` で変更ファイルは `amadeus-state.ts`、`lifecycle-v2.ts`（source/promoted 各 1）、`parity-map.json`、`aidlc-state/check.ts`、`amadeus-validator/check.ts`、`intents.json`（本 Intent の registry 登録、期待どおり）のみであり、未追跡の `260705-engine-validator-gap/` は本 Intent 自身の record（想定どおりの成果物）である。R001/R002 と無関係なファイルへの変更は見当たらない。
- 懸念（判定を変えないが人間判断が必要）: 受け入れ条件 2 の 4 番目「`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-engine-validator-gap`（本 Intent の実 record が pass する）」を実際に実行したところ、exit code 1 で fail した（`先行 phase が Verified または Skipped である` が `Initialization: Active`／`Inception: Pending` を根拠に 2 件 fail）。これは R001/R002 とは無関係な第三の既存不整合（`PHASE_VERIFIED` イベント発生時に `## Phase Progress` を更新する仕組みがエンジンに存在しない）が原因であり、code-summary.md 内で調査結果と非対応の判断根拠（値の書き換えは `phase-check-<phase>.md` 成果物欠落の別 fail を誘発するため証跡捏造になり不可）が明確に記録されている。一方で、これは requirements.md に明記された受け入れ条件の文言を字面どおりには満たしていない状態でもある。次のいずれかを人間判断で確定してから Bolt 承認に進むことを推奨する。(a) この乖離を認識した上で受け入れ条件の当該項目を「R001/R002 の再現ケースが pass すること」に限定する形で requirements.md を追補訂正する、または (b) 新規 Issue 化を先に実施しその参照を requirements.md / code-summary.md 双方に記録する。いずれの場合も、AmadeusValidator 全体が exit 1 のままである事実を隠さず承認ゲートに提示すること。
- 軽微な指摘（判定を変えない）: `construction/code-generation/memory.md` の「Deviations」節が空のままであり、Step 8 で発見した第三の不整合と受け入れ条件の未充足は code-summary.md にのみ記録されている。stage 定義の Learn 節が想定する記録先（memory.md の Deviations）にも同内容を残すと、次回の gate ritual での拾い上げ漏れを防げる。
