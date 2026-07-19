# Business Rules — election-store(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧(テストは integration 層 — 実 FS、fs-tests-integration-first)

| # | ルール | 由来 | テスト |
|---|---|---|---|
| BR-S1 | create は既存 ID を reject(上書きしない) | FR-1a | 二重 create の reject |
| BR-S2 | appendBallot: 同一 voter の2票目(非 amend)は reject("duplicate")— 最新優先にしない | FR-3b、ADR-5 | 二重票 reject+原票不変の byte assert |
| BR-S3 | amend は原票保持のまま追記され、両票がタイムラインに残る | ADR-5 | amend 後の ledger 2エントリ+timeline 2イベント |
| BR-S4 | status は投票済み/未着を voters−受理者の導出で返す(保存された一覧を持たない) | FR-3c | 受理進行に伴う status 変化 |
| BR-S5 | materialize は開票時点の票集合を固定し、以後の後着は本集計ファイルへ混入しない | FR-4c/5b/3d | 開票後 appendBallot → ballots/ 不変+後着記帳 |
| BR-S6 | appendTimeline は操作実行の結果からのみ記帳される(単独呼出の公開面を持たない — 送らず記帳の経路なし) | FR-2b | 型面: 非 export or 呼出契約 assert(実配線検証は U4) |
| BR-S7 | 全書込は tmp+rename(クラッシュ時に半書きファイルを残さない) | 信頼性既習 | 書込後の parse 可能性+一時ファイル残渣なし |

## 落ちる実証

BR-S2(duplicate reject)・BR-S5(実体化固定)の判定行へ注入し赤→revert(NFR-2、注入非コミット)。
