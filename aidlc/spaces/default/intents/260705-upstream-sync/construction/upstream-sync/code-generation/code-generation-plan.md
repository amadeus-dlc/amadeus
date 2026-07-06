# コード生成計画 — unit: upstream-sync

上流入力は requirements.md（R001〜R010）である。
設計は [functional-design](../functional-design/business-logic-model.md)（EXECUTE 済み、gate 承認済み）に従う。nfr-requirements / nfr-design / infrastructure-design は scope refactor により SKIP。Test Strategy は Minimal（TDD: RED 先行・parity:check が定量的 GREEN 基準）。実行単位は単一 unit / 1 PR である。

## トレーサビリティ

| Step | 対応要求 | 対象 |
|---|---|---|
| Step 1 | R001 | parity-baseline.json 再生成（RED フェーズ確立） |
| Step 2 | R002 | amadeus-runner-gen.ts、amadeus-version.ts の機械的再コピー |
| Step 3 | R002、R006 | 例外 8 ファイルの 3-way merge（Base=fde1e1af+mappings、Ours=local、Theirs=b67798c3+mappings） |
| Step 4 | R003 | 新規適応コピー 3 件（composer-agent.md、composing.md、amadeus-compose/SKILL.md） |
| Step 5 | R004 | audit-format.md の合流統合（RECOMPOSED イベント追記） |
| Step 6 | R004 | skills/amadeus/SKILL.md の composer conductor block 追加 |
| Step 7 | R005 | pdm scope 再タグ確認（stage .md 未変更のため compile 不要を確認） |
| Step 8 | R009 | symlink 追加（.claude/skills/amadeus-compose → .agents/skills/amadeus-compose） |
| Step 9 | R003、R004 | 昇格（promote-skill.ts --replace）と全検証 |
| Step 10 | （stage 成果物契約） | code-summary.md |

## 実行ステップ

- [x] **Step 1: RED フェーズ確立（R001）** — 上流 clone（b67798c3）から `generate-parity-baseline.ts` で `parity-baseline.json` を再生成し、`baselineCommit` を `b67798c37c71855271b70882a33f47890d41f212` へ更新する。再生成後に `npm run parity:check` が 6 件の差分（runner-gen / version / composer-agent / composing / amadeus-compose / pdm-stage 未変更確認）で fail することを確認する（RED）。
- [x] **Step 2: 機械的再コピー（R002）** — `amadeus-runner-gen.ts`（/aidlc-compose runner 生成コード追加）と `amadeus-version.ts`（2.2.0 バージョン更新）を apply-mappings.ts で変換した内容で更新する。
- [x] **Step 3: 3-way merge（R002、R006）** — 例外維持 8 ファイル（amadeus-lib.ts / amadeus-stop.ts / amadeus-jump.ts / amadeus-audit.ts / amadeus-state.ts / amadeus-utility.ts / amadeus-orchestrate.ts / amadeus-graph.ts）を git merge-file ベースで統合する。amadeus-jump.ts のみ phase-closing ロジック（ours local fix）と nextInScopeStage 引数追加（theirs）のコンフリクトを手動解決する。全 8 件とも engineFileExceptions に留まる（ローカルデルタ残存）。
- [x] **Step 4: 新規適応コピー（R003）** — `agents/amadeus-composer-agent.md`（agent 14 個目）、`knowledge/amadeus-composer-agent/composing.md`、`skills/amadeus-compose/SKILL.md` を適応コピーする。適応点は rename（aidlc-* → amadeus-*）とツールパス（.claude/tools/ → .agents/amadeus/tools/）のみ。
- [x] **Step 5: audit-format.md 合流統合（R004）** — RECOMPOSED（Navigation category）イベントを追加し、Event Registry を 70 → 71 へ更新する。双方が加筆しているため 3-way merge ではなく合流統合（追記型 union）で対応する。
- [x] **Step 6: composer conductor block 追加（R004）** — `skills/amadeus/SKILL.md` の "New work while an intent is active" 節に PLAN-RESHAPE 認識・On a PLAN-RESHAPE signal bullet・"Composing a workflow plan" セクション・Scope-to-Stage Mapping の carve-out 注記を追加する。ツールパスを amadeus-* に適応する。
- [x] **Step 7: pdm 再タグ確認（R005）** — 今回変更したファイルに stage .md が含まれないため pdm scope タグは無変更。`bun amadeus-utility.ts scope-table` で `pdm 12 / 32` が維持されることを確認する。
- [x] **Step 8: symlink 追加（R009）** — `.claude/skills/amadeus-compose → ../../.agents/skills/amadeus-compose` を作成し、`claude-wiring:check` の drift を解消する。
- [x] **Step 9: 昇格・検証（R003、R004）** — `promote-skill.ts --replace amadeus-compose` と `promote-skill.ts --replace amadeus` で昇格する。`npm run test:all`（exit 0）、`npm run test:it:installer`（pass）、validator（260705-upstream-sync 指定、pass）を確認する。
- [x] **Step 10: code-summary 作成** — 変更ファイル、主要判断、RED→GREEN 証跡、検証結果、逸脱を `code-summary.md` に記録する。

## 制約（requirements.md より）

- 上流ファイルの局所改変を行わない（改変はパリティを崩す）。適応点は rename とツールパス置換のみ。
- CLAUDE.md は parity-map で「リポジトリ固有・上流と同期しない」と明示されており、R004 の CLAUDE.md 適応は N/A。
- audit の記録済みイベントを書き換えない。
- stage-catalog.md と skills/ 正準ソースを同期し、promote-skill.ts 経由で昇格する。
- `test:all` の全 check pass を検証基準とする。
