# Intent Backlog — subagent 型規律ガードと実効 model 属性の記録

**上流入力(consumes 全数)**: `intent-statement`(必須・実在 — proto-Unit の価値・裁定・申し送りの導出元)/ `feasibility-assessment`(任意・不在 — self-feature で SKIP。実現可能性リスクは PU-0 として backlog 先頭に置く)/ `constraint-register`(任意・不在 — 制約は scope-document.md「制約」節を参照)

**測定 ref**: `7060956c5617125dd2f4e284957aa180cb306484`

proto-Unit の粒度はここでは価値単位に留め、正式な Unit 分割・依存グラフは units-generation(2.7)が確定する(`cid:units-generation:c1` — Unit/Bolt の定義と粒度は正準に従い、ここで先取りしない)。

## 優先度付き proto-Unit(MoSCoW + risk-first 順序)

| # | proto-Unit | MoSCoW | 順序根拠(risk-first) | 対応 |
|---|-----------|--------|---------------------|------|
| PU-0 | **R-1 実測: model の供給源確定** — Claude Code / Codex の live hook payload に `model` が載るかを実測し、C10 の機序不一致を裁定。あわせて R-4(組込型語彙の列挙)、R-3(解決順各段の取得可否) | Must | 最大リスク。CAP-2 の実現範囲と SM-4 の受け入れ基準がここで決まる。`cid:reverse-engineering:c1-xrev-mechanism-resolution` により RE(2.1)の scan 段が裁定先 | RE ステージで実施(実装 Bolt ではない) |
| PU-1 | **許可集合の解決(CAP-0)** — `.claude/agents/*.md` の定義済み persona + R-4 で列挙した組込型から許可集合を機械導出する共有ロジック | Must | CAP-1/CAP-3 の共有依存。R-4 の結果を消費 | Construction |
| PU-2 | **型の許可集合照合ガード(CAP-1)** — `SUBAGENT_STARTED` / `SUBAGENT_COMPLETED` 両記録面で Agent Type を照合し、集合外を loud に警告(advisory)。SM-1(落ちる実証)+ SM-2(corpus sweep 誤検知ゼロ)込み | Must | 動機証拠(型未指定199件は100%が completed 行)に確実に当たる。PU-1 に依存 | Construction |
| PU-3 | **model 属性の記録(CAP-2)** — 解決順(明示指定 > persona ピン > セッション継承)で決まる範囲を SUBAGENT イベントへ付与、解決不能は欠落を明示。SM-4 のテスト固定込み | Must | PU-0 の実測結果に実現範囲が依存 — risk-first で PU-0 を先行させる理由そのもの | Construction |
| PU-4 | **集計の機械導出(CAP-3)** — audit / otel から型別・モデル別内訳を1コマンドで出す(SM-3)。R-2 の再計測(測定 ref 明記)をこのコマンドで実演 | Must | PU-2/PU-3 の属性が揃ってから意味を持つ | Construction |

Should / Could は置かない — Q1・Q2 の裁定によりスコープは Must 集合に凝集済みで、拡張候補はすべて Out(別 Issue)へ分離した(`cid:scope-definition:c2` の先例: 公開契約を完結させる能力は Must とし Should/Could を置かない)。

## Won't(この intent でやらない — scope-document の Out と同一)

- 汎用 builder persona の新設 → [#2298](https://github.com/amadeus-dlc/amadeus/issues/2298)
- settings drift(start seam 不発)の是正 → [#2297](https://github.com/amadeus-dlc/amadeus/issues/2297)
- `CXR-33` の改訂 / fail-closed 拒否 / 運用上の減少実証 → scope-document.md 参照

## 価値ストリーム(capability → outcome)

```text
PU-0 (実測)     PU-1 (許可集合)      PU-2 (照合ガード)     警告 = 規約外起動の即時検出 …… SM-1/SM-2
     \                \______________/                                            ↘
      \                                                                            運用者が規約外
       \______________ PU-3 (model 属性) ______ PU-4 (集計) ______ 型別・モデル別内訳 → 起動を発見し是正
                                                                   …… SM-3/SM-4      (#2298 が受け皿)
```

テキスト補足: PU-0 の実測が PU-3 の実現範囲を確定し、PU-1 が PU-2 の照合対象を与える。PU-2(即時検出)と PU-4(事後集計)が Q2 で合意した2軸の成功指標に対応する。

## 依存関係

- PU-1 ← PU-0(R-4 の組込型語彙)
- PU-2 ← PU-1(許可集合)
- PU-3 ← PU-0(R-1/R-3 の供給源・解決可否)
- PU-4 ← PU-2, PU-3(集計対象の属性)
- PU-2 と PU-3 は PU-0/PU-1 着地後は相互独立(並行実装可能性は delivery-planning で判定)
