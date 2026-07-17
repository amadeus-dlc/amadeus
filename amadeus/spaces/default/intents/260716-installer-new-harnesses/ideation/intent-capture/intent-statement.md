# Intent Statement — installer-new-harnesses(Issue #1048)

上流入力(consumes 全数): Issue #1048(起票 e3、クロスレビュー e1/e4 確認済み — 閉じ列挙台帳 verbatim+再現実測収録)、前 intent 260715-opencode-cursor-harness の RE 台帳・成果物(E-OC7 Q1=B 裁定による本 Issue の分離元)。

## 意図(What / Why)

**What**: installer(`packages/setup`)のハーネス閉じ列挙を opencode / cursor に対応させ、`install --harness opencode` / `--harness cursor` を有効化する。あわせて installer のユーザー可視契約(対応ハーネスの列挙全数性・公開物の実検証)をテスト可能に固定する。

**Why**: dist ツリー(dist/opencode/・dist/cursor/)と docs は #626 intent で着地済みだが、installer だけが canonical 4値の閉じ列挙(`HarnessName.all`)を持つため新ハーネスを弾く(再現実測: `Invalid --harness value: "opencode". Expected one of claude, codex, kiro, kiro-ide.` exit 2)。現状の回避策は手動配置のみで、利用者導線(README「Pick your harness」の install コマンド列)が両ハーネスだけ欠ける非対称が残っている。

## 成功の姿(テスト可能)

- `install --harness opencode` / `--harness cursor` が正常系で完走する(実 dist の配置検証まで)
- 対象5ファイル(harness.ts / engine-layout.ts / reporter.ts / setup-harness.test.ts / setup-harness-parse.test.ts)の列挙が6値で一致し、全数性がテストで固定される
- `npm pack --dry-run` 等の実ツール検証(requirements-analysis:c4 の既決)が新ハーネス分を含めて green

## 非目標

- promote:self の新ハーネス対応(dogfood 判断 — 別議論)
- opencode hooks(#1049)・installer 以外の閉じ列挙(runtime 2/migrate 1 の扱いは requirements の付随判断で確定)

## 由来・トレーサビリティ

Issue #626 → E-OC7 Q1=B(installer 分離、全会一致)→ Issue #1048(AC-6a 留保 i/ii 充足済み)→ 本 intent。
