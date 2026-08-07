# Scope Document — subagent 型規律ガードと実効 model 属性の記録

**上流入力(consumes 全数)**: `intent-statement`(必須・実在 — 本書の In/Out 境界・成功指標・申し送りはすべて同書から導出)/ `feasibility-assessment`(任意・**不在** — self-feature スコープでは feasibility ステージが SKIP のため設計どおり存在しない。実現可能性の未確定点は intent-statement の R-1〜R-5 として requirements / RE へ委譲済み)/ `constraint-register`(任意・**不在** — 同上。制約は本書「制約」節に intent-statement から転記)

**測定 ref**: `7060956c5617125dd2f4e284957aa180cb306484`(= `origin/main`)
**起点**: GitHub Issue [#2279](https://github.com/amadeus-dlc/amadeus/issues/2279) / Mirror [#2288](https://github.com/amadeus-dlc/amadeus/issues/2288)

## スコープ境界(In / Out)

`intent-statement.md` の確定済み裁定 Q1〜Q4 をスコープ境界として固定する。

### In(本 intent で出荷する)

| # | 能力 | 内容 |
|---|------|------|
| CAP-1 | **型の許可集合照合(advisory)** | subagent イベントの Agent Type を許可集合(`.claude/agents/` の定義済み persona + ハーネス組込型)と照合し、集合外・型未指定を loud に警告する。**advisory であり fail-closed 拒否はしない**(Issue #2279 が代替案2として明示非採用)。記録面は `SUBAGENT_STARTED` / `SUBAGENT_COMPLETED` の**両方**(Q4=C) |
| CAP-2 | **model 属性の記録** | SUBAGENT イベントへ model 属性を付与する。「実効 model」は `明示指定 > agent 定義の model ピン > セッション継承` の解決結果として扱い、解決可能な範囲を記録、解決不能な場合は欠落を明示する(Q3=D)。載せられる範囲は R-1(live payload 実測)の結果で確定する |
| CAP-3 | **集計の機械導出** | audit / otel から型別・モデル別の spawn 内訳を1コマンドで導出できる(SM-3) |
| CAP-0 | **許可集合の解決(共有基盤)** | CAP-1 が照合する許可集合を機械導出する(定義済み persona は `.claude/agents/*.md` から、組込型は R-4 の実測列挙から)。CAP-1 と CAP-3 の共有依存 |

### Out(本 intent では扱わない — 全件、行き先確定済み)

| 除外事項 | 行き先 | 根拠 |
|---------|--------|------|
| (c) 汎用 builder persona(model ピン付き定義済み型)の新設 | Issue [#2298](https://github.com/amadeus-dlc/amadeus/issues/2298)(P3、本 intent 完了後の型内訳を設計入力にする) | Q1=A |
| live `.claude/settings.json` の `PreToolUse` 配線欠落(start seam 不発)の是正 | Issue [#2297](https://github.com/amadeus-dlc/amadeus/issues/2297)(P2/S3) | Q4=C |
| `CXR-33`(transcript 読取禁止の機密性ルール)の改訂 | 本 intent では制約として受容。改訂が必要になった場合はユーザー専権の別裁定 | Q3=D |
| 集合外 spawn 件数の運用上の減少の実証 | 運用後の観測(次のローリング PM の題材) | Q2=C |
| fail-closed 拒否(集合外 spawn のブロック) | 扱わない(advisory 実績を見てからの将来判断) | Issue 代替案2 |

## 制約(constraint-register 不在のため本書へ転記)

| # | 制約 | 出典 |
|---|------|------|
| CON-1 | `CXR-33`: `agent_transcript_path` / `last_assistant_message` / prompt / tool result を読取・保存しない | `260713-swarm-driver-migration` business-rules.md:58(Q3=D で受容) |
| CON-2 | Claude Code の start seam(`PreToolUse`)は live settings で不発 — 本 intent はこれに依存しない設計とする(completed 側で必ず発火) | #2297、reviewer-1 実測 |
| CON-3 | ハーネス間 parity: model 属性を供給できないハーネスで fail-closed に落ちない(欠落の明示で運用継続) | `bt-dist-regen-seven-harnesses` / Q3=D |
| CON-4 | 免責が実質基準を代替しない: 「欠落を明示」だけで SM-4 を満たしたことにしない — 解決順で載せられる範囲の実装が必須 | `cid:requirements-analysis:exemption-clause-must-not-substitute` |

## 順序付け方針(Q1 裁定: risk-first)

最大の不確実性 = R-1(Claude Code / Codex の live payload に `model` が載るか。クロスレビュー C10 の不一致点)を**最優先で実測**し、その結果で CAP-2 の実現範囲を確定してから作り込みへ進む。

1. **RE(2.1)**: R-1 の live payload 実測(両ハーネス)+ R-4(組込型の語彙列挙)+ R-3(解決順の各段の取得可否)— `cid:reverse-engineering:c1-xrev-mechanism-resolution` により C10 の機序裁定はここで行う
2. **requirements(2.3)**: RE の実測結果で CAP-2 の受け入れ基準を固定。R-2(C4 集計値の測定 ref 付き再計測)
3. CAP-0 → CAP-1 → CAP-2 → CAP-3 の依存順で実装(risk-first の残余は dependency 順)

`cid:scope-definition:c3`(raw WSJF より dependency と risk-first を優先し、未証明の基盤に依存する価値面を先行着地させない)の先例に従う。

## 成功指標(intent-statement SM-1〜SM-4 を受領)

SM-1(集合外の注入で警告の落ちる実証)/ SM-2(現行コーパス sweep で誤検知ゼロ)/ SM-3(1コマンド集計)/ SM-4(解決順ごとの記録内容のテスト固定)。SM-2 は `cid:code-generation:corpus-sweep-for-new-guards`(落ちる実証と対の「正当な既存データで赤くならない」両側実測)の適用である。

## ハードデッドライン

なし(質問票 Step 3 の定型question。運用リズムは通常の Bolt 配送 — Bolt ごとに PR、人間承認マージ)。
