# Functional Design 質問記録 — `semi-docs-revision`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— 本 Unit は非コード(kind: spec)の文書改訂であり、全設計分岐が承認済み上流(`requirements.md` FR-DOC-1/FR-DOC-2/FR-LAD-5/FR-LAD-6/FR-ADV-5、`components.md` C18、codekb `code-structure.md` 現在節の行分類)から一意に導出できる。C18 が functional-design へ委譲した唯一の未実測(docs 22 ファイルの1ファイルあたり改訂行数)は、本ステージの grep 実測で確定した(D3)。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(projection.mode=full、events=afterMode|grant)の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

測定 ref: worktree HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01`(以下の grep・行番号実測はすべてこの断面。requirements.md の引用行番号と worktree 実測が一致することを D2 で確認済み)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | 「旧定義記述」の判定述語 | **「semi の下で質問(または phase 内ゲート以外の一切)が人間所有のまま残る、と主張する記述」**を改訂対象(R)とする。mode 名の列挙(`none\|semi\|full`)・walking skeleton の人間待ち・quality repair の semi/full 共通記述は旧定義に該当しない | `requirements.md` FR-DOC-1 受け入れ基準(「旧定義(phase 内ステージゲートのみ自動、質問は人間)のまま述べる記述が 0 件」)の逐語適用 |
| D2 | `stage-protocol.md` 9 行の処遇 | FR-DOC-2 + codekb `code-structure.md` 現在節の行分類表を逐語採用: `:33` / `:131` 直接反転、`:105` / `:808` 保存(diff 非出現)、`:125` 起動フラグ同期、`:118` 表示文言(label 行自体は不変・隣接記述の意味論を確認)、`:133` / `:442` / `:796` 保存・参照のみ。worktree 実測 `grep -n -i "semi"` → 9 hit で行番号が requirements の引用と**全一致**(codekb の「+2 シフト」は observed→requirements 転記時に解消済み) | FR-DOC-2 / codekb 分類表 / worktree grep 実測 |
| D3 | docs 22 ファイルの行単位分類(C18 の ⚠ 解消) | `grep -rn "semi" docs/` 実測 **64 行**(en 32 + ja 32)を R(改訂)/ P(保存)/ U(不変)へ全数分類: **R = 13 行**(en 6 + ja 7)、**P = 12 行**(en 6 + ja 6)、**U = 39 行**(en 20 + ja 19)。全数表は business-rules.md §BR-6/§BR-7 | FR-DOC-1 / D1 述語の全数適用(grep 出力からの転記 — `cid:functional-design:inventory-from-grep-each-time`) |
| D4 | 第2キー走査(token `semi` 非含有の旧定義行) | `human-owned` / `only .* full` / `full.*だけ` 系の第2キーで **追加 4 行**を検出: en `06-hooks-and-tools.md:48`(summary 行「suppressed under autonomous Construction」)/ `:259`(case 6「suppressed only under Intent autonomy \`full\`」)、ja `:46` / `:257` 相当部。en `:275` / ja `:273`(会話的ターンの carve-out = full 限定)は FR-STOP-1 の `:716` full 限定維持に対応するため**保存** | `cid:application-design:dual-key-consumer-inventory` の執行 / FR-STOP-1 呼び出し点別扱い表(`:422` のみ semi へ開く) |
| D5 | `:125` の同期内容 | `--autonomy` 起動宣言(`/amadeus --autonomy none\|semi\|full`)を mode 記録手段の一つとして追記する。ただし (a) 初回宣言(`modeProvenance.kind === "system-default"`)のみ受理、(b) `full` は grant 儀式必須で fail-closed、(c) 既存 `amadeus-bolt set-autonomy` 経路は正本のまま — の3点を FR-CLI-2/3/4 から転記し、起動フラグを set-autonomy の代替と読める記述にしない | FR-DOC-2(`:125` は起動フラグ追加に伴い同期)+ FR-CLI-1〜4 |
| D6 | `12-state-machine.md:189` / ja `:189` の扱い | **U(不変)**。「semi は grant を発行しない」は新意味論でも真(FR-AUTH-3)、「phase 内 gate 省略用途を置き換える」は semi が置き換える対象(旧ラダー)の記述であり D1 述語(質問の人間所有の主張)に該当しない。実装時に新意味論(質問の無人解決)へ言及を広げるのは裁量だが義務ではない | D1 述語の適用 / FR-AUTH-3 |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D6 一意導出。C18 の ⚠「docs 改訂行数の未実測」は D3 で解消)
- 後続へ委ねる判断: 改訂後の具体文面の起草(business-rules.md の「述べるべき内容要素」契約の範囲内で code-generation が起草)、実装時の棚卸し再実行(`cid:functional-design:inventory-from-grep-each-time` — BR-9)
- 上流との矛盾: **なし**(D2 は FR-DOC-2 と codekb 分類の逐語採用。D4 の追加 4 行は FR-DOC-1 の 22 ファイル集合の**内側**にあり、対象ファイル集合を拡げない)
