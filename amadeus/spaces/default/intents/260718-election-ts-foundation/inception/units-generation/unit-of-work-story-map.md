# Unit of Work Story Map — election-ts-foundation

> 上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

user-stories ステージは本スコープ(amadeus)で SKIP のため stories.md は存在しない(consumes 宣言上も optional)。存在しないストーリーを捏造せず(approval-handoff:c4 の類推)、代替の内部証拠として **requirements.md の FR** を物語単位としてユニットへ写像する。

## FR → Unit 写像(カバレッジ全数)

| FR | 内容(要約) | 実装ユニット | 横断 |
|---|---|---|---|
| FR-0 | directive-driven・AI 無知識 | U5(状態機械+機械実行器 e2e)/ U6(実演層) | ✓(2ユニット — decisions.md ADR-6 の2層に対応) |
| FR-1a/1b/1c | 起票・シャッフル・blind | U1(定義 parse・shuffleView)+U2(create) | ✓ |
| FR-2a/2b | 短通知・自動記帳 | U4(ShortNotification)+U2(タイムライン記帳) | ✓ |
| FR-3a〜3d | 構造化票・fail-closed・台帳・後着 | U1(Ballot.parse・classifyLate)+U2(appendBallot/status) | ✓ |
| FR-4a〜4c | GoA 開票・判別ユニオン・early tally | U1(tally/canEarlyTally) | — |
| FR-5a/5b | 記録生成・開票時実体化 | U3(render)+U2(materialize) | ✓ |
| FR-6a/6b | 照合 | U3(verify 群) | — |
| FR-7a/7b | 輸送抽象・voter 種別 | U4+U1(voter 種別は Ballot 必須フィールド) | ✓ |
| FR-8a/8b | SKILL 薄ラップ・禁止語彙検査 | U6 | — |
| NFR-1〜4 | gh 非依存・テスト層・決定性・互換 | 全ユニット(受け入れ基準に内包) | ✓ |

## 検証

- 全 FR が最低1ユニットに割当済み(上表 — 未割当なし)
- 全ユニットが最低1 FR を実装(U1: FR-1/3/4/7、U2: FR-1/2/3/5、U3: FR-5/6、U4: FR-2/7、U5: FR-0、U6: FR-0/8 — 空ユニットなし)
- ユニット内の実装順は各 FR の受け入れ基準(落ちる実証を含む)が導出する — Bolt 経済順序は delivery-planning が決定
