# Requirements（260706-full-rename）

対象 Issue: [#526](https://github.com/amadeus-dlc/amadeus/issues/526)（workspace ルート aidlc/ → amadeus/ の全面 rename。確定判断 = 候補 1）

## 意図分析

上流 aidlc-workflows の名前空間を workspace・状態ファイル・コマンドに使い続けることによる利用者への誤情報を排除する。エンジン名前空間は #445 で `.agents/amadeus/` へ移設済みであり、本 Intent で残りの名前空間（workspace ルート、状態ファイル名、コマンド表記、内部マーカー）を Amadeus へ揃え、v2 互換の主張を「構造・意味論は v2 互換、名前空間は Amadeus」として docs 側で再定義する。

実測棚卸し（conductor、c50a0fe5 時点）: `aidlc` トークンを含むのはエンジン tools 20 / hooks 9 / 昇格先 skills 54 / source skills 59 / dev-scripts 33 / docs・README 系 31 ファイル。`/aidlc` コマンド表記は 106 ファイル。workspace root 定数はエンジンの `amadeus-lib.ts`（`join(projectDir, "aidlc")` ほか）に集中する。現行構造の把握は [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)、[codekb/amadeus/component-inventory.md](../../../../codekb/amadeus/component-inventory.md) を上流入力として参照する。

## 機能要求

- FR-1（workspace ルート）: `aidlc/` → `amadeus/` へ git mv で移設する（既存 Intent record 全件、spaces/memory/knowledge/codekb を含む。履歴保全）。エンジンの workspace root 解決（amadeus-lib.ts の定数群）、validator、installer MANIFEST、kanban、hooks、dev-scripts、docs、`.gitignore`（/aidlc/ 配下の 5 パターン。更新しないと amadeus/ 側の生成物が追跡され始める）の参照を追従させる。
- FR-2（状態ファイル）: `aidlc-state.md` → `amadeus-state.md` へ全 record で改名し、エンジンの読み書き・validator・eval fixture・テンプレートを追従させる。構造と英語ラベル（checkbox 語彙、フィールド名）は不変（v2 構造の維持）。
- FR-3（コマンド表記）: `/aidlc` → `/amadeus` へ全表記を追従させる（作業基準は「全表記」であり、106 ファイルは c50a0fe5 時点の参考実測値。実装時に fresh に再走査する = rename-leftovers eval の検出反転が最終防衛線）。対象は SKILL prose、runner 生成文、エンジン directive メッセージ、hooks 文言、docs。
- FR-4（内部マーカー）: `.aidlc-sensors` / `.aidlc-hooks-health` / `.aidlc-compose-pending` / `.aidlc-plan.json` 等のエンジン内部名を `.amadeus-*` へ改名し、既存 record 内の該当ディレクトリ・ファイルを git mv で移設する（Q3）。
- FR-5（パリティ再定義）: nameMappings へ新写像（workspace root / 状態ファイル / コマンド表記 / 内部マーカー）を追加し、「写像後 byte 一致」の検査意味論を維持する（engineFileExceptions の増加を最小化）。`aidlc-state.md` 保護を前提にした既存検査（parity eval C10 の .md ガード pin、rename-leftovers allowlist の v2 成果物名エントリ）は新前提へ更新する。当方 fix 保持で例外維持中のエンジンファイルは手動 rename で追従する。
- FR-6（record 移設の記録規律）: audit の記録済みイベントは書き換えない。path 言及の扱いは「移設時点の注記を新規追記」で対応する（org.md、ディスパッチ作業指示 6）。
- FR-7（docs 再定義）: AMADEUS.md・README・docs/amadeus/（言語方針済みの英語正文書は `.md` と `.ja.md` の両方）へ rename を反映し、「構造・意味論は v2 互換、名前空間は Amadeus」の再定義を明文化する（承認要旨 ⑥）。
- FR-8（検出器の反転）: rename-leftovers eval の allowlist をデータ駆動更新し、旧名（`aidlc/`、`aidlc-state.md`、`/aidlc`、`.aidlc-*`）の残存を検出対象へ反転させる（正当な残存 = 上流参照・parity 写像の prefix 側・歴史的記録の言及は reason つきで許可）。
- FR-9（examples）: 該当なし。gate 差し戻しを受けた再実測（2026-07-06、ls examples）で examples/ ディレクトリは現行ツリーに存在しない（退役済み）。project.md の Example snapshot パターン記述が古い残置である可能性を steering 申し送りとする（Q4 は前提が誤っていたため取り下げ）。
- FR-10（段階 commit）: 機械的 rename → record 移設 → 参照更新 → 検証の段階で commit を分け、各段階で `npm run test:all` を回し、壊れた中間状態を commit しない（PR は単一）。

## 非機能要求

- NFR-1: 挙動不変（改名のみ。エンジンの状態機械・gate・audit の意味論に変更を加えない）。
- NFR-2: 並行ゼロ体制の単独実行（他 4 名は支援専任。ピア協議は全員即応）。
- NFR-3: 想定外（上流パリティと両立不能な箇所など）は即ブロック報告（halt-and-ask）。
- NFR-4: 成果物・PR は日本語、TS・SKILL.md は英語（Skill Language Policy）。

## 受け入れ条件（Issue AC と対応）

| # | 受け入れ条件 | 対応要求 |
|---|---|---|
| 1 | リポジトリに `aidlc/` ルートが存在せず、`amadeus/spaces/...` で全 record が参照できる（git 履歴が follow で追える） | FR-1 / FR-6 |
| 2 | 全 record の状態ファイルが `amadeus-state.md` で、エンジン・validator・eval が新名で動作する | FR-2 |
| 3 | `/aidlc` 表記が残存せず（許可リスト宣言分を除く）、`/amadeus` で案内が揃う | FR-3 / FR-8 |
| 4 | `npm run parity:check` が写像拡張後も ok（39 skills / 199 engine files / b67798c3）で、例外の純増が最小化されている | FR-5 |
| 5 | rename-leftovers eval が旧名残存の検出器として反転済みで、`npm run test:all`（engine-e2e / installer / promote を含む全連鎖）exit 0 | FR-8 / FR-10 |
| 6 | validator（260706-full-rename 指定）pass、既存 record の audit に遡及編集がない（検証手段: `git log --follow --diff-filter=M -- <移設後 audit パス>` で移設 rename 以外の変更 commit が存在しないこと） | FR-6 |
| 7 | docs に「構造・意味論は v2 互換、名前空間は Amadeus」の再定義が明文化されている | FR-7 |

## スコープ外

- 挙動・契約の変更（scope 追加、stage 変更、audit イベントの追加削除）。
- 上流 clone・parity-baseline の再生成（基準 commit b67798c3 は不変。変わるのは写像のみ）。
- `.agents/amadeus/`（エンジン名前空間）と `.agents/skills/amadeus*`（skill 名）の再改名（#445 で完了済み）。
