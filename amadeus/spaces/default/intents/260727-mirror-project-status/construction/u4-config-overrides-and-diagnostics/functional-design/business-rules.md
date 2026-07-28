# Business Rules — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

BR は requirements の U4 担当 FR(unit-of-work の割付: FR-5, FR-6c, FR-9, FR-10b 診断面 — 受入条件 9, 12)から導出。実装面は components の C1/C3 割付と component-methods の C1 config・C3 projectDiagnostics 型。外部依存・認証の前提は services を正とする。story-map ジャーニー4の成立条件。

## ルール一覧

| ID | ルール | 導出元 |
|----|--------|--------|
| BR-U4-1 | `mirror-projects` は closed schema: unknown key(config ルート)・unknown phase キー(status-names 内)・形式不正はすべて fail-closed で issue 化する。既存 unknown-key 拒否様式(実装直読: amadeus-mirror-config.ts:335-339)に倣う | FR-5a/5b (i) |
| BR-U4-2 | 層解決は「新キーの有効値を持つ最後の層が勝つ」全置換 — 層間マージをしない。`auto-mirror` と `mirror-projects` はキー単位で独立に解決する | FR-5b (ii) |
| BR-U4-3 | `status-names` 上書きはフェーズ→選択肢名の写像のみを変更し、フェーズ遷移の意味を変更しない。未指定フェーズは C2 の既定表へフォールバック(canonical 1定義 — 上書き側で表を複製しない) | FR-5c、FR-9c と同根 |
| BR-U4-4 | `repair status` は remote mutation を発行しない — gateway mutation メソッド呼び出し 0 回を negative assert でテスト固定する | FR-9b(受入条件12) |
| BR-U4-5 | 診断の期待 Status 導出は同期側と同一の `expectedProjectStatus`(C2 canonical)を共有消費する。診断用の複製導出・独自文字列表を作らない | FR-9c(cid:code-generation:c1-drift-canonical-renderer) |
| BR-U4-6 | option-missing の診断には「期待した選択肢名」と「実在する選択肢名の一覧」(`availableOptions`)を含め、解決手順(Project 側の選択肢再構成 or `status-names` 上書き)へ誘導する。秘匿情報(token・生 GraphQL 応答)を含めない | FR-6c+NFR-4(U2 BR-U2-8 の redact 流儀) |
| BR-U4-7 | permission-denied の診断は対象 Project と必要権限(`project` scope — services の認証節)を示すに留め、認証 scope の自動変更・自動再認証を行わない | FR-10b |
| BR-U4-8 | 部分成功状態(FR-9a (v))の検出は U2 の projectSync 台帳(pending / safety-blocked entry)から導出する — 台帳が正であり、診断が台帳を書き換えない(read-only は state 面にも適用) | FR-9a/9b+U2 台帳責務 |
| BR-U4-9 | 設定 0 件かつ所属 0 件のとき Project 診断列は空とし、既存 repair status 出力(実装直読: amadeus-mirror-lifecycle.ts:816 の runRepairStatus、:406-412 の status outcome 型)を変更しない — 既存挙動の回帰テストを維持する | FR-9a(拡張は additive)+U1 BR-U1-1 の同型原則 |

## テスト規約(U4 分)

- 受入条件9の3面(unknown key 拒否 / 層置換 / 上書き適用)を config parse の unit テストで固定。落ちる実証は unknown phase キーの注入(実行時に消費される検証分岐へ — inject-runtime-consumed-lines)。
- 受入条件12の診断ケース(drift あり/なし・field-missing・option-missing+availableOptions・permission-denied・部分成功)を FakeGateway 差し替えの既習様式で固定し、mutation 0 回を history 検査で assert。
- 秘匿(BR-U4-6): GraphQL errors に固有トークンを仕込んだ permission-denied を注入し、診断出力に 0 hit を assert(U2 と同じ検査様式)。
- 実 FS(config 3層の読取)は integration 層、分類・写像の純関数は unit 直叩き(fs-tests-integration-first)。
