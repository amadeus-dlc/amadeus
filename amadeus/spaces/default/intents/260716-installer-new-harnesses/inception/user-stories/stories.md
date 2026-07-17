# User Stories — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、codekb の business-overview.md / component-inventory.md(RE 全数再検証済み台帳)、`../practices-discovery/team-practices.md`(既存実践)、personas.md、`../../ideation/rough-mockups/wireframes.md`(モック1〜3)、`../../ideation/rough-mockups/user-flow.md`。
> エピック分割: ジャーニー別(user-stories:c1)— E1 導入 / E2 保守 / E3 運用。

## E1: 導入ジャーニー(P-1)

### US-1.1: opencode への install【Must Have】

**As a** OpenCode 利用開発者(P-1)**I want** `install --harness opencode` で導入したい **so that** 手動コピーなしで `$amadeus` を使い始められる。

- AC(BDD): **Given** dist/opencode を含む配布物(codeload fixture)と空のプロジェクト **When** `amadeus-setup install --harness opencode --yes` を実行 **Then** exit 0 で `.opencode/`+`amadeus/`+`AGENTS.md` が配置され verify が通る(モック2、FR-3 AC-3a)
- 独立テスト可能: fakeHttp+fixture で in-process 完走(ネットワーク不要)

### US-1.2: cursor への install【Must Have】

**As a** Cursor 利用開発者(P-1)**I want** `install --harness cursor` で導入したい **so that** 手動コピーなしで `/amadeus` を使い始められる。

- AC(BDD): US-1.1 と同構造 — **Then** `.cursor/`+`amadeus/`+`AGENTS.md` の配置と verify 通過(独立 fixture で実行可能)

### US-1.3: 誤入力時のガイダンス【Must Have】

**As a** 導入を試みる開発者(P-1)**I want** 未知ハーネス名で明確なエラーが欲しい **so that** 正しい選択肢へ即座に辿り着ける。

- AC(BDD): **Given** 任意のプロジェクト **When** `install --harness foo` **Then** exit 2+6値列挙のエラー(モック3、FR-3 AC-3c — 既存 UX の保存)

### US-1.4: README 導線【Must Have】

**As a** README から導入する開発者(P-1)**I want** OpenCode/Cursor 行に install コマンドが載っていてほしい **so that** 手動手順を探さず一貫導線で導入できる。

- AC(BDD): **Given** README「Pick your harness」表 **When** OpenCode/Cursor 行を読む **Then** install コマンドが記載され「manual install」注記がない(FR-5 AC-5a)。**And** :109 の wizard prose が6値(AC-5b)

## E2: 保守ジャーニー(P-2)

### US-2.1: 列挙全数性の機械検出【Must Have】

**As a** 保守メンバー(P-2)**I want** 列挙の欠落がテストで赤くなってほしい **so that** ハーネス追加時の変更漏れをレビュー前に検出できる。

- AC(BDD): **Given** 契約テスト2本(literal 6値)**When** 列挙サイトのいずれかが欠けた実装を作る **Then** テストが赤くなる(FR-2 — 落ちる実証は code-generation で注入実測)

### US-2.2: 7値目の追加手順台帳【Should Have】

**As a** 将来のハーネス追加者(P-2)**I want** 追加時の全変更面の台帳が欲しい **so that** 8サイト+テスト+README を漏れなく辿れる。

- AC(BDD): **Given** FR-4 AC-4b の将来条件チェックリスト **When** 次のハーネスを追加する **Then** 8サイト+テスト2本+README の全数台帳を辿れる

### US-2.3: 公開物の実検証【Must Have】

**As a** リリース運用者(P-2 と兼務)**I want** `npm pack --dry-run` が新列挙でも green であってほしい **so that** 公開物の内容が列挙拡張で壊れていないことを実ツールで確認できる。

- AC(BDD): **Given** 列挙拡張後の packages/setup **When** `npm pack --dry-run` を実行 **Then** exit 0+DECLARED_IN_FILES(dist/cli.js / LICENSE ×2)が出力に列挙される(FR-4 AC-4a — pack-contract は変更不要が前提、変わる場合は逸脱停止)

## E3: 運用ジャーニー(P-3)

### US-3.1: doctor の一貫 advisory【Should Have】

**As a** マルチハーネス環境の運用者(P-3)**I want** doctor が installer 生成ツリーを列挙してほしい **so that** 環境の実態を advisory で正しく把握できる。

- AC(BDD): **Given** opencode ツリーが installer で配置済み **When** `--doctor` を実行 **Then** otherTrees advisory が opencode を列挙する(FR-6 AC-6b — advisory 面のみ、hard gate なし = AC-6c)

## 優先度・依存関係・INVEST

### MoSCoW 集計

- **Must Have**: US-1.1 / 1.2 / 1.3 / 1.4 / 2.1 / 2.3(install 正しさ+全数性+公開物 — Issue #1048 の中核契約)
- **Should Have**: US-2.2(台帳は FR-4 AC-4b の文書化 — 実装成立に必須ではないが保守価値)/ US-3.1(advisory 一貫性 — E-1048-RA-Q1 裁定 B の付随面、install 正しさとは分離)
- **Could / Won't**: なし(スコープは In 1〜5 に閉じる — Won't は scope-document の Out 5点)

### 依存関係

- US-1.1/1.2/1.3 → FR-1 の列挙拡張が前提(同一 Bolt 内の実装順序であり、ストーリー間のリリース依存ではない)
- US-1.4 は US-1.1/1.2 の成立後に文言が真になる(docs は実装と同一 PR — fixture-propagation の同時性)
- US-2.1/2.3・US-3.1 は相互独立。全 US が単一 Bolt 内で完結し、Bolt 間依存なし

### INVEST 準拠ノート

- **I**ndependent: 各 US は独立の検証手段(fixture / grep / npm pack / doctor 出力)を持つ(上記依存は実装順序のみ)
- **N**egotiable: US-2.2/3.1 は Should(降格・別 intent 化の交渉余地を MoSCoW で明示)
- **V**aluable: 各 US に so that(価値)明記
- **E**stimable: 全 US が RE の file:line 台帳に接地(見積り S — feasibility)
- **S**mall: 最大でも列挙8サイト+テスト2本(単一 Bolt 内)
- **T**estable: 全 AC が exit code / 配置検証 / grep / 実ツール出力で実測可能

## ストーリーの独立性

US-1.1/1.2/1.3 は fixture 単位で独立実行可能、US-2.x はテスト・文書・実ツール検証のみ、US-3.1 は FR-6 に閉じる — リリース順序依存なし(inception ガードレール準拠)。

## FR ↔ US 対応(AC 粒度)

| FR/AC | US |
|---|---|
| FR-1(8サイト)/ FR-3 AC-3a | US-1.1 / US-1.2 |
| FR-3 AC-3c | US-1.3 |
| FR-5 AC-5a/5b | US-1.4 |
| FR-2 | US-2.1 |
| FR-4 AC-4a | US-2.3 |
| FR-4 AC-4b | US-2.2 |
| FR-6 AC-6b(AC-6a は実装詳細、AC-6c/6d は制約) | US-3.1 |

AC 粒度で orphan なし(FR-3 AC-3b の出力様式は US-1.1/1.2 の Then に内包、FR-6 AC-6d の非接触は制約であり US 対象外)。
