# Codex Native Driver NFR Requirements Questions

## 判定

`business-logic-model.md`と`business-rules.md`は、runtime model resolution、Ultra capability、single-parent launch、dynamic Unit role、provider/tool環境分離、hook/collaboration evidence、live proofを測定可能な契約まで確定している。共通`requirements.md`はCodex Ultraのnative proofと機密性を要求し、brownfield `technology-stack.md`は`codex exec` processとBun/TypeScript基盤を示す。追加の製品判断は不要である。

## 確定済み回答

### Q1. probe deadlineとprovider runtime SLOをどう区別するか

[Answer]: native batch runtime、model latency、token消費にSLOは置かない。probeはCLI/app-server/config各5秒、catalog/auth/hook各10秒、behavior handshake 30秒を各stepの上限とし、1 candidateの総deadlineを45秒に閉じる。各stepは残りbudgetを超えない。

### Q2. Codex Ultraを何で証明するか

[Answer]: 同一`ProbeBinding`に束縛したcatalogのliteral `ultra`、effective config、model未pin handshake、actual SessionStart exact model、single parent JSONL、terminal collaboration item、SubagentStart/Stop hookをANDで要求する。model名、説明文、xhigh/max、feature flag、自己申告は代替にしない。

### Q3. Unit数に対して何processを起動するか

[Answer]: native batchごとに`codex exec --json` parentをexactly 1 process起動し、Unitごとにexactly 1 dynamic role/subagentを同じparent内で委譲する。Unit別`codex exec`は既存floorであり、`codex-ultra` native successにしない。

### Q4. provider認証とmodel-generated tool環境をどう分離するか

[Answer]: provider/root hookには通常のprovider auth環境と固定5 correlation keyを渡す。一方、model-generated command/subagent shellは`inherit=\"none\"`からsafe PATH、record-local scratch HOME、localeだけを構成し、auth、実HOME/CODEX_HOME、correlation、TMPDIR、evidence rootを見せない。

### Q5. evidence rootとraw payloadをどう保護するか

[Answer]: evidence rootはcwd、全worktree/add-dir、scratch HOME、sandbox tempの外に置き、model toolのread/write/listを拒否する。hookは0700 root/0600 owner markerを検証し、ID/role/model/statusのallowlistだけをatomic recordにする。prompt、message、reasoning、transcript、raw JSONLは保存しない。

### Q6. version/schema drift時にどうするか

[Answer]: app-server、hook discovery、collaboration itemのwire pathはversioned `CodexSurfaceProfile`に閉じる。unknown field/itemはcountだけを診断し、required eventの代替にしない。official meaningへ投影できない、hook trust/env isolationを実証できない場合はU-04をparkし、floor/xhighで埋めない。

### Q7. platformとrelease proofは何を必須にするか

[Answer]: macOSでruntime-resolved Ultra modelと2 Unit以上のcredentialed live proofを必須にする。GitHub Actions Linuxはfake app-server/exec/hook、failure injection、package検査を必須にし、Windowsは対象外とする。auth不足、skip、unknown schema、untrusted hookをpassにしない。

## 曖昧性分析

- runtime resolved modelを使うため、特定model slugをNFR/実装定数へ固定しない。
- probeの45秒とnative batch runtimeは別の測定境界であり、実行時間/token SLOなしと矛盾しない。
- model handshake、stream collaboration、hookの三系統をANDにし、SubagentStopまたは成果物だけのsuccessを禁止する。
- C-06はprovider固有projection、U-02/C-08/C-11はprocess/verdict/convergenceを所有し、責務が重複しない。
