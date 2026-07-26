上流入力(consumes 全数): intent-statement, scope-document, business-overview, architecture, code-structure, team-practices

# Requirements — 260725-kimi-harness

## Intent 分析

intent-statement の目的: amadeus を Kimi Code CLI に対応させ、Kimi ユーザーが AI-DLC ワークフローを hooks 連携込みでフル機能実行できるようにする。scope-document の Must M1-M10 を、検証可能な要件へ展開する。codekb(business-overview / architecture / code-structure)で確定した移植面(manifest 自動検出・3閉集合・`amadeus-harness.ts` 移管済みの検出クラスタ)と、team-practices の Walking Skeleton 方針(最初の Bolt = 小さな E2E スライス)を前提とする。

## 機能要件(FR)

### FR-1: ハーネス定義と dist 生成(M1)

- FR-1a: `packages/framework/harness/kimi/manifest.ts` を新設し、`name: "kimi"`・`harnessDir: ".kimi-code"`・`rulesRename: null`・coreDirs(claude 相当 + session skills)・`emit: null` とする。orchestrator SKILL.md・question-rendering annex(claude 型)・onboarding fills・dot-gitignore を authored surfaces とする
- FR-1b: `bun scripts/package.ts kimi` が `dist/kimi/` を生成し、`bun scripts/package.ts kimi --check` が exit 0 でパスする(byte-parity)。t145 packaging parity が manifest 検出により自動カバーすること
- FR-1c: `.kimi-code/skills/` に runner-gen 既定のスキル群(orchestrator + stage/scope runners + session skills 全6本: amadeus-election / amadeus-grilling / amadeus-mirror / amadeus-outcomes-pack / amadeus-replay / amadeus-session-cost — `packages/framework/core/skills/` 実測)が生成されること

### FR-2: hook adapter(M2)

- FR-2a: `packages/framework/harness/kimi/hooks/amadeus-kimi-adapter.ts`(+必要なら lib)を新設し、Kimi の hook payload(stdin JSON)を Claude 契約へ正規化して core hooks へパイプする。target: `session-start | session-end | mint | audit-and-sensors | state-sync | runtime-compile | validate-state | log-subagent | stop`
- FR-2b: payload の変換表は live capture(実機配線で採取)に基づいて固定する。docs 記載と実機が乖離する場合は実機を優先する
- FR-2c: adapter は fail-open とする(スクリプト異常・未知フィールド・未対応イベントでワークフローを止めない)。Stop の block 契約(exit 2 + stderr または `hookSpecificOutput`)だけは core hook の出力を verbatim に中継する
- FR-2d: Windows 考慮は既存ハーネスと同等とする(bun 直実行・実行ビット不要・ポータブルなパス処理。専用の Windows 検証プログラムは設けない)

### FR-3: hook 配線マージ機構(M3)

- FR-3a: setup CLI がユーザーの `~/.kimi-code/config.toml` に managed block(マーカーコメント囲みの `[[hooks]]` 群 + `[[permission.rules]]` 群)を冪等マージできる。既存の `[[hooks]]`(実測14件)を保持し、削除・変更は managed block のみに作用する
- FR-3b: UX は既存インストーラの流儀に準拠する(kimi 独自 UX を新設しない): plan report(FR-007 相当)で managed block の差分を事前表示し、wizard の `confirm()` で承認を取る。拒否時は変更なしで中断し、手動手順を表示する
- FR-3c: 書き込みは安全機構を備える: 事前バックアップ、atomic write(部分失敗で config を壊さない)、壊れた TOML の loud fail、除去手順(managed block のみ除去)の提供
- FR-3d: 非対話環境の扱いは既存 install/upgrade と同じ規則に従う

### FR-4: コア編集(サンクション済み3箇所)(M4)

- FR-4a: doctor arm を `amadeus-utility.ts` の `handleDoctor` に追加する: adapter 実在・managed block 有無・`kimi --version` のフロア検査(実測版 0.28.1 下限。下限未満の扱いは既存 arm(codex の `MIN_CODEX` pin)の流儀に準拠し、doctor チェック失敗とする)・機能 probe(hook が実際に発火するか)を検査する。otherTrees リストに `.kimi-code` を追加する
- FR-4b: `amadeus-swarm.ts` の `HARNESS_VALUES` に `"kimi"` を追加し、`resolve --harness kimi` が subagent フロアを返すこと(ultra 系は非対応)
- FR-4c: `amadeus-harness.ts` の `HarnessType` union・`HARNESS_DIR_TO_TYPE`・`KNOWN_HARNESS_DIRS`・`KNOWN_RULES_SUBDIR` に kimi/`.kimi-code` を追加する(検出クラスタの現行所在地)

### FR-5: 配布・CI 列挙(M5)

- FR-5a: packages/setup の `domain/harness.ts`(union + `all` + parse)・`domain/engine-layout.ts`(kimi → `.kimi-code`)・`modules/reporter.ts`(usage/エラー文字列)に kimi を追加する
- FR-5b: `scripts/plugin-projection.ts` の `PACKAGE_HARNESSES`・`SELF_INSTALL_HARNESSES`、`scripts/promote-self.ts` の `managedDirs`(dist/kimi/.kimi-code → .kimi-code)と `PACKAGE_HARNESSES`、`scripts/detect-ci-changes.sh` の path glob に `.kimi-code` を追加する

### FR-6: dogfood(M6)

