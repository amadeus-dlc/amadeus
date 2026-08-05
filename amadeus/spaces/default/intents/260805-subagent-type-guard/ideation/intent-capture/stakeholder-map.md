# Stakeholder Map — subagent 型規律ガードと実効 model 属性の記録

**上流入力(consumes 全数)**: なし(`consumes: []`)。本書は同ステージの `intent-statement.md` と対で作られる。

**測定 ref**: `7060956c5617125dd2f4e284957aa180cb306484`

本 intent は Amadeus 自身の自己開発(`self-feature`)であり、外部顧客を持たない。
ステークホルダーは**フレームワークの利用者と運用者**、および**監査記録の消費者**である。

## Key stakeholders and their interests

| ステークホルダー | 関心事 | 本 intent との関係 |
|---|---|---|
| **ユーザー(j5ik2o)** | 配分方針(高判断=opus)が実際に守られているか。トークンコストと品質の監査 | 唯一の意思決定者。スコープ・仕様変更・不可逆操作の裁定者 |
| **conductor(ワークフローを回すセッション)** | どの型で subagent を起動すべきかが明確であること。誤った型で起動したら気づけること | 警告の**第一の受け手**。advisory がうるさすぎると無視され、静かすぎると意味がない |
| **leader(コスト・品質を監査する役)** | 型別・モデル別の spawn 内訳を事後に出せること | SM-3(集計の機械導出)の主たる受益者 |
| **audit 記録の消費者**(`amadeus-runtime.ts summary`、otel、replay、session-cost) | イベントスキーマが安定していること。属性追加が既存の読み手を壊さないこと | model 属性の追加は**スキーマ変更**であり、既存消費者の棚卸しが要る |
| **他ハーネスの利用者**(Codex / Cursor / OpenCode / Kimi / Kiro) | 自ハーネスで動くこと。供給できない属性が fail-closed で邪魔をしないこと | ハーネス間 parity が受け入れ条件。Codex と Claude Code で供給経路が異なる可能性(R-1) |
| **将来の intent の実装者** | 「なぜこの型で起動するのか」が検査で示されること | (c) 汎用 builder persona を別 Issue に回した判断の影響を受ける |

## Decision-makers vs. influencers

**Decision-maker(意思決定者)**

- **ユーザー(j5ik2o)** — 唯一。スコープ(Q1)、成功指標(Q2)、model の追跡範囲(Q3)、
  ガードの記録面(Q4)はすべてユーザー裁定で確定済み。以下は今後もユーザー専権:
  - 仕様変更(ユーザー可視の契約・挙動の変更)
  - PR マージ(`cid:requirements-analysis:no-ai-merge`)
  - `CXR-33` の改訂(本 intent では扱わないが、将来必要になった場合)
  - 別 Issue へ回した (c) と settings drift の着手判断(`cid:requirements-analysis:issue-selection-user-decides`)

**Influencer(影響を与えるが決定しない)**

- **クロスレビュアー2名** — 欠陥の実在を確認し、期待結果1・2の不成立を指摘した。
  ただし `cid:requirements-analysis:c1-xrev-verdict-not-ruling-authority` のとおり、
  レビュアーの「裁定を要するか否か」というメタ判断は一次証拠を上書きしない。
- **既存ノルム(`org.md` / `team.md` / `project.md`)** — 検証劇場の禁止、落ちる実証の必須、
  advisory の設計方針、TDD 既定などが実装の自由度を拘束する。決定ではなく制約として作用する。
- **Issue #2279 の本文** — 対象範囲 (a)(b)(c) と「advisory から開始」を逐語で指名しており、
  これらは未裁定事項ではなく執行事項として扱う。
- **`260713-swarm-driver-migration` の CXR-33** — Claude Code 側の実現経路を制約する。
  本 intent では改訂せず、制約として受け入れる。
- **`.claude/agents/*.md` の model ピン(opus 9 / sonnet 5)** — 許可集合の実体を与える。

## Communication requirements

| 対象 | 手段 | 頻度・タイミング |
|---|---|---|
| ユーザーへの判断依頼 | 質問票の `[Answer]` + 対話。承認は ISO タイムスタンプ付きで記録 | 各ステージの未確定判断が生じた時点 |
| ステージ承認 | 承認ゲート。ideation までは都度確認、以降は常任グラント下で自律 | ステージ完了ごと |
| 公開記録 | GitHub Issue [#2279](https://github.com/amadeus-dlc/amadeus/issues/2279)(Issue-first の正本)と Mirror Issue [#2288](https://github.com/amadeus-dlc/amadeus/issues/2288)(record → Issue の一方向同期) | intent の節目(phase 完了・park・complete) |
| クロスレビュー verdict | #2279 のコメント2件(投稿済み) | 着手前(完了) |
| 別 Issue へ回した事項 | 新規 Issue の起票(クロスレビュー2名成立を経てから着手) | (c) と settings drift について、本 intent の完了までに起票 |
| 実装の配送 | Bolt ごとの PR。レビュアーは実装者以外 | Construction |

### 特記事項

- **本 intent は自己開発であり、成果物の利用者と実装者が同一集団**である。そのため
  「advisory がうるさすぎないか」の判断は運用者の実感に依存し、閾値の調整には
  運用後のフィードバック(次のローリング PM)を要する。
- **ハーネス間 parity が受け入れ条件に含まれる**。model 属性が Claude Code で常に欠落する設計は、
  `cid:requirements-analysis:exemption-clause-must-not-substitute`(免責のみで基準を満たせる書き方は
  実質改善ゼロの抜け道)に該当しうるため、R-1 の実測結果が価値ラインを左右する。
