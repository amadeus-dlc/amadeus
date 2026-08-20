# Requirements Analysis — 質問と裁定

Intent: 260820-fmc-drift-batch / Depth: Standard(予算 最大8問、本ステージは4問)
回答モード: Intent Autonomy `full` — `amadeus-bolt decide-question` 梯子で裁定。
承認エビデンス: full autonomy grant は 2026-08-20T07:18:02Z にユーザー承認済み(grant_id intent-grant-79f28345c4f20469c2ec87c6a12aeffa)。以下の各 [Answer] は grant 下の AUTO_DECIDED 裁定。

前提(再質問しない決定事項): FR-010 が replace 意味論を規定するか否かの裁定は、ユーザーが本バッチ(選択肢1 = #2289 replace-by-name 実装を含む)を実 HUMAN_TURN で承認した時点で「追加する」と確定済み。issue-evidence.md のクロスレビュー確定事実は再導出しない。

質問の導出元(上流入力): 確定境界と依存は intent-statement.md / scope-document.md、機構の現行形は codekb の business-overview.md / architecture.md / code-structure.md(RE 差分リフレッシュ節、observed e86fbe125)から採り、issue-evidence.md の確定事実で残る裁定点だけを質問化した。

## Q1: #2289 — provenance 不在の既存エントリを置換するとき、authoringProvenance の帰属はどうするか?(RE 発見の新裁定点 — #3263 が draft に provenance を必須化、既存4モデル中3モデルは ABSENT)

- A. 置換後エントリは draft が運ぶ新しい authoringProvenance を持つ(last-writer-wins)。置換対象の provenance 不在/存在は置換可否に影響しない。旧 provenance の保存・マージはしない
- B. provenance 不在の既存エントリは置換禁止(先に provenance を backfill する別手順を要求)
- C. 旧 provenance があれば history 配列として保存する
- X. Other (please specify)

[Answer]: A — model-map の8 body artifacts と同じく「最新の登録が正本」の原則(スキーマ上 optional のまま、draft 側必須は #3263 契約で既に担保)。B は退役済みモデルの改訂を不能にし #2289 の目的と矛盾、C は要求のない履歴機構の新設(P5 違反、履歴は git が持つ)。(AUTO_DECIDED auto-decision-1186e4741bd2910bdc38d023a47b3a8c, 2026-08-20T08:15:54Z)

## Q2: #2929 — 境界拡張の粒度は?

- A. 一般形: `plugins/<kebab>/tools/<kebab>.ts`(小文字 kebab-case、全 plugin 共通の1タプル追加)。セルフインストール投影(`.claude/plugins/...`)は境界対象外のまま(正本 `plugins/` のみ)
- B. plugin 単位の宣言的 opt-in(plugin.json に境界宣言を追加)
- X. Other (please specify)

[Answer]: A — Issue 本文が名指す形で、#2890 の前例(タプル1件追加)に一致し既存機構のみで閉じる。B は新しい宣言面 + 消費コードの新設で規模が数倍になり、現時点で opt-in を要する plugin が存在しない(必要になった時点で contract 追加を別 intent で裁定)。(AUTO_DECIDED auto-decision-1610cb88c4e5cde5100e3fe2c9bf267c, 2026-08-20T08:15:54Z)

## Q3: #2929 — validator / loader / sensor の3面の述語統一の方式は?

- A. `IMPLEMENTATION_PATHS` を単一の正本(共有モジュールへ移設・export)とし、loader の containment 判定はそこから導出する。sensor manifest の `matches` glob は手書きのまま、glob と境界定義の整合を検査する drift テストを新設して同期を機械化する
- B. 3面それぞれを個別に広げる(統一なし)
- C. sensor manifest も生成物化する(generator 新設)
- X. Other (please specify)

[Answer]: A — cid:code-generation:cg2-agreeing-predicate-drift の是正原則(全複製箇所を1定義へ集約)に整合。B は今回のバグクラス(validator/loader 乖離)を再生産する。C は manifest 生成という新機構で P5 違反(md manifest は宣言面であり、drift テストで十分に fail-closed にできる)。(AUTO_DECIDED auto-decision-1c38d776356ad155bdc458818df8893f, 2026-08-20T08:15:54Z)

## Q4: #3186 — 欠陥再発トリガの入力ソースは何を正とするか?

- A. intent の issue-evidence.md(bug Issue の本文・クロスレビューが名指す実装パス)と governed entries(model-map の implPath)の交差。交差があれば適用性判定は authoring 評価(revise-model 検討)を強制起動する — 判定入力は record 内の実在ファイルに限定し、GitHub への実行時照会は行わない
- B. 監査ログの BOLT_FAILED / ERROR_LOGGED イベント列との交差
- C. conductor の自由裁量(プロンプト指示のみ)
- X. Other (please specify)

[Answer]: A — issue-evidence は #3181 で確立済みの機械可読な一次記録で、self-fix/self-feature の issue-first フローに常在する。B は失敗イベントと「欠陥の所在実装」の対応付けが間接的で偽陽性が多い。C は機械化されない規範(指令ループ外)となり #3186 の目的(無音乖離の構造的検出)を満たさない。語彙 drift 検出の腕(FR-3186-1 系)は model-map の vocabulary(namedInvariants / traceStateVariables)と対象実装の照合を正とする — 詳細述語は functional-design で確定。(AUTO_DECIDED auto-decision-5cc8b94765ee2f08078d2feef542aefc, 2026-08-20T08:15:54Z)
