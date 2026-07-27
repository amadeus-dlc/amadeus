# Requirements — solo-election(ソロモード2体 subagent 選挙)

上流入力(consumes 全数): intent-statement.md(裁定 Q1-Q6・承認系譜・成功指標)、scope-document.md(MoSCoW M-01〜M-07/S-01/C-01/W 群)、business-overview.md(フレームワーク文脈)、architecture.md(選挙サブシステム現在節 — 指令返却 transport・人数非依存 tally・機械固定 SKILL)、code-structure.md(選挙5ファイル配置と投影面)、team-practices.md(変更なし評価 — ノルム改定は本 intent の実装スコープ M-05 という線引き)。

## Intent Analysis

目的は、ソロモードで main agent を選挙管理委員、fresh subagent 2体を投票者とする選挙形態を、既存の選挙 TS 基盤(typed directive loop)の上に完成させることである。D-12 裁定(輸送抽象・VoterKind)の残余実装であり、新しい選挙プロトコルを作るのではなく、**既存プロトコルの solo 輸送側の駆動・集計・手順・ノルムを埋める**。

### 承認系譜(cid:approval-lineage-citation)

1. **D-12**(2026-07-19T01:35:00Z、ユーザー直接裁定、260718-election-ts-foundation decision-log:20): ソロ選挙を取り込む — 輸送抽象(team=agmsg / solo=spawn)+票の VoterKind 明記。
2. **intent-capture Q1-Q6**(2026-07-27T13:26:04Z 承認): 発動条件 D / 定足数2体 / 裁定効力 A / スケルトン A / スコープ A / GoA 2体適用表。
3. **本ステージ Q1-Q3**(2026-07-27T14:18:02Z 承認): 再投票 = 同一個体 resume / 識別子 = subagent-1/2 / SKILL = 既存4節へ内挿+t242 契約不変+loud 降格告知。

## Functional Requirements

### ソロ輸送の駆動(conductor 側プロトコル)

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-01 | Must | ソロ選挙は既存 CLI の typed directive loop で駆動する。conductor は `open`(voters = `subagent-1`, `subagent-2`)→ `next` → `notify`(既定 transport = subagent、DeliveryDirective 取得)→ 2体 spawn → 票着確認(`status`)→ `report --result distributed` → `tally` → `render` → `verify` の指令追従だけで完走できる | Given ソロ選挙定義、When conductor が CLI 指令に従い E2E 実行、Then 状態機械が draft→…→recorded を辿り、選挙ディレクトリに ballots 2 / tally.json / record.md が固定される。CLI 側に新 verb を追加せず完走できること(駆動ギャップがある場合のみ最小の verb/flag 追加を設計で正当化) |
| FR-02 | Must | spawn プロンプトは blind 配布を保つ: subagent へ渡す情報は election id と view path(+投票手順の定型)のみ。main agent の分析・推奨・先行票・他 voter の存在状態を含めない | Given spawn プロンプト定型(SKILL.md 内挿)、Then プロンプト構成要素は DeliveryDirective 由来フィールド+固定手順文のみであることがテンプレート検査(t242 語彙ガードと同型の grep 検査)で機械確認できる |
| FR-03 | Must | 票は subagent 自身が `vote --election <id> --file <ballot.json>` を実行して提出する(main agent の代筆禁止)。ballot は `voterKind: "subagent"`、voter は `subagent-1`/`subagent-2` | Given 完走したソロ選挙、Then ballots/ 配下の2票が `voterKind: "subagent"` かつ voter 名が規約どおりで、既存 `Ballot.parse` の fail-closed 検証を通過している |
| FR-04 | Must | main agent は投票しない(管理委員専任)。spawn プロンプトには同期完遂の定型文言(投票完了までターンを終えない)と、票未着時の再spawn 1回→なお未着でユーザーエスカレーションを含める | Given voters 2体の選挙、Then voter 集合に main agent 相当の名前が存在しない。Given 1体が無応答、When 再spawn 1回でも票未着、Then conductor はユーザーへエスカレーションし、選挙は collecting のまま保存される(既存 collect-wait 意味論) |

