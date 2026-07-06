# Outcomes Pack — Amadeus Grilling 統合

**Scope**: grilling-integration(カスタム合成スコープ、11/32 ステージ、Standard 深度)
**Stages delivered**: 11 approved / 11 total
**Duration**: 118 min(2026-07-06 開始)

## 1. What Was Built

**Intent**: mattpocock の grilling スキル(MIT ライセンス)を Amadeus Grilling として統合する — stage-protocol への第4対話モード「Grill me」追加+スタンドアロンスキル `/amadeus-grilling` の2成果物を不可分の1パッケージとして出荷した。

**解決した課題**: 既存の Guide me(選択式)では、提示された想定内の回答から選んで先へ進んでしまい、隠れた前提・未検討の代替案が表面化しないまま成果物が生成される。grilling の規律(1問ずつ・推奨回答つき・事実は自己調査し判断だけを問う・共通理解の確認まで)を、Amadeus の既存契約(質問ファイル= source of truth、監査ログ)の上に載せ、対話の深さとトレーサビリティを両立させた。

**納品物**:

| 成果物 | 内容 |
|---|---|
| `core/amadeus-common/protocols/grilling-protocol.md` | 規律の単一ソース(新設)。対話規律 D1〜D7、8ステップループ、スペックブロック雛形、workflow/standalone 差分表。先頭に MIT 帰属コメント |
| stage-protocol.md「Grill me」モード | §3 Step 2 に第4モードとして追加(Construction/Operation では「例外的利用」注記)。Step 3d 新設: 提示前の空 `[Answer]:` 追記、即時書き戻し、1問ごと監査ログ(既存イベント型のみ) |
| `core/skills/amadeus-grilling/SKILL.md` | read-only セッションスキル(ステージポインタ非前進・監査イベント非発行)。ステージ成果物にもワークフロー外の任意の計画/設計にも使える |
| `tests/unit/t199-grilling-distribution.test.ts` | 4 dist 配布・分類・MIT 帰属の機械検証(18 tests) |
| docs 更新一式 | guide/reference の対話モード節を4モード化、session skills 列挙に `/amadeus-grilling` 追加、mattpocock/skills クレジット |

**主要なアーキテクチャ決定**(§5 に詳細):
- 規律定義を新設 `grilling-protocol.md` に単一ソース化(stage-protocol への全文インライン案を却下 — 肥大回避+スキルとの共有)
- question-rendering annex は4ハーネスとも**無変更**(バッチサイズ1+説明文への推奨根拠織り込みで既存の枠内に収めた)
- 新しい監査イベント種別を追加せず、既存 VALID_EVENT_TYPES の範囲内で実現

**技術スタック**: Bun(TypeScript, ESM)/ Biome 2.4系 / typescript ^6。フレームワークバージョン 1.0.0 → **1.1.0** にバンプ(CHANGELOG `## [1.1.0] - 2026-07-07`)。

## 2. Repository Structure

本 intent が触れた範囲の注釈つきツリー:

```
core/
  amadeus-common/
    protocols/
      grilling-protocol.md      # 新設 — grilling 規律の単一ソース(MIT 帰属つき)
      stage-protocol.md         # Grill me モード追加(Step 2 選択肢+Step 3d)
    conductor.md                # tri-mode 列挙を4モード化
    stages/ideation/            # intent-capture / market-research のモード列挙更新
  skills/amadeus-grilling/
    SKILL.md                    # 新設 — read-only スタンドアロンスキル
  templates/onboarding.md       # セッションスキル列挙4本化
  tools/
    amadeus-version.ts          # 1.1.0
    amadeus-runner-gen.ts       # 非ランナースキル列挙コメント更新
harness/
  claude|kiro|kiro-ide/manifest.ts  # coreDirs に skills/amadeus-grilling 追加
  codex/emit.ts                     # セッションスキル配列に追加(codex は emit 経由が実配布経路)
tests/unit/t199-grilling-distribution.test.ts  # 新設
dist/ + .claude/ .codex/ .agents/   # package.ts / promote:self による再生成物
docs/guide/ docs/reference/         # 4モード化+クレジット追記
```

