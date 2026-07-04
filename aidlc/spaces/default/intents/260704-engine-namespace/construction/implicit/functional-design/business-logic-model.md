# Business Logic Model — engine-namespace 改名の処理設計

上流要求は `../../../inception/requirements-analysis/requirements.md`（R001〜R008）である。
改名対応表は `domain-entities.md` を正準とする。

## 処理フロー（実行順序）

依存関係から、次の順序で実行する。

1. **RED — parity eval の拡張（R007 前半）**
   `dev-scripts/evals/parity/check.ts` に `nameMappings` 対応表 fixture（engine-dir、tool、common-dir の各 kind）を追加し、現行実装で fail することを確認する。
2. **parity-check の一般化（R007 後半）**
   `parity-map.json` に `nameMappings` 配列を導入し、`parity-check.ts` の path 解決（`mapSubAgentPath` 相当）と内容正規化（`normalizeSubAgentContent` 相当）を対応表駆動へ書き換える。既存の `subAgentNameMapping` を `kind: sub-agent` の行として吸収する。**このとき `checkRulesAidlcMd` にも同じ内容正規化を通す（現行実装は生バイト hash 比較であり、正規化なしでは改名後に N001 を満たせない — 実装確認済みの非対称性）。** このステップはメカニズムと fixture eval の GREEN 化までとし、実データ行の投入は Step 6 で行う。
3. **改名の実行（R001〜R005）**
   `git mv` で、tools 26 → hooks 11 → `aidlc-common/` → `knowledge/aidlc-shared/` → `rules/aidlc.md` → 最後に `.agents/aidlc/` → `.agents/amadeus/` の順に改名する（親ディレクトリを最後にすると mv の path 記述が単純になる。逆順でもよいが、一括で行い中間状態でコミットしない）。
4. **参照の一括更新（R006）**
   対応表のトークンを disambiguation 規則（前節）に従って repo 全体で置換する（許容例外 3 箇所を除く）。engine .ts の import、skills、`.agents/rules/**`、docs（`CONTEXT.md` を含む）、`dev-scripts/**`、`package.json`、`CLAUDE.md`、`AMADEUS.md`、`.claude/settings.json`（hook コマンド参照と `permissions.allow` の `.agents/aidlc/tools/*` などのハードコードパスの両方）を含む。
5. **symlink の張り替え（R001、グリリング Q1 回答）**
   `.claude/` 配下の symlink をリンク先 `.agents/amadeus/` へ張り替え、`aidlc-common` は symlink 名も `amadeus-common` へ改名する。`claude-wiring:check` で整合を確認する。
6. **`parity-map.json` の relocations 更新と実データ投入（R001、R007）**
   `localPath` を `.agents/amadeus/...` へ更新し、`rulesAidlcMd` の解決先を `rules/amadeus.md` へ mapping する。**あわせて `nameMappings` に実データ行（tools 26 + hooks 11 + engine-dir + common-dir + shared-dir + rules-file + 吸収した sub-agent、計 40 行超）を投入する。** 実データ投入を Step 3 の改名より後に置くのは、mapping が改名済み path を指すためである（検証は Step 8 で一括して行う）。
7. **昇格同期（R008）**
   参照更新した skill を `promote-skill.ts --replace` で昇格する。
8. **検証（N001〜N005）**
   `parity:check`、`test:all`、`AmadeusValidator`、N005 の残存 grep（0 件）を実行し記録する。

## トークン照合の disambiguation 規則（重要）

改名対象トークンと改名禁止語彙の衝突を防ぐため、対応表の各行は kind に応じた照合規則を持つ。

| kind | 照合規則 | 例 |
|---|---|---|
| tool / hook | **拡張子込みの完全一致に限る**（`aidlc-state.ts` → `amadeus-state.ts`）。bare token（`aidlc-state`）では絶対に照合しない | `aidlc-state.ts` は改名するが、同じソース内の `aidlc-state.md`（v2 成果物名）は無傷で残す |
| engine-dir | path 接頭辞 `.agents/aidlc/` の完全一致（`.agents/` を含む形でのみ照合）。bare `aidlc/`（workspace ディレクトリ）には照合しない | `.agents/aidlc/tools` → `.agents/amadeus/tools`。`aidlc/spaces/...` は無傷 |
| common-dir / shared-dir | path セグメントとしての一致（前後がセグメント境界または文字列端）。`aidlc-common`、`aidlc-shared` に部分文字列衝突は存在しないことを実測済み | `.claude/aidlc-common/...`、`aidlc-common/protocols/...` |
| rules-file | `rules/aidlc.md` の path 一致 | `.agents/rules/aidlc.md`、`.claude/rules/aidlc.md` |