### 2体 GoA 集計(tally の voters-aware 化)

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-05 | Must | 選挙の宣言 voters が2体のとき(輸送種別を問わない — W-04 改訂裁定 2026-07-27T14:28:11Z により承認済み)、tally は Q6 適用表に従う: (i) GoA 5 が**1票以上**で discussion-needed hold (ii) GoA 4(棄権)が1票以上で quorum-short hold(単票成立の禁止) (iii) 賛成側1票+反対側(7-8)1票は同一選択肢でも established にせず hold(人間解決必須)。ブロック(8)≥1 → hold は既存どおり | Given 2体選挙の各票組合せ {5,1} / {4,1} / {1,7}(同一選択肢)、When tally、Then いずれも kind: "hold" で、winner は確立されない。落ちる実証: 修正前の tally では {5,1} と {4,1} と {1,7} が established になることをテストで実証してから修正する |
| FR-06 | Must | 3体以上の選挙の tally 挙動は完全不変(discuss>=2・quorum-short=favor+against===0・choice winner/tie の現行規則)。2体選挙の変更は W-04 改訂裁定で承認された仕様バグ修正であり、この不変契約の対象外 | Given 既存 t234/t244 の全ケース+3〜6体の代表組合せ、When 修正後 tally、Then 全結果が修正前と bit 一致(regression テストで固定) |
| FR-07 | Must | (iii) の hold は人間の解決 report で決着できる(既存 HOLD_RESOLUTIONS の意味論に整合する解決語彙を設計で確定し、解決が tally.json へ永続化されてから state が動く既存契約 :272-285 を維持する) | Given (iii) の hold、When 人間解決を report、Then 解決内容が tally.json に永続化され、状態機械が正しく前進する |

### 追加議論・再投票

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-08 | Must | discussion-needed hold の解決(discussed → collecting)後の再投票は、**同一 subagent 個体の resume** で行う。resume メッセージには相手票の留保・rationale を verbatim で渡し、amend ballot(同一 voter 名・既存 ref 契約)で再提出する。再投票後も GoA 5 が残存する場合はユーザーエスカレーション(追加議論は1ラウンドのみ) | Given {5,x} で hold した選挙、When discussed 解決→2体 resume→amend 提出、Then resolveBallots が amend を採用して再 tally される。再 tally 後も 5 残存なら conductor はユーザーへエスカレーションする(手順は SKILL 内挿に明記) |

### 発動条件・降格

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-09 | Must | ソロ選挙の発動は (a) 設計逸脱 (b) ブロッカー (c) §13 学習選定 の3類型で自動、それ以外はユーザーの明示指示で発動。仕様変更・エスカレーション正準リスト事項は選挙対象外(ユーザー専権)。発動規則は team.md ソロモード節(M-05)と SKILL 内挿の両方に同文で明文化 | Given ノルム改定文と SKILL 内挿文、Then 3類型+明示発動+対象外リストが両文書で一致している(grep 照合)。発動判断自体は conductor の知識作業でありエンジン変更は不要 |
| FR-10 | Should | Agent tool(spawn)が使えない環境では、選挙発動時に「spawn 不能のためユーザー裁定へ降格」の loud な1行告知を出し、現行挙動(全件ユーザーエスカレーション)へフォールバックする。無音降格は禁止 | Given spawn 不能環境での発動、Then 告知1行が会話/stderr に出力され、選挙は開かれず(または開いたまま collecting で保存され)ユーザー裁定へ移る |

### SKILL・ノルム・同期

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-11 | Must | amadeus-election SKILL.md のソロ手順は**既存4節(起動/転送/人間委譲/終了)への内挿**で記述し、t242 の契約(BR-K3 の4節 toEqual・BR-K1 禁止語彙・BR-K4 人間委譲文言・FR-2b パス形)を不変のまま green に保つ | Given 内挿後 SKILL.md、When t242 実行、Then green。内挿文は BR-K1 の禁止語彙(規則語)を含まない |
| FR-12 | Must | team.md ソロモード節を改定し、2体 subagent 選挙を正規形態として明文化する(Q1-Q3/Q6 の裁定内容+「存在しないメンバーや投票結果を捏造しない」との整合 — subagent 票は実在の票であり捏造に当たらない旨) | Given 改定文、Then 既存 org.md/団体ノルムと矛盾せず(§13 admission 相当の突き合わせ)、本 intent の実装と同一変更群で着地する |
| FR-13 | Must | CLI/model を触る変更は canonical+self-install 5面+dist 7面、SKILL.md を触る変更は canonical+self-install 3面+dist 3面(いずれも RE 実測 = re-scans/260727-solo-election.md の find 出力転記: CLI 投影13・SKILL 投影7の内訳)を同一変更で同期し、既存ドリフトガード(dist:check / promote:self:check)を green に保つ。EN/JA docs の選挙ドキュメント(該当がある場合)も同一変更で同期 | Given 変更後リポジトリ、When bun run dist:check && bun run promote:self:check、Then exit 0 |