配布フロー: `core/` が単一ソース → `bun scripts/package.ts` で4ハーネスの `dist/` へ → `bun run promote:self` でこのリポジトリ自身のセルフインストール(`.claude/` 等)へ昇格。

## 3. Setup Guide

- **前提**: bun(`curl -fsSL https://bun.sh/install | bash`)。実行ビット不要、macOS/Linux/Windows 同一動作。
- **セットアップ**: `bun install` のみ。
- **環境変数**: 必須なし(`AMADEUS_USE_SWARM=1` は swarm の Dynamic Workflow 有効化のオプション)。
- **テスト実行**: `bash tests/run-tests.sh`(デフォルト = smoke+unit+integration)。単体は `bun test tests/unit/t199-grilling-distribution.test.ts` など。型検査+リント: `bun run check`。

**使い方**:
- ワークフロー内: ゲート付きステージの質問でモード選択肢から「Grill me」を選ぶ。
- ワークフロー外: `/amadeus-grilling <ファイルまたはテーマ>` — 状態を進めず監査イベントも発しない read-only 対話。

## 4. Build and Deploy

このリポジトリにデプロイ基盤はない。配布 = ユーザーが `dist/<harness>/` を自プロジェクトへコピーする方式。

ビルド〜検証の実測結果(build-and-test ステージ):

