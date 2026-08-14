# Business Logic Model — rename-github-pr-convergence

上流入力: `unit-of-work.md` U1、`unit-of-work-story-map.md`(FR-REN-1〜8 → U1)、`requirements.md` FR-REN 群、`components.md` C1/C6、`component-methods.md`(本 Unit は新規公開 API なし — 契約は不変)、`services.md` F3(配送検証フロー)。

## ワークフロー: 改名の実施順序(単一 PR 内)

```
1. git mv plugins/pr-convergence plugins/github-pr-convergence(13 ファイル)
2. plugin.json の "name" を "github-pr-convergence" へ(compose :344 検証との同時変更 — FR-REN-1)
3. パス軸消費者の同期(FR-REN-2 — 26 件の全内訳):
   - **プラグイン自身 2 ファイル**(git mv は内容中のパス文字列を書き換えないため明示的に編集する。実測 `git grep -n "plugins/pr-convergence" -- plugins/pr-convergence/`):
     - `sensors/amadeus-pr-convergence-report-format.md:4` — `command: bun {{HARNESS_DIR}}/plugins/pr-convergence/tools/...` → `plugins/github-pr-convergence/`(センサー実行パス — 未同期だと投影後のセンサー spawn が旧パスを探して壊れる)
     - `stages/pr-convergence.md` — `{{HARNESS_DIR}}/plugins/pr-convergence/tools/...` の 5 箇所(:55, :113, :274, :298, :320)→ `plugins/github-pr-convergence/`(ステージ本文の CLI 呼出パス)
   - テスト 20 件の "plugins/pr-convergence" 文字列 → "plugins/github-pr-convergence"
   - tests/.coverage-patch-allowlist.json のパスピン 5 件 / tests/.complexity-baseline.json 5 件
   - tests/fixtures/pr-convergence/README.md のパス文字列(ディレクトリ名は維持 — ADR-1)
   - t445:52 の PLUGIN 定数 → "github-pr-convergence"(実プラグイン名軸)
4. 素の名前軸の同期(FR-REN-3/4):
   - amadeus/config.json :42 activation.names 要素、:60 scope-bindings 外側キー(:61 のステージ slug キーは不変)
   - docs/harness-engineering/06-sensors.md:72 / 06-sensors.ja.md:39 のプラグイン名言及
5. scope-grid 検証テスト(新規 — ADR-2、TDD: 実装前に Red を実測):
   期待 = compile 後の scope-grid で pr-convergence ステージが self-document/self-feature/self-fix/self-refactor の 4 行に EXECUTE で載る
6. bun run build → 全ハーネス dist 再生成 → compose → 配送先ツリーの述語で再実測
7. 残存参照検査 2 述語(FR-REN-6)を実行し exit code を成果物へ記録
```

## 落ちる実証(ADR-2 — 不可分の 1 セット)

```
注入: amadeus/config.json の scope-bindings 外側キーだけを旧名のまま残す(または新名を誤綴りにする)
 → 赤の実測: scope-grid 検証テストが「pr-convergence ステージがスコープ行から消えた」ことで fail
 → revert: キーを正しい新名に戻し、残渣ゼロを機械確認(git diff 空)
正当系: 正しく同期された config で同テストが green(全 4 スコープ行に載る)
```

## 決定表: 参照の書換え可否

| 参照の種類 | 例 | 書換え |
|---|---|---|
| パス文字列 `plugins/pr-convergence` | テスト・allowlist・README | する |
| パス文字列(プラグイン自身の内容内) | sensor md `command:` 行(:4)、stage md の CLI 呼出 5 箇所 | する(git mv では書き換わらない — 明示的編集。ファイル名・センサー id・slug は不変のままパスセグメントのみ更新) |
| プラグイン名(名前軸) | config 2 面、docs 2 面、t445 PLUGIN 定数 | する |
| ステージ slug `pr-convergence` | stage md frontmatter、scope-bindings 内側キー、ステージ言及 | しない(FR-REN-5) |
| センサー id `pr-convergence-report-format` | sensor md `id:`、stage frontmatter sensors リスト | しない |
| スキル名 `/amadeus-pr-convergence` | skills ディレクトリ名 | しない |
| ツールファイル名 `pr-convergence-*.ts` | plugins 内 tools | しない(ディレクトリのみ移動) |
| 歴史記録 | intents/elections/codekb、project.md Learnings 引用 | しない |
| フィクスチャディレクトリ名 `tests/fixtures/pr-convergence/` | fixtures | しない(ADR-1 — 不変 slug 整合) |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:47:53Z
- **Iteration:** 1
- **Scope decision:** none

FR-REN-2 の『プラグイン自身2ファイル』消費者カテゴリが functional-design 3成果物のどこにも写像されておらず、残存参照検査(FR-REN-6)の完全性が担保できない。

### Findings

- BLOCKER | requirements.md FR-REN-2 はパス軸消費者26ファイルの内訳を『プラグイン自身2/テスト20/coverage-patch-allowlist/complexity-baseline/fixtures README/project.md歴史引用』と明記している(2+20+1+1+1+1=26)。しかし business-logic-model.md のワークフロー・決定表、business-rules.md、domain-entities.md のいずれにも『プラグイン自身2ファイル』という語・対象ファイル名が一切出現しない。git mv は物理移動のみでファイル内容中のパス文字列は書き換えない。実装者はどの2ファイルをどう変更すべきか functional-design だけからは判断できず、FR-REN-2 の受け入れ基準を機械的に満たせない。
- FOLLOW-UP | 是正時は component-methods.md C4 の手がかり(プラグイン内ファイルのパス文字列保持)を起点に該当2ファイルを特定し、決定表・ワークフローへ明示的な行として追加することを推奨する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:49:16Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 BLOCKER resolved: プラグイン自身2ファイルの写像がbusiness-logic-model.mdへ明示追加され、FR-REN-5不変集合と矛盾しない

### Findings

- None
