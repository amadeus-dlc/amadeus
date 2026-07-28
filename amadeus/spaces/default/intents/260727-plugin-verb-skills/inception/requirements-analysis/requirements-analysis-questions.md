# Requirements Analysis 質問 — 260727-plugin-verb-skills

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

> E-OC1 選挙不要判定: ソロモード(AMADEUS_OPERATING_MODE 未設定)につき選挙は適用外。根拠種別 = 運用形態。以下はユーザー直接裁定で回答する。
> 既決照合: スコープ(#1597 フル+#1598)は intent-capture 裁定済み。命名・出力様式・委譲形は既存パターン一意(migrate 委譲様式・mirror スキル様式・判別 union)のため質問しない。以下2問は「既存パターンが競合する」または「既存に答えがない新規の利用者可視契約」のみ。

## Q1: `amadeus-plugin` スキルの投影範囲(既存パターンが競合 — スコープ増減ではなく配布面の選択)

RE 実測: amadeus-mirror = 全7ハーネス面へ投影 / amadeus-election = claude+codex+kimi の3面のみ。manifest 側の明示選択であり自動でない。

- A: 全7面へ投影(mirror 様式)— plugin CLI 自体が core/tools で全ハーネスに実在するため、スキル導線も全面に揃える
- B: claude のみ — スキル機構のネイティブ度が最も高い面に限定し、他ハーネスは `/amadeus plugin` ハンドラを唯一の入口とする
- C: claude+codex+kimi の3面(election 様式)
- X: その他(自由記述)

[Answer]: A — 全7面へ投影(ユーザー直接裁定、mirror 様式)

## Q2: `install <path>` の同名 plugin 既存時の挙動(新規の利用者可視契約 — 既存に直接の答えなし)

staging(`<harness-dir>/.amadeus-plugin-src/<name>/`)に同名 plugin が既に存在する場合の契約。R3(部分失敗の冪等再試行)と両立させる必要がある。

- A: 内容一致なら続行(冪等再試行を許容)、内容不一致なら loud に失敗し `--force` で置換 — 無音上書きを作らない fail-closed 形
- B: 常に上書き(最新のコピーが勝つ)— 手数は最小だが無音置換のリスク
- C: 常に失敗(先に `drop` を要求)— 最も保守的だが再試行も塞ぐ
- X: その他(自由記述)

[Answer]: A — 内容一致なら続行(冪等再試行)、不一致は loud 失敗+`--force` で置換(ユーザー直接裁定、fail-closed 形)

## 裁定の記録

- Q1 = A(スキルは全7面投影、mirror 様式)、Q2 = A(install 衝突は一致続行/不一致 fail+`--force`)。
- ユーザー承認: 2026-07-27T15:47:53Z — AskUserQuestion への直接回答(両問とも推奨案 A を選択)