| コマンド | 結果 |
|---|---|
| `bun scripts/package.ts` → `--check` | ✅ 全4ハーネス in sync |
| `bun run promote:self` → `promote:self:check` | ✅ PASS(build-and-test 時点では合成スコープのランタイムファイル2件を drift 誤認していたが、PR #602 `ac4aa725` で promote-self に合成スコープ保全が入り解消済み) |
| `bun run typecheck` | ✅ PASS |
| `bun test t199` / `t68` | ✅ PASS(18 tests / 7 tests) |
| `bash tests/run-tests.sh`(230ファイル) | ✅ 新規リグレッションゼロ(失敗8は main 既知ベースラインと完全一致: t11/t38/t65/t66/t140/t174/t19/t130) |
| `bun run lint` | ✅ 変更ファイルはクリーン(既知の main 由来違反のみ残存) |

## 5. Architecture Decisions

1. **規律の単一ソースを新設 `grilling-protocol.md` に配置** — stage-protocol.md への全文インライン案を却下。理由: 1000行ファイルの肥大回避と、スタンドアロンスキルとの規律共有。(functional-design トレードオフ記録)
2. **question-rendering annex を拡張しない** — 最大リスク仮説(OQ-1「1問ずつ+推奨回答が annex の枠内で表現できるか」)を実コード読解+本ワークフロー実測で検証し**成立を確認**。バッチサイズ1+説明文への推奨根拠織り込みで実現。ハーネスパリティ(NFR-2)を毀損する annex 拡張は不要になった。
3. **1問ごと監査ログと HUMAN_TURN 在席ゲートの整合(OQ-2)** — 同じく実測で衝突なしを確定。新監査イベント種別ゼロ(FR-3.2)。
4. **codex 配布は manifest ではなく emit.ts 経由** — FR-2.4 の当初合否基準(4ハーネス manifest への行追加)を設計で上書き。codex の実配布経路がセッションスキル配列であるため(architecture-reviewer 指摘由来の逸脱、記録済み)。
5. **終了条件はハイブリッド** — depth 目安(Minimal ~2-4 / Standard ~5-8 / Comprehensive ~8-12+ は既存 depth 契約を参照)+「続けて」延長+「done」即時打ち切り。対話長期化と depth 契約の衝突リスクを吸収。
6. **両成果物は不可分の1パッケージ(全 Must)** — モードだけ・スキルだけでは出荷しない。チームルール(同一コミットで dist 再生成・docs 更新・バージョンバンプ)と整合。

**制約**: 質問ファイル= source of truth / 空 `[Answer]:` タグ規約 / read-only スキル分類規則 / 監査イベントのホワイトリスト — いずれも既存契約として変更不可を貫いた。既存3モードの挙動は無変更(NFR-3)。

## 6. What to Commit vs Archive

| Artifact | Action | Destination |
|----------|--------|-------------|
| 実装コード(core/ harness/ tests/ docs/ セルフインストール) | Commit 済み | PR #601(`f94a5a7a`)で main にマージ済み |
| `dist/`(生成物) | Commit(設計どおり) | ハンドオーバー作業中に「origin/main に dist が一度も含まれていない」ことが判明。原因はコミッターのグローバル gitignore(`dist/`)による黙殺で、リポジトリ `.gitignore` への `!/dist/` 追加とともに全 dist ツリーをコミットして是正 — §8 |
| `amadeus/spaces/default/intents/260706-amadeus-grilling/` の成果物一式 | Commit | ワークスペース規約どおり version 管理(audit シャード含む) |
| ステージ質問ファイル(`*-questions.md`) | 規約上は record 内に残置 | — |
| `OUTCOMES.md`(本書) | Commit | ワークスペースルート |

このリポジトリは Amadeus 自身のドッグフーディングのため、汎用テンプレートの「audit.md をアプリ repo にコミットしない」ルールは適用せず、Git Integration 規約(amadeus/ ツリーごとコミット)に従う。

## 7. Workflow Footprint

- Stages: 11 approved, 0 failed, 0 pending(initialization 3/3, ideation 2/2, inception 3/3, construction 3/3)
- Memory entries captured: 24(8 interpretations, 5 deviations, 4 trade-offs, 7 open questions)
- Sensors: 62 firings — 56 passed, 6 failed(いずれも修正のうえ通過)
- Learnings captured: 0 from orchestrator, 0 from user additions

## 8. Known Limitations and What to Tackle Next

ワークフロー中に記録された残課題3点は、ハンドオーバー時点で以下のとおり**解決済み**:

- ~~promote:self:check の drift 誤認~~ → **解決済み**。PR #602(`ac4aa725` / `062a9ae0`)で `scripts/promote-self.ts` に合成スコープ保全が追加され、`promote:self:check` は現在パスする。
- ~~`.claude/CLAUDE.md` のセッションスキル列挙が3本のまま~~ → **解決済み**。grilling 本体コミット(`f94a5a7a`)で4本化済み。
- ~~dist/ が gitignore で git 追跡外~~ → **設計意図に合わせて是正済み**。docs / README / CONTRIBUTING は一貫して「dist は generated, committed, drift-guarded」と定めているが、origin/main に dist は一度も含まれていなかった(コミッターのグローバル gitignore `dist/` による黙殺)。リポジトリ `.gitignore` に `!/dist/` 否定パターンを追加してグローバル ignore を打ち消し、全4ハーネスの dist ツリー(`package.ts --check` で core と in sync を確認済み)をコミットした。

引き続き残るもの:

1. **LLM 実行時挙動の検証はドッグフーディング頼み** — NFR-5 の例示エッジ(中断時の空 `[Answer]:`、done 即時終了)は決定的テスト対象外。t199 は配布/分類/帰属で代替。`integration-test-instructions.md` の手順で実走確認を継続すること。
2. **成功指標の実測はこれから** — 「承認ゲートでの Request Changes 減少」(監査ログの前後比較)と定性評価(§13 learnings への記録)は、今後の grilling モード実利用で測定する。
3. **Out of Scope として明示的に見送ったもの**: 既存3モードの変更、新監査イベント種別、annex を超えるハーネス別差し込み、モード選択率などの利用計測基盤。
