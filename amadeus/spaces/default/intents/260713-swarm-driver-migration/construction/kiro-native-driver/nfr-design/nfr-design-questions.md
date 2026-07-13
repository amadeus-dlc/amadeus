# Kiro Native Driver NFR Design Questions

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`は、balanced waves、least-trust runtime roles、V2 session evidence、serial C-08/C-11 gate、park/fallback境界を確定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. 4 Unitを超えるbatchをどう分割するか

[Answer]: `waveCount=ceil(n/4)`、`base=floor(n/waveCount)`、先頭`remainder` waveへ1件加算する決定的balanced splitを使う。入力順を保つ連続sliceで、各wave 2〜4件、差1以下、flatten exactとする。

### Q2. waveを並列実行するか

[Answer]: 実行しない。同時active waveは最大1件で、前waveのC-08 native evidenceとconductor-recorded C-11 checkが両方greenになった後だけ次waveをarmする。dynamic rebalanceも行わない。

### Q3. native childを何で証明するか

[Answer]: baseline後new parent session exactly 1、expected worker roleを持つdistinct child session、parent relation、versioned completed terminal、process/parent terminal、capture sealをUnit-role-child全単射へAND結合する。session file、summary、default agent、自己申告だけでは成立しない。

### Q4. runtime agent configを誰が作るか

[Answer]: C-07はclosed materialization planをpureに返し、U-02が予約pattern内へexclusive createし、digest/realpath/ownerをcheckpointしてarm後、terminal/capture seal後にowner一致でcleanupする。global agentや既存configを変更しない。

### Q5. parent/workerの権限をどう分けるか

[Answer]: parentはread/thinking/subagentだけ、workerはread/write/thinkingだけとする。parentのtrusted/available agentはexpected 2〜4 role exact set、worker read/write pathは担当worktreeだけで、shell/AWS/MCP/nested delegation/`--trust-all-tools`を禁止する。

### Q6. known-unavailableとunknown profileをどう区別するか

[Answer]: 既知V2 profile上のCLI/auth/trust/agent materialization unavailableだけを明示hard error、`auto`のpre-dispatch floor対象にする。parent relation、completed terminal、stdin ingestion、V2 schemaをprofile化不能、V3-only、unknown schemaならdriver選択にかかわらずU-05をparkし、floorへ変換しない。

### Q7. Kiro CLIとIDEで実装を分けるか

[Answer]: 分けない。両harnessは同じC-01/C-07 contractと外部`kiro-cli` V2 wave processを使い、conductor projectionだけを共有する。IDE `invoke_sub_agent`と既存CLI fan-outはfloor/legacyのままにする。

### Q8. infrastructureを追加するか

[Answer]: 追加しない。installed CLI、project-local attempt-owned config、local session storeを使い、SDK、direct API、daemon、queue、cloud resourceを追加しない。

## 曖昧性分析

- 1 Unitはnative precondition違反であり、1件waveを生成しない。
- session inventoryはprovider-state sourceだがraw conversationを正本としてAmadeusへ保存しない。
- C-07/C-08はC-11を呼ばず、conductorがwave evidence/check resultとfinalize二相を媒介する。
- dispatch後failureはknown/unknown profile分類に関係なくfloorへfallbackしない。
