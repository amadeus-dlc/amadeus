# Functional Design Questions — runtime-recovery

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 一次同期根拠: upstream commits `51b515a`（bolt DAG self-heal）と`48306cc`（approve-time gate revision backstop）。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T11:46:56Z`。

## 質問不要の根拠

U02の設計判断はFR-1 items 1–2、NFR-2/NFR-3、C2公開seam、U02制約とupstream一次差分で閉じている。

- unit dependency成果物をUnit DAGの正本とし、runtime graphのcacheが欠落・空・malformedまたは正本と不一致なら、同じpure parserでbatchをin-memory再計算する。
- dependency成果物が存在しないscopeだけは既存single-iterationへdegradeする。成果物が存在するのに読取/parse不能なら非Unit loopへ黙って降格せずloud errorにする。
- recovered DAGはper-unit iteration、approve-side coverage guard、swarm batch selectionの全consumerで共有し、consumerごとのfallbackを作らない。
- `next`のread-only契約を維持してruntime graph自体は書き換えず、次回runtime compile transitionがcacheを修復する。診断は一度のstderr noteで明示する。
- gate revision backstopはapprove transaction内で、organic gate-open（なければstage-start）、human turn、declared produces artifact update、次human approvalの順序をauditから検出する。
- 条件成立時だけRevision Countを1増やし、Recovered=trueの`GATE_REJECTED` / `STAGE_REVISING`（および再entry）をapprove前に一度だけ補完する。既に記録済み、reviewer append、non-produces更新、autonomous、clean single-passは補完しない。
- recovery不能・拒否時に部分state/auditを書かず、再実行で二重auditを作らない。

これらは承認済み契約を既存orchestrate/state/audit lock choke pointへ適用する作業であり、新規仕様判断はない。現行contractとの衝突が見つかった場合だけ停止し、選挙へ付議する。

## 追加裁定 — audit transaction

初回reviewで、既存の1行単位`emitAudit`を5回呼ぶ設計では中間失敗時に部分auditが残り、上記のno-partial契約と衝突することが判明した。この実コード上の未決判断を`E-USSU02FD1`へ付議し、A「5行を単一batch appendし、成功後にstateを1回write」を3-0（GoA favor 3 / against 0）で採用した。recordは`amadeus/spaces/default/elections/E-USSU02FD1/record.md`。

採用案には次の留保を必須条件として含む。

- recovered 3行と通常approval 2行の5 blockを全て事前生成・検証し、既存audit lock内の単一audit commitとして適用する。
- lock内で既存1行emitを5回呼ぶ実装や、partial writeを許し得る単純な`appendFileSync` 1回への言い換えは禁止する。
- batch生成またはappend失敗時はaudit/stateの両方を呼出前bytesに保つ。
- batch成功後にstate writeが失敗した場合、再実行は完全な5行batchを検出して重複追記せず、stateだけを収束させる。
- 生成・検証・commit・state writeの各failure boundaryと再実行をfailure injectionで固定する。

## [Answer]

[Answer]: 当初は質問0問で可としてE-OC1でleader承認済み（`2026-07-20T11:46:56Z`）。その後、初回reviewでaudit atomicityの現行contract衝突が見つかったため停止し、`E-USSU02FD1`でA「検証済み5行の単一audit commit後にstateを1回write」を3-0で採用した。上記留保を含めて設計へ反映する。
