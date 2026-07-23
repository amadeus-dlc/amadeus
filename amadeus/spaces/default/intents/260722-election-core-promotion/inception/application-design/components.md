# Components — チーム機能のコア昇格

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md(本文で参照)

## コンポーネント一覧(規模数値+Reuse Inventory 付き)

| ID | コンポーネント | 対応 FR | 推定規模(行) | 種別 |
|---|---|---|---|---|
| C1 | 配布境界ガードテスト | FR-5 | 新規 120〜180 | テスト新設 |
| C2 | 選挙エンジン移設 | FR-1 | 移動 1,761(既存5ファイル計 — conductor 直読 wc -l 実測 2026-07-23: 607+464+261+222+207、architecture.md の配布非対称記述と整合)+import 修正 ~10 | 移動+微修正 |
| C3 | 選挙スキル昇格 | FR-2 | 移動 ~140(SKILL.md)+配線 ~6(manifest 2面) | 移動+配線 |
| C4 | チーム起動系の配布 | FR-3, FR-8 | 移動 2,059(team-up.sh 1271+team-msg.sh 221+codex-safety-wait 567)+prerequisite 検査追記 ~40 | 移動+微修正 |
| C5 | doctor advisory 行 | FR-4 | 新規 30〜60 | 既存ツール拡張 |
| C6 | クリーン環境 E2E | FR-6 | 新規 250〜400 | テスト新設 |
| C7 | docs(Team Mode 章+3層規約) | FR-7 | 新規 en/ja 計 400〜700 | ドキュメント |

新規実装は C1/C5/C6 のみ(合計 400〜640 行)。C2/C3/C4 は既存資産の移動が主で、二重実装なし(P5)。

## C1: 配布境界ガードテスト

- 検査述語: 配布ツリー(`packages/framework/**`、`dist/**`、self-install 5面 `.claude/` `.codex/` `.agents/` `.cursor/` `.opencode/`)のテキストファイルに `scripts/` へのパス参照が出現しないこと(occurrence 単位判定 — cid:grep-occurrence-level-exclusion。正当な出現、例えば docs 内の「開発者は scripts/ を触らない」説明文はallowlist で明示)
- **Reuse**: 既存 drift guard 群(dist:check 系)の走査様式、t174 系 docs 参照ガードの述語構造を踏襲。新規ランナー・新規 CI ジョブは作らない(既存 `tests/run-tests.sh --ci` の unit 層へ追加)
- 落ちる実証: 移設前の contrib スキル SKILL.md(scripts/ 参照現存)を fixture 化して赤を実測 → C3 で green(FR-5b)
- corpus sweep: 導入時に配布ツリー全域へ適用し、正当既存データでの偽赤 0 を確認(FR-5c)
- **移動元残置検査(P5 対称)— 重複不変量方式**: 同テストに「`scripts/` 直下の資産と配布正本(`packages/framework/core/tools/` / `core/skills/`)に**同名資産が同時に実在しない**こと」の generic assert を含める — 固定リスト・マニフェスト不要で、移動(FR-1a/2a/3a)のコピー残置事故を機械検出する(移動前=scripts のみ実在で green、移動後=正本のみ実在で green、コピー残置=両実在で赤)。順序制約を生まず U2/U3 の並行性とも両立(symmetric-pair-review。※当初のマニフェスト拡張方式は UG §12a iter1 Critical1/Major2 起点で本方式へ是正 2026-07-23 — 共有台帳衝突と AD C-graph 外の依存辺を構造的に除去)

## C2: 選挙エンジン移設

- `scripts/amadeus-election{,-model,-store,-record,-transport}.ts` → `packages/framework/core/tools/`(git mv、scripts/ 側消滅)
- import 修正は1箇所のみ: `amadeus-election.ts:46` の `../packages/framework/core/tools/amadeus-norm-metrics` → `./amadeus-norm-metrics`(conductor 正本直読実測 2026-07-23: model は import 行 0、store/record/transport の非 node:・非相互 import は grep 0件 — RE codekb dependencies.md にも同記録があるが consumes 宣言外のため一次出典は直読とする)
- テスト追随: t234〜t244 の import パスを新正本へ更新(消費側棚卸しは実装時第3再列挙 — c4 チェックリスト)
- **Reuse**: coreDirs 投影(claude/manifest.ts:42-54 の `tools`→`tools`)により全6 dist への配布は既存機構が自動処理 — 配線追加ゼロ

## C3: 選挙スキル昇格

