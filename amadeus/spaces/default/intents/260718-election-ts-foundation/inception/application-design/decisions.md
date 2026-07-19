# Design Decisions(ADR)— election-ts-foundation

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1: TS 本体は scripts/ 分離、SKILL は contrib/skills/(U-01 確定)

- **Context**: 配布外(W-04)のチームローカルツール。SKILL は contrib overlay(promote-self.ts:45-46、dist 非対象)が唯一の user-invocable 経路
- **Decision**: TS 実装は `scripts/amadeus-election*.ts`(mirror.ts 前例)、SKILL は `contrib/skills/amadeus-election/SKILL.md`。ユーザー裁定 2026-07-19(U-01=B)
- **Consequences**: lint(Biome)・tsc・tests/ の既存配線(team-practices.md Testing Posture の CI gate 列)をそのまま利用。SKILL は scripts のツールをパス指定で呼ぶ(既存全 SKILL と同型)
- **Alternatives Rejected**: (a) contrib 一体 — 実行 TS を contrib に置く前例なし(実測: upstream-sync は SKILL.md+references のみ)、lint スコープ拡張の付随作業が発生 (b) framework 配布(packages/framework)— W-04 で除外済み
- **Security/Compliance**: 選挙ツールは gh 非依存(NFR-1)・repo 外への書込なし。秘匿情報を扱わない(票は開票後に公開される前提のチーム内データ)

## ADR-2: 選挙記録は space レベル `elections/`(U-03 確定)

- **Context**: 選挙は intent 紐づき(明確化・§13)と非紐づき(PM・ノルム監査)の両方がある
- **Decision**: `amadeus/spaces/<space>/elections/<選挙ID>/` を正本に(memory/・knowledge/・codekb/ と同格の space 資産)。intent 紐づきは記録側から intent slug を参照。ユーザー裁定 2026-07-19(U-03=A)
- **Consequences**: git 管理・checkpoint コミット対象(C-07)。`.gitignore` 変更不要(amadeus/ ツリーは既定で version 管理)
- **Alternatives Rejected**: intent record 配下 — 非紐づき選挙の居場所がない。リポジトリ直下の専用 dir — space 多重化(将来)と不整合

## ADR-3: 状態機械は6状態の指令ループ(FR-0 の実現形)

- **Context**: directive-driven(D-13)— AI 無知識で完走
- **Decision**: 選挙状態 = draft → open → collecting → tallied → recorded(+ any 時点の hold(要人間))。CLI `next --election <id>` が現状態から型付き指令(distribute/collect-wait/tally-ready/render/verify/done、hold は理由型付き)を返し、`report` が遷移をコミットする(amadeus-orchestrate の next/report ループへの構造的類推 — 直接の先例文書はなく、実在参照は architecture.md:32-40 の invoke-swarm directive と component-inventory.md swarm 節の orchestrate/referee 分離実測)
- **Consequences**: SKILL は指令の転送のみ(FR-8 受け入れの構造前提)。手順知識の正本はこの状態機械+テスト
- **Alternatives Rejected**: (a) サブコマンド直叩き(open→notify→…を AI が順序記憶)— FR-0 に反する(手順知識が AI 側に残る) (b) 全自動デーモン — 人間判断点(開票タイミング裁量・hold)を殺す(C-01 違反)

## ADR-4: シャッフルは決定的シード(選挙ID+投票者名の hash)

- **Context**: #1135(内部 No/表示番号分離)+NFR-3(決定性)
- **Decision**: 配布ビューの表示順は `seed = hash(選挙ID + voter)` の決定的シャッフル。票は内部 No で記録
- **Consequences**: 再現可能(監査時に配布ビューを再生成して照合可能)。乱数状態の永続化不要
- **Alternatives Rejected**: (a) 真乱数+シード保存 — 保存物が増えるだけで監査上の利点なし (b) シャッフルなし(全員同一表示順)— #1135 の起票根拠(表示順アンカリングによる票の偏り)を放置することになり不採用

## ADR-5: 二重票は拒否・訂正は明示再提出(FR-3b の意味論)

- **Context**: 現行運用の「訂正申告」(E-SMF-RA13 の GoA 訂正等)を型に落とす
- **Decision**: 同一投票者の2票目は reject。訂正は `vote --amend` の明示操作でのみ受け、原票+訂正票の両方をタイムラインに残す(後から見て訂正経緯が追える)
- **Consequences**: 「最新優先」の無言上書きによる改竄可能性を排除。現行の訂正申告文化を構造化
- **Alternatives Rejected**: (a) 最新優先上書き — 訂正の監査痕跡が消える (b) 開票前の時限訂正窓(窓内は上書き許容)— 窓の長さという新しいマジックナンバーを生み(constants-from-code の対象)、窓内の原票が消える点で (a) と同じ監査欠陥を持つため不採用

## ADR-6: FR-0 e2e の fresh 断面 = 機械実行器(CI 固定)+ノルム無参照 subagent(受け入れ実演)の2層

- **Context**: requirements.md FR-0 受け入れ基準が fresh 断面の構成方法の具体化を本ステージへ明示的に申し送っている
- **Decision**: 二層で実証する。**(i) CI 層(決定的・常設)**: テストコード内の機械実行器 — `next` の指令 JSON を読み、指令が名指しした verb を字義どおり実行し、`report` するだけの TS ループ(LLM 不在・選挙知識ゼロ)。これが選挙1件を完走できることを integration テストで固定する。指令だけで完走できるなら「AI が手順知識を持たなくても完走できる」ことの上位実証になる(実行主体は最弱の知識ゼロ機械)。**(ii) 受け入れ実演層(1回・非 CI)**: 実装 intent の build-and-test で、選挙ノルム(team.md 該当 cid 群)を prompt に含めない subagent に SKILL 本文+ツールパスのみを与えて実選挙1件を完走させ、記録を成果物に残す
- **Consequences**: FR-0 の常設保証は決定的テスト(CI)が担い、LLM 実演は一度きりの受け入れ証跡に留まる(flaky な LLM テストを CI に持ち込まない)。機械実行器は C6 の指令スキーマの consumer 契約テストを兼ねる
- **Alternatives Rejected**: (a) LLM subagent e2e を CI に常設 — 非決定的・トークンコスト・NFR-3(決定性)と不整合 (b) 機械実行器のみで実演なし — 「実際の AI セッションが SKILL 経由で完走できる」ことの直接証跡が残らず、FR-0 受け入れ基準の文言(fresh なセッション断面)を満たしきらない

## 委任(functional-design/実装へ)

- 指令 payload の正確な型形状・選挙ID の採番規則・elections/ 配下のファイル名様式(実装時に mirror.ts 様式へ揃える)
- `DistributionView` の blind 性も FR-2a の `ShortNotification` と同水準の型保証で実現すること — 推奨マーカー・先行票・他者回答状況に相当するフィールドを型として持たない(FR-1c の構造的保証。reviewer iteration 1 Minor 5 の申し送り)
