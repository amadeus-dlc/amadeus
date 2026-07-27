# Business Rules — docs-drift-repair (functional-design)

上流入力(consumes 全数): requirements.md (注: stage 宣言の他 consumes — unit-of-work / components / component-methods / services — は amadeus-document スコープが units-generation / application-design を SKIP するため設計上不在(engine directive でも expected-absent)。degrade 構成の documented fallback として requirements.md 単独を上流とする)

依拠箇所: BR-1 は requirements.md FR-3(Q1 裁定 = count-free 正準)の適用。BR-2 は FR-1b/FR-2a が本ステージへ明示委譲した表記形判断の裁定。BR-3〜BR-6 は FR-2b/FR-6c/FR-6d/FR-7/NFR-2 の実行規則化。

## BR-1: hook 件数は count-free(既決の適用)

散文中の hook 件数語(「twelve」「11個」等)は EN/JA とも全除去し、「all framework hooks / すべてのフレームワークフック」型の表現へ置換する。列挙は `docs/reference/06-hooks-and-tools{,.ja}.md` の roster 表だけが持ち、実装(hooks ディレクトリの実ファイル)からの転記で同期する。出典: requirements.md FR-3(Q1 ユーザー裁定)。

## BR-2: ハーネス件数の表記形(FD 委譲分の裁定)

**裁定: 「同一文書内に列挙が隣接する箇所は硬数値可、隣接列挙のない散文は count-free」の隣接列挙原則を採る。**

- `README.md:5` / `README.ja.md:5` のヘッドライン: **硬数値 seven / 7つ** — 製品の顔として具体数が必要であり、直下のハーネス表(:78-83)が列挙として隣接するため drift は表とセットで可視化される
- `README.md:67`("four shipped upstream to six"): **硬数値更新**(four shipped upstream → seven へ文意を保って更新)。同段落がハーネス名を列挙しており隣接列挙原則を満たす
- `docs/guide/19-plugins{,.ja}.md`: 見出し・本文とも**硬数値更新**(seven packaged / five self-install)— 本章は投影面そのものを主題とし、:150-156 の明示列挙が隣接する。列挙は BR-3 で配列と同期
- 隣接列挙のない散文でハーネス数に言及する箇所(FR-6 全域照合で検出された場合): **count-free** へ置換

代替案と棄却理由(トレードオフ分析): (a) 全面 count-free — README ヘッドラインの訴求力を損ない、章主題が「面の数」である 19-plugins では不自然な婉曲になるため棄却。(b) 全面硬数値 — 隣接列挙のない散文に数値を残すと次のハーネス追加で同型陳腐化が再発(今回のクラスタ A/B の発生機序そのもの)のため棄却。隣接列挙原則は「数値の可視な同期相手がある場合のみ数値を許す」ことで両者の失敗モードを避ける。

## BR-3: 列挙は実装配列からの転記

ハーネス・投影面・hook・agent の列挙はすべて実装の真実源(domain-entities.md エンティティ4)からの転記のみとし、記憶・既存 docs からの複製で書かない(cid:functional-design:inventory-from-grep-each-time / cid:requirements-analysis:numbers-from-command-output-only)。

## BR-4: EN/JA 同一変更同期

すべての修正・新規作成は EN/JA を同一コミット群(同一 PR)で同期する(project.md ALWAYS)。PR ごとに対訳ペア突き合わせ(EN のみ・JA のみの片側変更 = 0)を検証する(FR-7 受け入れ基準)。

## BR-5: 乖離レコードの閉包規則

乖離目録の各行は「修正済み(コミット参照)」または「Issue 起票済み(番号)」のいずれかで閉じる。残余(未処置)0 が build-and-test の完了条件(FR-6d 受け入れ基準)。目録の件数は列挙からの機械再計算で書く(cid:ledger-count-mechanical-recalc)。

## BR-6: 実装側欠陥の分離

docs 照合中に実装側の欠陥(コードのバグ・実装と設計の矛盾)を発見した場合、実装は修正せず GitHub Issue に起票して乖離レコードのクラス `impl-bug` で記録する(NFR-2、cid:bughunt-file-only)。起票前に closed 含む既存 Issue 検索を行う(cid:pre-filing-dup-and-branch-check)。
