# Domain Entities — docs-sync(functional-design)

上流入力(consumes 全数): requirements.md(FR の対象目録をエンティティ化)。unit-of-work / components / component-methods / services は scope `self-document` の SKIP により設計上不在 — codekb(`code-quality-assessment.md` § docs 品質)を de-facto 設計入力とする。

## エンティティ一覧

### Divergence(乖離項目)

RE 目録の 1 行に対応する修正作業の最小単位。

- 属性: `id`(A-1〜G-2 の目録 ID)、`class`(A 件数語 / B 配布境界 / C スコープ語彙 / D 実体誤り / E 対訳ドリフト / F 欠落 / G ガード盲点)、`severity`(Critical / High / Medium / Low)、`locations`(file:line の集合、EN/JA 両面)、`current`(現記述)、`measured`(実測値)、`fix_strategy`(実値更新 / count-free 置換 / パス是正 / 節追加 / 新規作成 / 注記追記 / Issue 起票)
- ライフサイクル: `listed`(RE 目録)→ `fixed`(編集適用)→ `verified`(grep/ローカルガード green)→ `shipped`(PR マージ)。クラス G のみ `listed → filed`(Issue 番号付与)で終端。
- 不変条件: `verified` へ遷移するには BR-3(実測転記)を満たす修正であること。

### DocumentPair(EN/JA 対訳対)

- 属性: `en_path`、`ja_path`(不在なら欠落 = F-8 型)、`h2_count_en/ja`(節構成同期の判定値)
- 不変条件: 本 intent が触った対はすべて意味内容一致(BR-2)。修正は同一 PR 内。

### FrozenRecord(凍結記録)

- 対象: `docs/research/upstream-sync/**` の各レポート
- 属性: `freeze_notice`(3 要素: 宣言・時点 ref・現況非反映)、`content_digest`(注記行以外の不変性)
- 不変条件: BR-4。`git diff` が注記行のみを示すこと。

### NewDocument(新規文書)

- 実体: self-* 節(05 章内、FD-Q2=A)、Intent autonomy 新章(reference 24 番台、FD-Q1=B、F-4/F-5/F-6)、F-2/F-3/F-7 の既存章節、live-e2e.ja.md(F-8)
- 属性: `placement`(章/節)、`chapter_number`(新章のみ — PR 直前実測で確定、shared-ledger 衝突時は自側改番)、`identifiers`(FR-5 受け入れ基準の grep 識別子)
- 不変条件: EN/JA 対で作成(BR-2)、内容は実装実測から転記(BR-3)、解説実体を持つ(BR-7)。

### GuardRun(ローカル検証実行)

- 属性: `command`(t174 / t132 / t48 / t52 / t287 / t291 / t-pi-docs-contract / t68 / typecheck / lint / FR 別 grep 述語)、`exit_code`、`output_ref`(成果物への転記先)
- 不変条件: BR-6 — 全 GuardRun の exit 0 が build-and-test の READY 条件。実行記録なき green 主張は検証劇場として禁止。

### FiledIssue(起票 Issue)

- 対象: FR-6 の 3 系統(G-2 未配線、バッジ同期 EN 限定、G-1 CI skip 経路)
- 属性: `issue_number`、`type`(bug / enhancement / documentation — 完了条件判定)、`priority`、`labels`
- 不変条件: 起票前重複検索済み、共通契約 6 節充足、番号が code-summary / build-test-results へ記録される。

## エンティティ関係

```
Divergence (32+10+2) ──多対1──> DocumentPair(修正の適用面)
Divergence(class F) ──1対1──> NewDocument
Divergence(class G) ──1対1──> FiledIssue
NewDocument ──多対1──> DocumentPair(EN/JA 対で作成)
DocumentPair / FrozenRecord ──多対多──> GuardRun(検証対象)
```

テキストフォールバック: 乖離項目は対訳対へ適用され、欠落クラスは新規文書を、ガード盲点クラスは Issue を生む。すべての適用結果を GuardRun が検証する。
