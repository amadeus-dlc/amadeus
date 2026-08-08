# Unit of Work Dependency — autonomy-reachability(#2378)

上流入力(consumes 全数): requirements.md(FR-5e の順序制約)、component-dependency.md(C2 を根とする依存)、components.md / component-methods.md / services.md / decisions.md(境界・ADR の継承)。stories は user-stories SKIP により未生成(設計どおりの不在)。

## 依存 DAG(散文)

- **u1-autonomy-core が根**: state canonical 化(FR-2c)は u2 の e2e(birth 直後の mode 可視)と u5 の計測(イベント揃い)の前提
- **u2-birth-declaration → u1**: birth 同時宣言の受け入れ基準(FR-1d)が u1 の書込に依存
- **u3-question-route-observability**: 独立(`amadeus-log.ts` のみ、他 Unit とファイル非交差)
- **u4-conduit-parity → u2**: 導線は birth 同時宣言の手順を記載(FR-5e)
- **u5-measurement-report → u1, u2, u3**: 適用後計測は全観測面の着地が前提
- **u6-plugin-docs-drift**: 完全独立

テキストfallback: u1 → u2 → u4、u1/u2/u3 → u5、u3 と u6 は任意時点。

### 実行環境制約による直列化(Construction 実施時の追記 — 技術的依存ではない)

以下の edge block は上記の**技術的**依存に加えて、**実行環境制約による直列化**を含む。両者は性質が異なるため、下記の対応表で区別する。

| edge | 種別 | 理由 |
|---|---|---|
| u2 → u1 / u4 → u2 / u5 → u1,u2,u3 | **技術的依存** | 上記散文のとおり。成果物の前提関係であり、環境が変わっても解消しない |
| u3 → u1 / u6 → u3 / u2 → u6 / u5 → u4 | **実行環境制約** | 本 intent の Construction は worktree 隔離ガード下のセッションで実施され、engine が repo 内に作った worktree に対する agent 自身の書込・git 操作が構造的に拒否された(cid:code-generation:c1-pcp-isolated-session-swarm-incompat)。その帰結として referee の `check` / `finalize` が駆動できず、batch 1 は `SWARM_STARTED`(audit seq 559、cap 3)まで到達したものの convergence を記録できず、後続 batch は fan-out 自体を行えなかった。**これらの unit 間にファイル交差も成果物依存も無く、隔離ガードの無いセッションでは並行実行可能である** |

環境制約 edge は**実際の実装順**(u1 → u3 → u6 → u2 → u4 → u5)を写したものであり、恣意的な直列ではない。u1/u3/u6 は同一 batch として `prepare` されたが逐次に実装され、u2 が単独 batch、u4/u5 が最後の batch として続いた。

環境制約 edge を graph へ書くのは、engine のプラン乖離ガードが「プランを実行に合わせて訂正する」ことを唯一の in-band な exit として要求するためである(`amadeus-orchestrate.ts:5490-5495` — ガードは `SWARM_UNIT_CONVERGED` 行か DAG の直列化のどちらかしか受け付けず、裁定を消費する経路を持たない)。選挙 E-CGDRIFT(2-0、GoA 2x2)は当初「申告して進む」を採ったが、その道が機械的に実行不能であることが実測で判明したため、ユーザー裁定により本経路へ切り替えた。**後続 intent が本ファイルを並行化の判断材料に読む場合は、上表の「種別」列を必ず参照すること** — 環境制約 edge は本 intent 固有の実行条件の記録であり、unit の性質ではない。

```yaml
units:
  - name: u1-autonomy-core
    kind: service
    depends_on: []
  - name: u3-question-route-observability
    kind: service
    depends_on: [u1-autonomy-core]
  - name: u6-plugin-docs-drift
    kind: spec
    depends_on: [u3-question-route-observability]
  - name: u2-birth-declaration
    kind: service
    depends_on: [u1-autonomy-core, u6-plugin-docs-drift]
  - name: u4-conduit-parity
    kind: service
    depends_on: [u2-birth-declaration]
  - name: u5-measurement-report
    kind: spec
    depends_on: [u1-autonomy-core, u2-birth-declaration, u3-question-route-observability, u4-conduit-parity]
```

## ファイル交差の目録(並行化判定の根拠)

| Unit | 主要編集面 | 交差 |
|---|---|---|
| u1 | amadeus-intent-autonomy-production.ts / amadeus-bolt.ts / amadeus-audit.ts / otel/event-registry.ts / audit-format docs(knowledge/amadeus-shared/audit-format.md 面) | u2 と amadeus-orchestrate.ts で非交差(u1 は触らない)。u4 の docs 面(SKILL/commands/README/docs/reference/24/stage-protocol)とはファイル単位で非交差 — かつ DAG の推移的直列(u4→u2→u1)により並行衝突は構造的に不発(Review iteration 1 NIT 是正) |
| u2 | amadeus-orchestrate.ts / amadeus-utility.ts / t449・t450 | u1 と非交差 — ただし論理依存あり(DAG どおり直列) |
| u3 | amadeus-log.ts | 全 Unit と非交差 — u1/u2 と並行可 |
| u4 | harness 正本群 / stage-protocol.md / docs / 新テスト | コード Unit と非交差 |
| u5 | record 内レポートのみ | 非交差 |
| u6 | plugins/*/stages/*.md | 非交差 |

本表はトポロジーの記述であり、ビルド順・クリティカルパスの経済判断は 2.8(delivery-planning)が本 DAG を入力に行う。