- `contrib/skills/amadeus-election/` → `packages/framework/core/skills/amadeus-election/`(既存セッションスキル4種と同居)
- 配線2面(RA Q4=A の claude+codex 限定): (a) claude manifest coreDirs へ `{ src: "skills/amadeus-election", dst: "skills/amadeus-election" }` 追加 — 既存様式は正本直読実測(conductor 2026-07-23、packages/framework/harness/claude/manifest.ts:51 verbatim `{ src: "skills/amadeus-session-cost", dst: "skills/amadeus-session-cost" },` 以下4スキル行 :51-54)(b) codex emit の session-skill 明示リストへ `"amadeus-election"` 追加 — 正本直読実測(packages/framework/harness/codex/emit.ts:338 verbatim `for (const skill of ["amadeus-session-cost", "amadeus-replay", "amadeus-outcomes-pack", "amadeus-grilling"]) {`)。※両引用は consumed codekb 外のため正本直読を一次出典とする(レビュー Critical1 対応 — 実装時に再実測必須)
- SKILL.md 書き換え: `scripts/amadeus-election.ts` 参照全数 → `{{HARNESS_DIR}}/tools/amadeus-election.ts`、compatibility 行を配布実態へ(FR-2b/2d)
- 注意: cursor/kiro/kiro-ide/opencode の4面へはスキルを**登録しない**(coreDirs にスキル行を持つのは各ハーネス manifest 個別のため、追加しない限り漏れない — 実装時に4面の dist に skills/amadeus-election が不在であることを機械確認)

## C4: チーム起動系の配布

- `scripts/team-up.sh` / `team-msg.sh` / `team-up-codex-safety-wait.ts` → `packages/framework/core/tools/`(git mv による移動 — **scripts/ 側は削除**、コピー禁止。FR-1a/FR-2a と同一の P5 規律。bash のまま — RA Q2=A。ADR-2)
- 相対参照の追随: team-up.sh 内の `SAFETY_WAIT_HELPER="$REPO/scripts/team-up-codex-safety-wait.ts"`(team-up.sh:57 — 正本直読実測 2026-07-23。当初 :59 と誤記しレビュー捕捉→sed 直読で訂正)等、旧 scripts/ 前提のパス導出を配布コピー内相対(同ディレクトリ)へ修正(FR-3b)
- prerequisite 検査の明示化(FR-3c/3d): 起動冒頭に herdr/agmsg の PATH 検査を追加 — 不在時 `exit 1`+不在ツール名+公式入手先(herdr.dev / agmsg 公式 — RA Q5)の案内。OS 検査(`uname` が Darwin/Linux 以外なら loud 非対応)を追加。既存の `set -euo pipefail` は維持
- **Reuse**: agmsg 委譲の env override(`AGMSG_ROOT` 等)・`TEAM_MSG` backend 契約は不変(FR-8a/8b — 既存テスト t-team-msg / t-team-up-msg-backend がそのまま契約を固定)
- `amadeus-leader-sync.ts` は本 intent では移設**しない**(チーム起動の Must 面に不要。Should 面にも含まれない — scope-document の4要素外。後続 intent 候補として Open Questions に記録済みの範囲外事項)

## C5: doctor advisory 行

- `/amadeus --doctor` の既存検査群に「Team Mode prerequisites」節を追加: herdr / agmsg の PATH 検出結果を各1行表示(検出パス or 不在+docs 参照)。不在でも doctor の exit code に影響させない(FR-4a — advisory)
- **Reuse**: doctor の既存検査様式・出力整形に従う(新規出力様式を発明しない)

## C6: クリーン環境 E2E

- `tests/e2e/` に serial テスト新設: temp HOME+隔離 PATH(fake herdr/agmsg を配置)+self-install ツリーを合成したクリーン環境で、(1) チーム起動(fake herdr への workspace/pane 呼び出し列を観測)(2) メッセージ送信(fake agmsg send.sh への委譲観測)(3) 選挙 open→vote→tally の1完走、を検証(FR-6a/6b)
- 不在分岐の検証: PATH から fake を外した構成で FR-3c の exit 1+メッセージ、FR-4 の doctor advisory を assert(FR-6c、lcov DA 到達確認)
- **Reuse**: fakeHerdr 様式(t-team-msg.test.ts:23-52)、pty 駆動様式(既存 t-tui 系 serial)、temp 環境合成(setup-install e2e 様式)

## C7: docs

