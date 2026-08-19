# Business Rules — docs-sync(functional-design)

上流入力(consumes 全数): requirements.md(FR/NFR/制約を検証可能規則へ写像)。unit-of-work / components / component-methods / services は scope `self-document` の SKIP により設計上不在(consumes_absent expected: true — 内容を発明しない)。

## BR-1: 隣接列挙原則(FR-1、裁定 Q1=B)

件数語は同一文書内の隣接列挙(表・一覧)と同期できる場合のみ実値を許し、それ以外は count-free 表現とする。凍結記録(BR-4 対象)内の件数語は触らない。違反判定: 修正対象面(docs/ + README*.md、codekb・record 除外)への誤件数語 grep が 0 件。

## BR-2: EN/JA 同一変更同期(NFR-1)

1 つの修正・新規作成は EN/JA 両面を同一 PR で同期する。片側のみの誤り(A-11)は当該側のみ修正してよいが、修正後の両面の意味内容は一致すること。新規文書(F-8、新章、self-* 節)は EN/JA 対で作成し、H2 節構成を一致させる(`grep -c '^## '` 一致)。

## BR-3: 実測転記原則(NFR-3)

docs へ書き込む数値・パス・コマンド・file:line は、書込直前に実行したコマンドの実出力からのみ転記する。RE 目録の値も書込時に再実測して確定する(base 前進で陳腐化しうるため)。派生値(合計等)は算出式を併記する。

## BR-4: 凍結記録の不変条件(FR-4、裁定 Q3=B)

`docs/research/upstream-sync/**` は内容バイト不変。許される変更は冒頭 10 行以内への凍結注記(3 要素: 凍結宣言・調査時点 ref/日付・現況非反映)の追記のみ。検証: `git diff` の hunk が注記行のみであること。`docs/amadeus-files.md` は凍結対象ではなく現況更新+索引リンクの対象。

## BR-5: 実装コード不可侵(制約、裁定 Q5=B)

`packages/` / `scripts/` / `tests/` / `.github/` を変更しない。実装欠陥の発見は Issue-first 起票(重複検索 → 種別 1 + P 1 ラベル → 共通契約 6 節)で処理し、Issue 番号を成果物へ記録する。

## BR-6: 検証はローカルを正とする(NFR-2)

docs-only PR は CI の `changes` job により `full=false` となりテスト層が skip される(G-1 実測)。よって受け入れ判定は次のローカル実行の exit code を正とする: docs 消費ガード 7 本 + t68、`bun run typecheck`、`bun run lint`、および FR 別 grep 述語の全数。t414 は実 corpus を読まないため検証対象に数えない(G-2)。

## BR-7: 欠落文書の充足条件(FR-5、裁定 Q4=A)

F-1〜F-10 の全件を本 intent で充足する。各 F 項目の合否は requirements.md FR-5 受け入れ基準の grep 述語で判定し、解説実体(目的・使い方・関連機構を含む節)を要求する(1 行のイベント表記載は不可)。範囲の縮小は無申告スコープ縮小として禁止。

## BR-8: 配置規則(FD-Q1=B / FD-Q2=A)

- self-* 解説は `05-scopes-and-depth.md` 内の専用 H2 節(新規ファイルなし)。
- ツール文書は既存章への節追加を既定とし、新章は Intent autonomy 系(F-4/F-5/F-6)1 本のみ。
- 新章の章番号は PR 発行直前とマージ直前に `git ls-tree origin/main docs/reference/` の実測で確定・再確認し、衝突時は自側が改番する(fail-closed: 実測不能なら発行を止める)。
