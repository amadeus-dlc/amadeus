# Requirements Analysis — 明確化質問

**Intent**: 260810-grilling-frontier-resync / **Stage**: requirements-analysis (2.3) / **Depth**: Standard

> 前提: #2785(REFRAME 反映済み)の採用方針・intent-capture / scope-definition の裁定・RE 所見(re-scans/260810-grilling-frontier-resync.md)を既決として消費する。以下は #2785 完了条件8 が要件段へ委譲した設計裁定3点のみ(裁定(d) #2683 調停は intent-capture Q1 で裁定済み)。
>
> 上流入力の消費: 委譲3点の出典は `intent-statement.md`(Initial Scope Signal の「要件段で裁定する未決4点」)であり、質問の絞り込み範囲は `scope-document.md` の能力目録(全件 SETTLED — 境界の再質問はしない)に従う。Q1 の閉語彙・センサー所在の確認には codekb `code-structure.md`(tools/protocols の配置)を、Q1/Q2 の変更面が core 中立層に属することの確認には codekb `architecture.md`(core/harness 境界)を、grilling が全ハーネス共通配布物であるという影響前提には codekb `business-overview.md`(ソースコピー配布モデル)をそれぞれ参照した。

## Q1. Free の語彙上の位置づけ(#2785 完了条件8(a))

RE 所見: `VALID_DEPTH_VALUES = ["Minimal","Standard","Comprehensive"]`(amadeus-directive.ts:62、「The wire carries only these Capitalized forms」)は closed 語彙で、question-budget センサーは未知 depth を `no-depth, pass:true` で無音通過させる(fail-open 実測済み)。

- **A. standalone 専用パラメータとする(推奨)** — depth の機械語彙(3値)は不変。`/amadeus-grilling` スキルが独自のレベル引数(Minimal/Standard/Comprehensive/**Free**)を持ち、workflow の depth とは別物と明示する。機械契約の変更面が最小(VALID_DEPTH_VALUES・state・directive 無変更)で、#2785 の「Free は workflow depth に現れない」とも整合。センサーの fail-open は「未知 depth 値は loud warning」の封鎖を別途足す
- B. depth の第4値として VALID_DEPTH_VALUES へ追加する — wire・state・センサー・§8 の全面へ Free が波及(workflow で Free を選べてしまう面の封鎖が別途必要)
- C. その他(X)

[Answer]: A — Free は standalone 専用パラメータ。VALID_DEPTH_VALUES(3値)は不変、スキルが独自レベル引数(M/S/C/Free)を持つ。センサーの未知 depth fail-open は loud 警告で封鎖。ユーザー承認: 2026-08-10T04:43:11Z(Guide me 構造化質問への直接回答)

## Q2. 「depth は質問数の上限でない」と §8 Depth-Level Contract の一意化(#2785 完了条件8(b))

RE 所見: §8(stage-protocol.md:726-746)は「contract, not illustration」の MUST だが、:729 は「exceeding a ceiling requires a **recorded justification** at the stage's approval gate」— 記録付き超過を既に許す条項を持つ(D6 の一律禁止と非対称)。

- **A. Grill me を §8 の recorded-justification 条項に接続する(推奨)** — §8 の数値上限は他モード(Guide me 等)に不変のまま維持。Grill me モードは depth を枝刈り閾値として消費し、質問総数が数値上限を超えるときは「frontier 駆動による超過」を質問ファイルへ機械的に記録する(= :729 の recorded justification の常設形)。回路遮断器(目安×3で明示開示停止)が超過の上界。§8 へは「Grill me は枝刈り閾値意味論に従う」の1段落を追記。question-budget センサーは grilling セッションの questions ファイル(mode マーカーで判別)で数値検査を justification 検査(超過記録+刈りノード列挙の存在)へ切り替える
- B. §8 自体から数値上限を撤去し全モード枝刈り閾値化する — #2683 L2 の全面再定義(intent-capture Q1 裁定の Out 境界と矛盾)
- C. Grill me を §8 の適用除外として明記するだけ(センサーは grilling questions を単純 skip)
- D. その他(X)

[Answer]: A — Grill me を §8 :729 の recorded-justification 条項へ接続。数値上限は他モード不変、grilling は枝刈り閾値意味論+超過の機械記録+回路遮断器(目安×3)を上界とする。ユーザー承認: 2026-08-10T04:43:11Z(Guide me 構造化質問への直接回答)

## Q3. semi 自律下の Grill me 除外契約(#2785 完了条件8(c))

RE 所見: 「semi 下では質問は decide-question 経由」(stage-protocol.md:137)は確定だが、モード選択から Grill me を除外する規則は現行に存在しない — grilling は定義上 human-in-the-loop で、decide-question 梯子が Grill me を選ぶと自動裁定がラウンドを回す自己矛盾になる。

- **A. 明文除外を追加する(推奨)** — stage-protocol §3 に「semi/full 自律が有効な間、対話モード選択肢に Grill me を含めない(grilling は human-in-the-loop 前提)」の1行を追加し、テストで固定する。低コストで #2785 の「human-in-the-loop だから安全」前提を契約化できる
- B. 追加しない — 推論のまま残す(モード選択も decide-question に委ね、実運用で問題が出たら対処)
- C. その他(X)

[Answer]: A — semi/full 自律中はモード選択肢から Grill me を除外する明文1行を stage-protocol §3 へ追加しテストで固定。ユーザー承認: 2026-08-10T04:43:11Z(Guide me 構造化質問への直接回答)
