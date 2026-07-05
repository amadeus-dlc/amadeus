# Code Generation Plan：260705-docs-codekb-guards

unit: docs-codekb-guards（bugfix scope により units-generation は SKIP。Intent 全体を単一 unit として扱う。前例: 260705-agmsg-trial-docs）

Bolt 3 本を直列で実行する。各 Bolt は TDD（先に失敗する eval → 失敗確認 → 最小修正 → GREEN 確認）で進める（dev-scripts ルール、NFR-1）。eval は隔離 workspace での実 CLI 駆動とする（NFR-2、Corrections c5）。

## B001（#498）: codekbRepoName の主リポジトリ名解決 — FR-1

- [x] Step 1: eval `dev-scripts/evals/docs-codekb-guards/check.ts` に B001 検査を追加する。一時ディレクトリに実 git リポジトリ + linked worktree（別名ディレクトリ）を作り、worktree 側の隔離 workspace で `amadeus-utility.ts codekb-path` を実行して repo キーが主リポジトリ名に解決されることを検査する（RED を確認）。
- [x] Step 2: `.agents/amadeus/tools/amadeus-lib.ts` の `codekbRepoName` に、basename フォールバックの前段として git 由来の主リポジトリ名解決（`git rev-parse --git-common-dir` の親ディレクトリ basename）を実装する。git 不在・非 git ディレクトリでは従来の basename フォールバックを維持する（FR-1.3）。
- [x] Step 3: eval GREEN を確認する。通常 checkout での従来挙動（回 帰なし）も同 eval で検査する。
- [x] Step 4: `dev-scripts/data/parity-map.json` の exceptions に本修正の理由を追記する（`tools/aidlc-lib.ts` は engineFileExceptions 宣言済み）。

## B002（#499）: workspace_requires ガードの docs-only 宣言例外 — FR-2

- [x] Step 5: eval に B002 検査を追加する。隔離 workspace で (a) 宣言なし + source work なし → 従来どおり拒否（#366 型検出の保全 = FR-2.5）、(b) 宣言あり（承認証拠参照つき） → 完了できる、(c) 宣言に承認証拠参照がない → 拒否（FR-2.3）、の 3 経路を実 CLI（`amadeus-state.ts`）で検査する（RED を確認）。
- [x] Step 6: docs-only 宣言を実装する。宣言は registry（`intents.json`）の Intent entry フィールド（決定論的 marker = FR-2.2）とし、承認証拠への参照（decision の stage と記録時刻、または audit イベント識別情報）を必須にする（FR-2.3）。`amadeus-state.ts` の workspace_requires ガードは宣言があるとき検査を免除し、免除の発動を audit イベントとして emit する（FR-2.4）。イベント名は audit-format.md に追記する（エンジンのガード仕様変更として gate 承認済み）。
- [x] Step 7: eval GREEN を確認する。parity-map.json の exceptions に理由を追記する（`tools/aidlc-state.ts` は宣言済み。registry を読む場合 `tools/aidlc-lib.ts` も同断）。audit-format.md の knowledge 正準（`.agents/amadeus/knowledge/amadeus-shared/audit-format.md`）を更新する。

## B003（#501）: validator の codekb 採用方式判定 — FR-3

- [x] Step 8: eval に B003 検査を追加する。実 stub データ（本 Intent record の 9 件。参照先正本 = codekb/amadeus/ 実在）で validator が pass すること、参照先が存在しない stub で fail することを、source 側 validator の実行で検査する（RED を確認）。
- [x] Step 9: `skills/amadeus-validator/validator/AmadeusValidator.ts` に参照解決型判定を実装する。record 内 reverse-engineering produces（9 件一式 = FR-3.1）が「正本 path への相対リンク + 採用根拠」を持つ場合、参照先の正本ファイルの存在をもって pass とする（FR-3.2、FR-3.3）。stub 必須要素の契約を validator の検査仕様（skill 内文書）に記す。
- [x] Step 10: eval GREEN を確認する。`bun run dev-scripts/promote-skill.ts amadeus-validator --replace` で昇格し、`npm run test:it:promote-skill` を実行する。

## 仕上げ

- [x] Step 11: `package.json` に `test:it:docs-codekb-guards` を追加し、`test:it:all` の連鎖に組み込む。
- [x] Step 12: `aidlc-state.md` の Per unit を実 unit 名（docs-codekb-guards）へ手動更新する（Corrections build-and-test:c2、前例 e10f8294）。
- [x] Step 13: code-summary.md を書く（変更ファイル一覧、eval 結果、parity 宣言、Bolt ごとの要約）。

## トレーサビリティ

| Plan step | Bolt | 要求 | Issue |
|---|---|---|---|
| Step 1〜4 | B001 | FR-1.1〜FR-1.4、NFR-1〜NFR-3 | #498 |
| Step 5〜7 | B002 | FR-2.1〜FR-2.6、NFR-1〜NFR-3 | #499 |
| Step 8〜10 | B003 | FR-3.1〜FR-3.4、NFR-1〜NFR-2 | #501 |
| Step 11〜13 | 共通 | C-3（PR 前検証の入口整備）、record 整合 | — |
