# RE 差分リフレッシュ記録: 260801-cg-plan-guard

上流入力(consumes 全数): なし(RE は起点。入力は Issue #1892/#1893 と scope-document)

- Date: `2026-08-01T08:15:00Z`
- Base commit: `c49e385ac`(前回 observed、祖先性 exit 0)
- Observed commit: `cb809c4dec912e594204cdfe56582e2303159dbe`(origin/main tip)
- Distance: `22 commits`(open-bug-batch-5 の6 PR+record、otel-meta U1 #1899、docs 2件、metrics 往来)
- Scope: `self-feature`、Brownfield、単一 repo
- Scan mode: conductor の focused live scan(患部3点の verbatim 直読)+ #1893 クロスレビュー2名(進行中 — 成立後 RA で消費)

## ガード患部の確定(observed `cb809c4de`)

### 1. directive 発行側(M1/M3 の実装点)

`packages/framework/core/tools/amadeus-orchestrate.ts:2919-` `tryEmitSwarm`:
- `:2937` `if (!batches || batches.length === 0) return false;` — **bolt_dag 不在時の無音 false**。呼び出し元は false を受けて per-unit 直列 directive へ降格する。ここが「並列計画→直列実行」の無音経路であり、M4(null fail-closed)と M1(発行側ガード)の主実装点。
- `:2938` `firstUncoveredBatch`(`:2843-`)— batch 選定は unitCovered(成果物実在)基準。計画幅と実行形態の突合はどこにも無い。
- swarm 条件: `node.for_each === SWARM_FOR_EACH && node.mode === SWARM_MODE` + skeleton-gate 除外 + autonomy 非 null。autonomy null でも無音 false(`:2934`)— ラダープロンプト前の未設定期は per-unit 降格が現行仕様(ガード設計時に区別要)。

### 2. bolt_dag 計算(M4/M6 の実装点)

`packages/framework/core/tools/amadeus-runtime.ts:300-313` `computeBoltDag`:
- parse 失敗時 `process.stderr.write(...bolt_dag node omitted)` + `return undefined` — **stderr advisory は spawnRecompile の `stdio: "ignore"`(amadeus-plugin.ts、#1877 レビューで実測確定)に飲まれ実質無音**。fail-closed 化の患部。
- ファイル不在時も `undefined`(`:302`)— degrade スコープの正常系。「計画が並行幅を宣言しているのに undefined」との区別が M4 の判定核心。

### 3. edge block parser(#1893 の患部)

`packages/framework/core/tools/amadeus-lib.ts:7823-` `parseUnitsBlock`:
- 受理形式は `- name: <unit>` +(任意)`depends_on:` / `kind:`。`- id:` 形式は name 不一致で throw(親 `parseBoltDag` が catch し `computeBoltDag` の undefined 経路へ)。
- `:7943` が唯一の呼び出し元(parseBoltDag 内)。

### 4. 実績突合の一次証拠(M2)

audit の SWARM 系イベント(`amadeus-swarm.ts:325-327` — SWARM_STARTED は prepare で batch ごとに1回、SWARM_DEGRADED も prepare、SWARM_COMPLETED は finalize)。CG 成果物のタイムスタンプは並行性の証拠にならない(#1892 検出限界の申し送りどおり)— approve 突合は audit イベントを一次証拠とする。

## 区間の構造変化(c49e385ac → cb809c4de)

- open-bug-batch-5 の6修正が着地(mirror 対称化・state 再構築・fatal-latch/mutation ガード・probe merge-aware・graph 保存化+CI compile --check・metrics transient 分類・mirror title intent-dir 化)。**orchestrate.ts / runtime.ts は区間内無変更(diff 0)、lib.ts のみ touch あり(#1873 の writer 抽出、+202)だが parseUnitsBlock 本体は不変**(git diff --stat 実測、E-CPG-RES13 投票者2の訂正を反映)。患部引用は observed `cb809c4de` で verbatim 直読済み(= 再解決の実施であり免除の適用ではない)。
- probe の merge-aware 化(#1886)により「audit shard の fork/merge 語彙」が M2 実装の直近先例になった(AUDIT_FORKED/AUDIT_MERGED の観測パターン)。

## corpus(#1892 調査の再利用)

- 計画不履行4件: 260722-election-core-promotion(最明確)/ 260724-mirror-auto-modes / 260717-test-pyramid-rebuild / 260720-upstream-sync-230(部分)
- 正当直列6件: delivery-planning に理由記録あり(ファイル交差 c6 / skeleton 順序 / 実験隔離 / swarm 構造不能 / conductor 裁量明記)
- #1893 現物: 260712-metrics-observation の edge block(`- id:` 形式)
- M7 の sweep はこの 10+1 record を最小 corpus とする(読み取り専用)。

## テスト採番

現最大を実測のうえ units-generation 段で予約する(本 RE では未予約 — 並行 intent の採番と衝突しないよう実装直前に確定)。

## RA へ送る裁定事項

1. **#1893 修正方向**(クロスレビュー証拠待ち): (A) parser 受理拡張(`- id:` を alias 受理) / (B) record 訂正+loud 拒否(形式仕様の正本を 1 形式に保つ)。M4 の fail-closed 化と整合するのは B 寄りだが、他 record の同型分布(レビュー r2 の sweep)を見て確定。
2. **autonomy null 期の扱い**: tryEmitSwarm は autonomy 未設定でも無音 false — ガードは「bolt_dag が並行幅を宣言 && autonomy 未設定」をどう扱うか(ラダープロンプト誘導 vs 発動除外)。
