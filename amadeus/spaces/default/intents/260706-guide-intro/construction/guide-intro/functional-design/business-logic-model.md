# Business Logic Model — guide-intro

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 置き場所と構成（ピア協議 5 回答全会一致で確定）

- 置き場所: `docs/guide/`（Q1 = A。上流 v2 と同名 path、契約文書 docs/amadeus との責務分離）。
- 命名: 番号付き章（Q2 = A）。本 Intent の変更対象は、新設 8 ファイルと既存文書への最小行追記 3 対（language-policy / README / extension-guide）である。

| ファイル | 内容 | 対応要求 |
|---|---|---|
| `docs/guide/index.md` + `index.ja.md` | ガイドの入口。About（構成参考の明記 = NFR-2、言語規約 = 英語正 + `.ja.md` 併置の宣言）、読む順、章一覧（実 3 章 + 残章予定と子 Issue #567〜#571 の対応表） | FR-1.2 |
| `docs/guide/00-introduction.md` + `.ja.md` | Amadeus DLC とは何か（AI-DLC v2 意味論互換のライフサイクル契約、エンジン駆動の conductor loop）、誰のためか、5 phase / 32 stages / 10 scopes、gate と audit の考え方、上流との関係（構造・意味論互換 + Amadeus 固有名前空間）、次に読む章 | FR-2 |
| `docs/guide/01-getting-started.md` + `.ja.md` | 前提（Bun、git、Claude Code harness）、installer 導入（`bun run scripts/amadeus-install.ts --target <workspace>` / `npm run amadeus:install`）、導入されるもの、post-install verification（doctor / validator。導入直後は「workspace shell ready」1 件が fail し初回 workflow で解消する実挙動を正直に記載し、#573 修正後に簡素化できる旨の pending 注記を付す）、更新（再実行 = 冪等） | FR-3 |
| `docs/guide/02-first-workflow.md` + `.ja.md` | conductor loop の概念（skill が engine の next / report を回す）、Birth（人間承認）、ステージ進行と gate 承認、成果物の場所（record ツリー）、status での現在地確認、完了。エンジンコマンドの実出力（隔離 workspace で採取）を省略明示付きで貼る | FR-4 |
| `docs/amadeus/language-policy.md` + `.ja.md`（1 行追記） | Scope 節へ docs/guide/ も同じ対規約（英語正 + `.ja.md` 併置 + Cross-linking rules）に従う旨を追記（leader 条件 = 適用範囲の明文化） | FR-1.1 |
| `README.md` + `README.ja.md`（1 行追加） | Documentation 節へ User guide（docs/guide/index.md）リンクを追加 | C-1 |
| `docs/amadeus/extension-guide.md` + `.ja.md`（1 行追加） | ガイドへの相互リンク（利用者向け導入は docs/guide を参照する旨の 1 行。逆方向は index が extension-guide を Related links で参照） | C-1（ディスパッチ指示 4 の相互接続） |

## 実測計画（NFR-1）

隔離 workspace（scratchpad の一時ディレクトリ、git init 済みの空プロジェクト）で次を実実行し、出力を採取する。設計段階で 1〜3 は採取済み。

| # | コマンド | 用途 | 状態 |
|---|---|---|---|
| 1 | `bun run scripts/amadeus-install.ts --target <ws>` | getting-started の導入例 | 採取済み（install-output.txt） |
| 2 | `bun <ws>/.agents/amadeus/tools/amadeus-utility.ts doctor --project-dir <ws>` | 導入直後の検証例（1 fail の実挙動込み） | 採取済み（doctor-output.txt） |
| 3 | `bun .agents/amadeus/tools/amadeus-utility.ts intent-birth --scope poc --arguments "Add a hello command to my CLI" --label "hello-command"` | first-workflow の Birth 例 | 採取済み（birth-output.txt） |
| 4 | `bun .agents/amadeus/tools/amadeus-orchestrate.ts next`（同 workspace） | run-stage directive の実物（JSON 抜粋） | code-generation で採取 |
| 5 | `bun .agents/amadeus/tools/amadeus-utility.ts status` / birth 後の doctor 再実行 | 現在地確認と fail 解消の実証 | doctor は採取済み（fail 0）。status は code-generation で採取 |

conductor（LLM）の会話部分は説明文とし、出力例は上記の決定論的コマンドに限る（questions Q1）。

## 検証の流れ

1. 丸コピー検査（NFR-2）: stage reviewer が上流対応章と突き合わせ、文単位の逐語一致（固有名・コマンド名・path を除く）0 件を判定。
2. リンク機械検査（NFR-5）: 新設 8 ファイル + 追記した既存文書 3 対（language-policy 対、README 対、extension-guide 対）で broken 0 件。
3. parity:check が docs/guide を検査対象にしないことを実測確認（engineer3 の留意）。
4. Codex 初見読者レビュー ≥ 1 回（NFR-4）。
5. validator + `npm run test:all`（C-3）。
