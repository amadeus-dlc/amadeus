# Business Rules — u1-project-sync-skeleton

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

各 BR は requirements の FR(U1 担当分 — unit-of-work の割付)から導出し、components / component-methods の実装面へ接地する。story-map ジャーニー1の体験がこの規則群で成立する。services の障害時挙動(loud fail・継続)を全 BR の前提とする。

## ルール一覧

| ID | ルール | 導出元 |
|----|--------|--------|
| BR-U1-1 | 対象 Project 設定が無い、かつ Project 未所属なら、Project 同期ステップ全体を実行しない(既存挙動不変・追加 API 呼び出しなし) | FR-1a/FR-2d |
| BR-U1-2 | item 追加は冪等: 既所属なら追加せず、追加成功時の itemId は台帳へ記録する。同一 boundary の再実行で重複追加を発行しない | FR-2a/FR-7b |
| BR-U1-3 | 追加直後、同一チェーン内で現在フェーズの期待 Status を設定する(U1 の典型 = `Ideation`) | FR-2b |
| BR-U1-4 | 期待 Status 名の照合は exact match のみ。正規化(case/trim)をしない | FR-6a(Q2 裁定) |
| BR-U1-5 | Status フィールドまたは期待選択肢が解決できない場合、当該 Project を safety-blocked とし、診断に期待名と実在選択肢一覧を含める(秘匿情報なし) | FR-6b/6c |
| BR-U1-6 | 現在 Status が期待と一致するなら mutation を発行しない(冪等・no-op) | FR-3e |
| BR-U1-7 | GraphQL body `errors` は MirrorFailureClass へ写像する。**写像表は実装時の実 gh 応答実測で確定し、本 BR に追記してから実装を完成扱いにする**(それまで確約を書かない) | FR-7d |
| BR-U1-8 | Project mutation(add/update)は permit 検証を通過した gateway メソッドのみが実行する(検証 bypass の経路を作らない) | components の gateway 行(mutation は permit 必須)、FR-10a |
| BR-U1-9 | Project 同期の失敗は Issue 本文 mutation の成果を巻き戻さない(別 mutation・部分成功前提)。U1 では失敗時に台帳へ書かず unsynchronized 警告のみ残して継続する(pending 台帳と冪等 reconcile は U2 責務 — 先取りしない) | FR-7e(FR-7a の完全化は U2) |
| BR-U1-10 | 削除・アーカイブ・一般作業状態写像・双方向同期の経路を作らない(gateway argv に該当 mutation が存在しないことを negative assert) | FR-11 |

## テスト規約(U1 分)

- gateway: fake runner+実 gh の GraphQL envelope を od -c capture した独立 golden(既習様式 — component-methods)。
- interface 追従: gateway 実装クラス4箇所(t279/t282/t284/t300)全数更新+t280 手動確認。
- 実 FS を使う検証は integration 層(fs-tests-integration-first)。純関数(expectedProjectStatus、exact match 照合)は unit 直叩き。
- 落ちる実証は「実行時に消費される行」へ注入(inject-runtime-consumed-lines)。