## Non-Functional Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| NFR-01 | 無退行: 既存テストスイート(tests/run-tests.sh --ci)が green のまま | CI 全 green(修正前 baseline 確認込み) |
| NFR-02 | 監査・追跡可能性: ソロ選挙の全裁定は elections store(ballots/tally.json/record.md)で事後追跡でき、subagent 票の provenance は reported-by-conductor 契約(bookReportedDeliveries)のまま | Given 完走選挙、Then record.md に票・GoA・裁定が machine-render され、DeliveryRecord が distributed report 時に mint されている |
| NFR-03 | カバレッジ・複雑度: 変更行は既存 patch/coverage/complexity ゲートを通過(bun-coverage 盲点は in-process seam で回避) | codecov patch green / complexity ゲート green |

## Constraints(constraint-register からの継承)

C-01(チーム挙動不変 — FR-06 が検証面)/ C-02(TS 正本主義 — SKILL に集計ロジックを書かない)/ C-03(blind verbatim — FR-02)/ C-04(subagent 自身の提出 — FR-03)/ C-05(人間コントロール — FR-05/08/09)/ C-06(同期 — FR-13)/ C-07(2体固定 — FR-01)。

### FR-05 のキー選択の承認系譜(仕様バグ修正としての2体全般適用)

FR-05 は「宣言 voters が2体」をキーとし輸送種別を問わない — member 2体のチームモード選挙にも適用される。この拡張は §12a レビュー iteration 1 の Critical C-1(無申告の W-04 逸脱)を受けて**ユーザーへ明示エスカレーションし、2026-07-27T14:28:11Z に承認された**: 現行 tally が team 2体で {賛成1,反対1}同一選択肢を established にする挙動は、チームモードの偶数設計(2/4/6体、スプリット→人間裁定 — team.md ソロモード節導入時のユーザー言明)と矛盾する仕様バグであり、「次いでに矛盾がないように修正」との裁定。scope-document.md の W-04 は同裁定を引用して正式改訂済み。3体以上の挙動は FR-06 で不変固定。

## Out of Scope

W-01 supervise / W-02 質問推奨自動選択 / W-03 standing grant 変更 / W-04(改訂後) チームモード選挙の挙動変更のうち定足数・agmsg 輸送・3体以上の GoA 規則(2体 GoA 規則は W-04 改訂裁定により FR-05 のスコープ)/ W-05 3体以上のソロ定足数。

## Traceability

| scope-document | requirements |
|---|---|
| M-01 | FR-05, FR-06, FR-07 |
| M-02 | FR-01, FR-02, FR-03, FR-04 |
| M-03 | FR-11, FR-04(定型文言), FR-08(再投票手順) |
| M-04 | FR-09 |
| M-05 | FR-12 |
| M-06 | FR-05 の落ちる実証+walking skeleton(FR-01 完走+1-1 エスカレーション分岐) |
| M-07 | FR-13 |
| S-01 | FR-10 |
| C-01(Could: モデル多様性) | 要件化しない(spawn 定型がモデル指定を妨げない構造であること — 設計注記のみ) |

## Open Questions

なし(FR-07 の解決語彙・FR-01 の verb ギャップ有無は application-design / functional-design の設計判断として明示委任)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-27T14:31:29Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 Critical C-1(FR-05 の W-04 無申告逸脱)はユーザーエスカレーション裁定(2026-07-27T14:28:11Z)の3成果物整合転記で閉包、Mi-1 は RE 実測参照+独立 find 再実測(CLI 13 / SKILL 7)で閉包。是正 diff の新規欠陥なし。

### Findings

- None