- `docs/guide/20-team-mode.md` + `.ja.md` 新設: Operating Modes 契約、prerequisite 節(bun/herdr/agmsg の公式入手先参照+動作確認バージョン herdr 0.7.1 / agmsg 1.1.6)、セットアップ→選挙完走手順、Windows 対象外(FR-7a)
- 3層配置規約(scripts/contrib/framework)は `docs/harness-engineering/` へ追記(FR-7b — 開発者向け)
- **Reuse**: 既存ガイドの en/ja 対様式・言語切替リンク様式(t174 系ガードが参照整合を機械検査)

## NFR トレース(NFR-1〜4 の担保先)

| NFR | 担保コンポーネント / N/A 根拠 |
|---|---|
| NFR-1(既存 CI green) | 全コンポーネント横断の完了条件(C2/C3/C4 の移動後に dist:check / promote:self:check / typecheck / lint / --ci を再実行 — 実装の定型手順) |
| NFR-2(挙動不変) | C2(import 1行以外不変)・C4(prerequisite 検査は追加のみ、既存 env/verb 契約不変 — 既存テスト群が契約を固定) |
| NFR-3(カバレッジ規律) | C1(unit 純関数 — in-process 駆動で patch 対象を直接被覆)・C5(検査関数を export し in-process seam — spawn 盲点回避)・C6(e2e 層のため patch 母集団外の既存規律どおり)。C2/C3/C4 の移動行は既計測資産の移動であり新規行は微小(import 1行+bash 検査 ~40行 — bash は coverage 対象外) |
| NFR-4(リリース面不変) | 該当コンポーネントなし(N/A 根拠: C1〜C7 のいずれも version/バッジ/リリースノート面のファイルに触れない — 変更対象一覧に release 面が不在であることを実装時 diff で確認) |

## UI 面(design-agent 視点)

UI なし(CLI/配布系)。出力契約は verdict 別文言+exit code のモックとして C4/C5 の記述で充足(cid:ui-less-mockups-as-output-contract)。既存兄弟ツールの既習様式に揃え、新規様式を発明しない。

## AWS 面(aws-platform-agent 視点)

N/A — インフラ・クラウド資源なし(feasibility-assessment の N/A 判定を継承。本設計で新たなクラウド面は発生しない)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T01:36:06Z
- **Iteration:** 1
- **Scope decision:** none

Critical1(manifest/emit引用がconsumed codekb未収載)+Major3(C4移動元削除の非対称/NFR-3・4孤児/C1→C2辺の根拠誤り)+Minor2(:59未確認cite/code-structure宣言外引用)

### Findings

- Critical1: ADR-3のmanifest.ts:51-54/emit.ts:338引用がconsumes宣言済みcodekbに不在 — 正本直読で再検証し出典を明記せよ
- Major2: FR-3/C4に移動元scripts/削除の明示なし(FR-1a/2aと非対称)、C1ガードも残置を検査しない — P5二重実装検出機構の欠落
- Major3: NFR-3/NFR-4がどの設計成果物にもトレースされない孤児
- Major4: C1→C2依存辺の根拠(落ちる実証)はC3の変更対象であり誤り — グラフと並行可否判断を誤誘導
- Minor5: team-up.sh:59引用がconsumed codekbで未確認
- Minor6: component-methods C2がconsumes宣言外のcode-structure.mdを引用

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T01:42:11Z
- **Iteration:** 2
- **Scope decision:** none

前回6件中5件閉包成立(Critical1/Major2/3/4/Minor5 — verbatim再実測済み)。残余 = consumes宣言外codekb引用クラス3箇所(component-methods C2文/components.md:30/component-dependency.md:25)— 是正は一意特定済み(正本直読実測への出典書き換え)

### Findings

- Major-A: component-methods.md C2 の出典表示が虚偽(codekb未収載を codekb 実測と自称)— 正本直読実測へ書き換え
- Major-B: components.md:30 / component-dependency.md:25 の dependencies.md 引用が consumes 宣言外 — 同型の全数棚卸し(same-root-inventory)を伴う統一是正が必要


## Post-review closure(conductor 記帳 — reviewer verdict ではない)

- 2026-07-23T03:22:05Z — Iteration 2 の残余(Major-A/Major-B = consumes 宣言外 codekb 引用クラス3箇所)は機械検証可能クラスとして conductor が是正・閉包済み: 有限語彙(codekb basename)の全数 sweep で同型残存 0 を機械確認し、3箇所を正本直読実測の出典へ統一(component-methods.md C2 文・components.md C2 行・component-dependency.md C1→C3 行の現物)。閉包記録は AD diary(memory.md)に固定。ゲートはユーザー実 HUMAN_TURN で承認済み(GATE_APPROVED 監査行)。
