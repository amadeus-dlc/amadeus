# Requirements Analysis — 明確化質問(gate-mechanics-batch)

> bugfix スコープ。対象2件はチーム2名クロスレビューで CONFIRMED 済み(#685: correction 付き、#670: 訂正なし)。修正方向は既に確定しているため、requirements 段階の未決設計判断は限定的。既決事項は選挙・質問の対象にせず正準表現をそのまま適用する(team.md no-election-for-decided-norms)。以下は「requirements で固定すべき残論点」を記録する。

## Q1. #685 新イベント型の形状(承認/却下の判別)

却下委任のイベント型を、承認と独立の型にするか判別フィールド付き統合型にするか。

- A. `DELEGATED_REJECTION` を新設(承認 `DELEGATED_APPROVAL` と対称の独立型)。判別が型名で自明・grep 容易・registry 同期も1エントリ追加で明快
- B. `DELEGATED_GATE_RESOLUTION`(単一型 + `Resolution: approved|rejected` 判別フィールド)。将来の解決種別拡張に開くが、既存 `DELEGATED_APPROVAL` との二重表現(承認が2型で表せる)を生む
- C. Other

[Answer]: A(design ステージで最終確定するが、requirements の既定方向は A)。根拠: #685 クロスレビュー correction が「DELEGATED_APPROVAL 流用は意味破壊、delegate-rejection が正道」と明示。既存 `DELEGATED_APPROVAL` を温存したまま対称の独立型を足す方が、承認委任の意味を変えず(surgical)、FR-1.4 の混用不可も型で自然に保証される。B は承認の二重表現を生み既存契約に触れる。→ **design で A を第一候補として詳細化**。

## Q2. #685 検証関数の共有度

`verifyDelegatedApproval`(#671)と却下側 verify の実装をどこまで共有するか。

- A. 発行元シャードの実 HUMAN_TURN 裏取りロジックは共通ヘルパーに括り出し、承認/却下の verify は薄い呼び分けにする(意図の重複排除)
- B. 却下側に独立の `verifyDelegatedRejection` を複製する
- C. Other

[Answer]: A(design で確定)。根拠: 承認・却下の「発行元シャードの HUMAN_TURN を裏取り」という**検証意図は同一**(意図ベースの重複排除)。イベント型の判別だけが差分。共通ヘルパー + 型引数の薄い呼び分けが正道。ただし承認委任で却下ゲート/その逆が開かない排他(FR-1.4)は呼び出し側で型を固定して保証する。

## Q3. #670 作成先パスのアンカー方式

sibling worktree から実行時、Bolt worktree をどこに作るか。

- A. `dirname(git-common-dir)`(= main checkout)を常にアンカーにし、Bolt worktree を main checkout の sibling に作成(現在の worktree 位置に依存しない)
- B. `--repo`/`--base-dir` 相当の明示アンカーフラグを新設して呼び出し側に委ねる
- C. Other

[Answer]: A(design で確定)。根拠: #670 の意図は「Bolt worktree は main の sibling、ネストしない」。実行元が sibling worktree でも `dirname(git-common-dir)` は main checkout を正しく指すため、これをアンカーに固定すれば追加フラグなしで FR-2.1/2.3 を満たす。B は API 表面を増やし呼び出し側の負担になる。真ネスト拒否(FR-2.2)は「作成先が既存 worktree 配下になる場合」を検出して維持。

## Q4. 落ちる実証の実施形態(両 Bolt 共通)

- A. 各 Bolt に、修正前に赤・修正後に緑となる回帰テストを新設(#685: 偽造/混用 fixture で fail-closed を実証、#670: sibling からの create 成功 + 真ネスト拒否維持を実証)
- B. 既存スイートのグリーン維持のみ
- C. Other

[Answer]: A(team.md Mandated / bugfix scope の回帰下限)。B は bugfix のリグレッションテスト必須ノルムに反する。#685 は event registry 同期ガード(t28/t48/t81/t111 + audit-format.md + 12-state-machine.md EN/JA)も同一 PR で更新。

---

## 未決・ユーザーエスカレーション事項

なし。2件とも修正方向は確定済み(クロスレビュー CONFIRMED + correction 反映)。上記 Q1-Q3 の詳細は design ステージ(bugfix スコープでは functional-design 相当)で最終化するが、requirements の合否基準(FR/AC)は本ファイルと requirements.md で固定済み。
