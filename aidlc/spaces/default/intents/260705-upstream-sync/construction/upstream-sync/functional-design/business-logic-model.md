# Business Logic Model — upstream-sync

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更のモデル

実行時ロジックの新規実装はない。変更は上流 2.2.0（b67798c3）の取り込みであり、次の 4 層に写像される。

1. パリティ基準層: `dev-scripts/data/parity-baseline.json` の再生成（baselineCommit = b67798c3、R001）と `parity-map.json` の例外整理（R006）
2. エンジン実体層: 変更 9 tools + stop hook の再コピーまたは統合（R002）、audit-format.md の合流統合（R004）
3. 適応資産層: composer 3 ファイルと amadeus-compose skill の適応コピー、skills/ 正準ソース同期、promote 昇格（R003）
4. 参照面: skills/amadeus/SKILL.md の composer conductor block、CLAUDE.md の該当 1 文、stage-catalog.md（R003 / R004）

## 実施手順の設計

Construction（code-generation）は次の順で 1 unit として実施する。delivery-planning は SKIP のため bolt-plan は作らず、単一 unit `upstream-sync` の直列手順とする。

1. 前提確認: engineer3 の bugfix PR（codekb 更新を運ぶ）の merge を待ち、rebase して自 branch の codekb 変更を落とす（R010。record stub 9 件は維持）。
2. baseline 再生成: 上流 clone（b67798c3 checkout）から `generate-parity-baseline.ts` を実行し、parity-baseline.json を更新する（R001）。
3. ファイル分類に基づく取り込み（分類表は [domain-entities.md](domain-entities.md)）:
   - 機械的再コピー（例外リスト外: runner-gen / version）: nameMappings のトークン置換で上書き。
   - 例外維持ファイルの統合（graph / jump / lib / orchestrate / state / utility / audit / stop hook）: 上流差分を当方 fix を保持したまま手動統合し、統合後も内容差が残るファイルは例外を維持、上流と一致に戻せたファイルは例外を解除（R002 / R006）。
   - 合流ファイル（audit-format.md）: RECOMPOSED を追記し Event Registry を 70 → 71 へ（R004。無改変再コピー不可、双方加筆の統合）。
   - 新規適応（composer persona / knowledge / compose skill）: rename + grilling 結線のみの適応コピー。source は `skills/amadeus-compose/` に置き、`promote-skill.ts --replace` で昇格（R003）。
4. pdm 再タグ: 再コピーで失われる stage frontmatter の `scopes: pdm` を再付与し、`amadeus-graph.ts compile` と `scope-table` で grid・SKILL 表を再生成する（R005）。composed scope との共存は [business-rules.md](business-rules.md) の規約に従う。
5. 検証: TDD（取り込み前に fail する検証の確認手段として `parity:check` の baseline 更新後 fail → 取り込みで pass を RED/GREEN として扱う）、`npm run parity:check`、`npm run test:all`、`npm run test:it:installer`（R009。CLAUDE.md 適応文が MANIFEST.amadeusMd の removeBlocks に触れないことを含む）、validator（対象 Intent 指定）。
6. PR: ドリフト 7 項目の判断表（R007）を説明に含め、merge 後に #428 をクローズできる形にする。

## 統合点と完了条件

完了条件は受け入れ条件 6 行（requirements.md）である。統合点は単一 PR（phase PR 統合はしない。skill 変更を含むため粒度制約に従い、エンジン + skill + parity を不可分の 1 PR とし、理由を PR 説明に記録する）。