- FR-6a: `bun run promote:self` で本リポジトリのルートに `.kimi-code/` が生成されること
- FR-6b: 実機の kimi セッション(本リポジトリ)で `/skill:amadeus` が起動し、hook が発火し(HUMAN_TURN 等が audit に記録される)、`/skill:amadeus --doctor` がパスすること

### FR-7: 決定的テスト(M7)

- FR-7a: adapter 契約テスト: live-capture した実機 payload を adapter に流し、core hook の効果(audit 記録・block 中継等)を断言する
- FR-7b: dist 構造 smoke: `dist/kimi/` の必須ファイル群を module-scope リテラル表で検査する(t149 様式)
- FR-7c: setup マージの単体テスト: 冪等・既存ブロック保持・マーカー限定除去・バックアップ・壊れた TOML の loud fail
- FR-7d: swarm resolve 分岐テスト: `--harness kimi` で subagent floor、未知 driver の fail-closed 拒否

### FR-8: ドキュメント(M8)

- FR-8a: `docs/guide/harnesses/kimi-code.md` + `.ja.md` を新設し、前提(kimi 0.28.1+・bun on PATH)・hook 配線(自動/手動)・制約(ユーザーレベル config のみ)を明記する。`docs/guide/harnesses/README.md` の表に追加する

### FR-9: live journey(M9)

- FR-9a: `kimi -p` 非対話駆動の live driver を新規作成し、`AMADEUS_KIMI_*_LIVE=1` ゲート(環境変数 + バイナリ実在)で skipReason 様式の journey を1本以上実装する
- FR-9b: journey をローカルで実走して green を確認してからマージする(決定的 tier では skip)

### FR-10: セッションスキル全量同梱(M10)

- FR-10a: セッションスキル全6本(amadeus-election / amadeus-grilling / amadeus-mirror / amadeus-outcomes-pack / amadeus-replay / amadeus-session-cost)が `.kimi-code/skills/` に同梱されること(runner-gen 既定)

## 非機能要件(NFR)

- NFR-1(可搬性): Windows 考慮は既存ハーネスと同等(FR-2d と同じ規律)。実機検証は macOS
- NFR-2(堅牢性): adapter・マージ機構は fail-open/atomic。ユーザーの config をいかなる失敗でも壊さない(FR-3c)
- NFR-3(将来条件チェックリスト、requirements-analysis:c4): (a) 規模増 — 既存 `[[hooks]]` が増えても managed block の識別・除去が安定であること (b) クラッシュ耐性 — 書込み途中の kill で config が不整合にならないこと(atomic) (c) 別 OS — 既存ハーネス同等の考慮 (d) 消費側棚卸し — dist/kimi の消費者(detect-ci-changes.sh、promote-self、setup、t145)が全て列挙済みであること
- NFR-4(追従性): Kimi は fast-moving。adapter は未知フィールドを寛容に扱い、doctor がバージョンフロア + 機能 probe で「未検証」を明示できること

## 制約(Constraints)

constraint-register を要件に転記: TC-1(プロジェクト config なし → FR-3 のマージ機構が必須)、TC-2(既存 `[[hooks]]` 14件との共存 → FR-3a)、TC-3(harnessDir = `.kimi-code`)、TC-4(フロア = 実測版)、TC-5(bun が PATH 上で非対話シェルからも解決できること → onboarding doc の前提条件に明記)、TC-6(hook コマンドの cwd はプロジェクト dir → adapter は相対解決)、OC-1(ユーザー config への書込みは明示承認・バックアップ・マーカー・除去手順)、OC-2(正本は `packages/framework/{core,harness}/` を編集し dist/セルフインストールは生成物として同期)、CC-1(live 検証は probe + journey 実走まで)。TC-7(Kimi は fast-moving)は NFR-4(追従性)として要件化済み。

## 前提(Assumptions)

- A1: `.kimi-code/skills/`・`.kimi-code/agents/` が自動検出される(docs + バイナリ文字列。agents の実機検出は dogfood で確認)
- A2: AskUserQuestion の PostToolUse payload が Claude 互換(live capture で確認)
- A3: `kimi -p` が live journey 駆動に使える(driver 作成時に実機確認)

## Out of Scope

W1 plugin 配布 / W2 kimi-ultra / W3 PostCompact 再注入 / W4 mcp.json 連携 / W5 外部 npm 導入 E2E / W6 statusline / Windows 専用検証プログラム。

## Open Questions(後続ステージへ)

- hook payload の正確なフィールド名(SessionStart の source 相当、SubagentStop の agent 識別子、TodoList の `tool_input` 形状)→ M2a の live capture で解消
- Stop block の stdout 契約・SessionStart の context 注入形式 → 同上

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-25T08:16:26Z
- **Iteration:** 1
- **Scope decision:** none

requirements.md は scope M1-M10 と成功指標1-5へ FR-1〜FR-10 が全件トレースでき、Walking Skeleton 方針とも矛盾しない。検出3件は全て minor で同一 iteration で修正済み。レビュアーの spot-check 要求は誤パス構成のため却下し、実体は conductor が constraint-register 転記で解決した。

### Findings

- (minor / §制約) TC-5 欠番 → 修正済み(TC-5/OC-2 転記追加、TC-7 は NFR-4 へ)
- (minor / FR-1c・FR-10a) セッションスキル本数の内部不一致 → 修正済み(6本を実測列挙で統一)
- (minor / FR-4a) フロア未満の扱いが未決定 → 修正済み(既存 arm の流儀に準拠し doctor チェック失敗と明記)
