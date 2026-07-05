# コード生成サマリー — unit: skill-quality-repair

## 変更ファイル一覧

### skill 変更（source と昇格先を同一 PR で同期）

- `skills/amadeus/SKILL.md` / `.agents/skills/amadeus/SKILL.md`
  - 壊れたローカルパス参照 `docs/reference/12-state-machine.md` を、実在するローカル契約（`docs/amadeus/lifecycle/state.md`）と vendored copy（`references/aidlc-v2/audit-format.md`）への参照に置き換えた（F1）。
  - 「GitHub Issue references as input」節を新設し、R005 の入力契約（`#nnn` ≡ URL 等価、`owner/repo#nnn` 受理、文脈曖昧時の停止）を明記した（F2）。
- `skills/amadeus/references/issue-ref-contract.md` / `.agents/skills/amadeus/references/issue-ref-contract.md`（新規）
  - 上記契約の詳細と決定論的検査の手順を記載。
- `skills/amadeus-grilling/SKILL.md` / `.agents/skills/amadeus-grilling/SKILL.md`
  - Grilling Decision Trail の形式仕様（列・必須フィールド・テンプレート）を本文からの重複記述から新設の references ファイルへの参照に置き換えた（F3）。
- `skills/amadeus-grilling/references/grilling-trail-contract.md` / `.agents/skills/amadeus-grilling/references/grilling-trail-contract.md`（新規）
  - `AmadeusValidator.ts` の `checkGrillings` 系検査コードから必須項目を抽出した、生成規約とコピー用テンプレートの単一の正。
- `skills/amadeus-validator/SKILL.md` / `.agents/skills/amadeus-validator/SKILL.md`
  - Grilling Decision Trail の必須フィールド列挙を、上記 references ファイルへの参照に置き換え、重複を解消した（F3）。
- `skills/amadeus-intent-capture/SKILL.md` / `.agents/skills/amadeus-intent-capture/SKILL.md`
  - grilling 結線の範囲内で、Grilling Decision Trail 生成時に新契約ファイルを参照する一文を追加した（F3、R004 の「少なくとも intent-capture 系の生成経路」要件に対応）。

### dev-scripts（TDD: RED 確認後に追加）

- `dev-scripts/issue-ref-contract.ts`（新規）: `issueRefContractIssues(root)` — 対象 skill（現状 `amadeus` のみ）の SKILL.md に R005 の 3 契約句が揃っているかを検査するロジック。
- `dev-scripts/check-issue-ref-contract.ts`（新規）: 上記の CLI ラッパー。
- `dev-scripts/evals/issue-ref-contract/check.ts`（新規）: 隔離 fixture で contract 完備／欠落／昇格先欠落／昇格先不一致の 4 パターンを検証したうえで、実リポジトリに対する GREEN を確認する eval。

### package.json

- `issue-ref-contract:check` と `test:it:issue-ref-contract` を追加し、`test:ci:mock` と `test:it:all` のチェーンへ組み込んだ。

### Intent 成果物

- `construction/skill-quality-repair/audit-report.md`（新規）: 41 skill の判定表、finding 5 件（`repairable` 3 件・`deferred` 2 件）、#341 disposition（close 提案）、#340 向け要約コメント案。
- `construction/skill-quality-repair/code-generation/code-summary.md`（本ファイル）。

## 主要判断

1. **監査範囲の分類は stage-catalog.md を機械的に正とした。** 41 skill をステージ 30／非ステージ 11 に分類し、ステージ skill の修正は改名・grilling 結線の範囲に限定した。
2. **実行可能性の検査は静的パス解決で行った。** `skills/amadeus*/SKILL.md` が参照するコマンド・パスを、`.claude/` 配下のシンボリックリンク経由の解決（`.claude/amadeus-common`、`.claude/tools` など）を含めて機械的に検証し、誤検知（プレースホルダーや文脈依存の裸ファイル名言及）を除外した。この過程で `amadeus/SKILL.md` の `docs/reference/12-state-machine.md` 参照だけが実体を欠くことを特定した。
3. **#341 の残日本語 3 skill は個別に内容確認し、全件を「許容日本語」と判定した。** 対話例（domain-modeling）と生成成果物の必須フィールド名・出力テンプレート（grilling、validator）はいずれも Skill Language Policy が明示的に認める対象であり、SKILL.md 英語化義務への違反ではない。よって #341 は close 提案とし、SKILL.md の書き換えは行っていない。
4. **Grilling Decision Trail 契約は AmadeusValidator のコードを一次情報として抽出した。** 既存の `amadeus-grilling`／`amadeus-validator` 双方の記述はほぼ同じ内容を別の言い回しで重複させていたため、検査コード（`checkGrillingsIndex`、`checkGrillingSession`、`checkGrillingDecisions`、`checkGrillingQuestions` 等）の実装から必須項目を機械的に洗い出し、1 箇所（`amadeus-grilling/references/`）にまとめた。
5. **engine tool 側の欠陥（F5）は本 Bolt で修正しなかった。** `amadeus-utility.ts scope-table` のデフォルトパスが B002 の改名前を指す不具合を発見したが、修正には engine tool 変更が必要であり、team.md の PR 粒度制約（skill 変更 PR は skill 変更だけで構成する）に反するため、`deferred` として audit-report.md に記録するに留めた。
6. **amadeus-init の `dist/` 記述（F4）はステージ skill の parity 境界外の疑いがあるため修正しなかった。** 改名・grilling 結線を超える内容変更に当たる可能性があり、`deferred` として記録した。