明示的な改名禁止語彙（対応表に決して載せない）: `aidlc-state.md`、`intents.json`、audit イベント語彙、bare の `aidlc/`（workspace）、`aidlc-docs`（tool 内の worktree 用ディレクトリ名）。
`CONTEXT.md` は R006 の対象に含めるが、上記規則により改名されるのは対応表トークン（拡張子込み tool 名、`.agents/aidlc/` path など）だけであり、「Aidlc State」などの v2 語彙の記述は無傷で残る。

## 正規化アルゴリズム（対応表駆動）

```
mapPath(upstreamPath):
  for m in nameMappings:            # 最長一致優先で適用
    upstreamPath = upstreamPath.replaceToken(m.prefix → m.replacement)
  return relocate(upstreamPath)      # relocations で .agents/amadeus/ 配下へ

normalizeContent(localContent):
  for m in nameMappings:            # 逆方向（replacement → prefix）
    localContent = localContent.replaceToken(m.replacement → m.prefix)
  return localContent                # 上流 hash と比較可能な形に戻す
```

- トークン置換は語境界を尊重する（`amadeus-common` を置換するとき `amadeus-commonX` に誤マッチしない）。
- 逆方向正規化の衝突（新名が別の旧名の部分文字列になるケース）は対応表に存在しないことを eval fixture で担保する。

## データフロー

改名は一方向（旧名 → 新名）で、実行後の repo に旧名は許容例外 3 箇所（`domain-entities.md` の AllowedException）にしか存在しない。
上流 parity の照合時だけ、内容正規化が新名 → 旧名の逆変換を行い、上流 hash との比較を成立させる。

## エラー処理

- `git mv` 後に参照更新を失敗した場合も、途中状態でコミットせず、検証（Step 8）がすべて pass するまで 1 コミットにまとめない状態を保つ。
- 検証 fail 時は該当ステップへ戻って修正し、Step 8 を再実行する。

## Review

**Verdict: READY**

再レビュー（iteration 2）。前回指摘した 4 件すべてに対する修正を、実リポジトリ（`.agents/aidlc/tools/*.ts`、`.agents/aidlc/hooks/*.ts`、`.claude/settings.json`、`CONTEXT.md`、`dev-scripts/parity-check.ts`）および `business-rules.md` との突き合わせで再検証した。

- [解消確認] トークン照合の disambiguation 規則が新設された。tool/hook は拡張子込みの完全一致に限定し bare token（`aidlc-state`）では照合しないと明記され、改名禁止語彙（`aidlc-state.md`、`intents.json`、audit イベント語彙、bare `aidlc/`、`aidlc-docs`）が明示列挙されたことで、`aidlc-state.ts`（改名対象）と `aidlc-state.md`（v2 成果物、N004 で改名禁止）の衝突が構造的に回避される。`business-rules.md`「対応表の整合規則」にも同じ規則がミラーされており、両ドキュメント間で矛盾がない。`.agents/aidlc/tools/aidlc-state.ts` 内の `aidlc-state.md` へのリテラル参照箇所を再確認したが、この規則（tool/hook は `.ts` 拡張子込み完全一致のみ）であれば拾われないことを確認した。common-dir/shared-dir の「部分文字列衝突は存在しない」という主張も `aidlc-common`/`aidlc-shared` の前後境界を repo 全体で grep して裏取りし、実際に衝突がないことを確認した。CONTEXT.md は R006 の対象に含めつつ、対応表トークンだけが置換対象であるため「Aidlc State」等の v2 語彙は無傷で残るという説明も、CONTEXT.md の実際の `aidlc` 言及（すべて workspace/v2 成果物文脈）と整合する。requirements.md の N005 grep パターンも元々 `\.ts` 拡張子境界で tool/hook 名を照合しており、今回の disambiguation 規則と齟齬がない。
- [解消確認] Step 2 に `checkRulesAidlcMd` も同じ内容正規化を通す旨が明記され、現行実装の非対称性（`checkEngineFiles` は正規化を適用、`checkRulesAidlcMd` は生バイト比較）が解消されるようになった。N001 達成の障害だった箇所である。
- [解消確認] Step 6 が `nameMappings` の実データ投入（tools 26 + hooks 11 + engine-dir/common-dir/shared-dir/rules-file、計 40 行超）を明示的に担い、Step 3（改名）の後に置く理由（mapping が改名済み path を指すため）も記載された。Step 2 は「メカニズムと fixture eval の GREEN 化まで」と役割が明確化され、実データ投入の欠落リスクが解消された。
- [解消確認] Step 4 に `.claude/settings.json` の `permissions.allow` にあるハードコードパス（`.agents/aidlc/tools/*`）が hook コマンド参照と並んで明示された。

これで、rename 対応表の完全性、処理順序の依存関係整合性、parity 機構の一般化と実装の整合、トークン衝突の disambiguation、N005/N001 の達成可能性のいずれにも、実装前に解消すべき未決事項は残っていない。developer はこの文書と `domain-entities.md`・`business-rules.md` だけで、追加のアーキテクチャ判断を仰がずに実装に着手できる。