## 検証結果

| 検証 | コマンド | 結果 |
|---|---|---|
| N001 標準検証 | `npm run test:all` | pass |
| N002 parity 維持 | `npm run parity:check` | pass（38 skills、197 engine files、基準 commit `fde1e1af7aae16f4c4defc991abaa3877ee2ac26`） |
| N003 昇格同期 | `npm run test:it:promote-skill` | pass |
| N004 成果物構造 | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-skill-quality-repair` | pass |
| grilling 結線 | `npm run grilling-wiring:check` | pass |
| 入力契約（新規） | `npm run issue-ref-contract:check` / `npm run test:it:issue-ref-contract` | pass |

`npm run test:all` は `typecheck`、`lint:check`、`contracts:check`、`parity:check`、`claude-wiring:check`、`grilling-wiring:check`、`issue-ref-contract:check`、`test:it:all`（全 eval）、`test:it:engine-e2e`、`diff:check` を含めてすべて pass した。

## 計画からの逸脱

- 計画（Step 1〜8）はそのまま実施した。逸脱はない。
- Step 1（WF1 監査）の結果、finding は当初の想定（#341 の 3 skill のみ）より広く、`amadeus` の壊れたパス参照（F1）と R005 未実装（F2）、Grilling Decision Trail 形式の重複（F3）を追加で検出し、それぞれ `repairable` として本 Bolt 内で修正した。これは計画の Step 1〜5 の範囲内（監査で見つかった非ステージ skill の問題を補修する）であり、計画外の作業ではない。
- F4／F5 の `deferred` 2 件は、計画の「parity 逸脱が必要な問題は後続 Issue 候補として記録する」という業務ルールに従った結果であり、計画からの逸脱ではない。

## Review
**Verdict**: READY
**Findings**:
- （非ブロッキング）`skills/amadeus-grilling/references/grilling-trail-contract.md` の「質問記録」節にある「`確定判断: <GDnnn[, GDnnn...]>` — every referenced ID must exist in this session's `確定判断` table」という記述は、実際の `AmadeusValidator.checkGrillingQuestions` の挙動（`collectGrillingDecisionIds` が同一 `grillings/` 配下の全 session file から ID を集めた集合と照合しており、"this session's" ではなく "target root 内のどの session でも" 参照可）より狭い。規約どおりに生成すれば validator は必ず pass する（規約の方が実際の許容範囲より厳しいだけ）ため実害はないが、正確性の観点で軽微な記述漏れである。将来の修正時に参考にされたい。
- 検証結果は再実行で確認した: `npm run parity:check`（pass、38 skills / 197 engine files / 基準 commit 一致）、`npm run issue-ref-contract:check` と `bun run dev-scripts/evals/issue-ref-contract/check.ts`（pass）、`npm run grilling-wiring:check`（pass）、`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-skill-quality-repair`（不足・矛盾なし）、`npx tsc --noEmit`（クリーン）。`npm run test:all` は builder 実施結果（本ファイル上部）をそのまま採用し、再実行はしていない（指示どおり）。
- スコープ遵守を確認した: ステージ skill への変更は `amadeus-intent-capture` の grilling 結線 1 行のみで、それ以外の 29 ステージ skill（`amadeus-init` 含む）は無変更（`git diff --stat` で確認）。#341 の全面英語化作業は実施されておらず（`amadeus-domain-modeling` など残日本語 3 skill は無変更）、R006 は「close 提案」の記録に留まっている。F4（`amadeus-init` の `dist/` 記述）・F5（`amadeus-utility.ts` の `skillMdPath()` 既定値）はいずれも `deferred` のまま未着手であり、正しく後続 Issue 候補として記録されている。
- source skill と `.agents/skills/` 昇格先ミラーは、変更対象 4 skill・新規 references 2 ファイルすべてで `diff` により内容一致を確認した（promote-skill.ts 経由の同期どおり）。
- 言語 policy: 変更した SKILL.md／TS はすべて英語、`references/issue-ref-contract.md` と `references/grilling-trail-contract.md` も英語で書かれている一方、ユーザー向け gate 文言・生成成果物側の日本語（`grillings.md` の列名、session file の必須項目名など）は維持されており、方針と整合している。
