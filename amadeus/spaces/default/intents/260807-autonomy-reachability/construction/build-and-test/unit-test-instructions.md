# Unit Test Instructions — autonomy-reachability(#2378)

上流入力(consumes 全数): 6 unit の `code-generation-plan.md`(テスト番号の予約と受け入れ基準)と `code-summary.md`(実際に追加したテストと実測結果) — u1-autonomy-core / u2-birth-declaration / u3-question-route-observability / u4-conduit-parity / u5-measurement-report / u6-plugin-docs-drift。

## 層の分け方

**純関数だけを unit 層に置く。実 FS を触る検証は最初から integration 層へ置く**(`cid:code-generation:fs-tests-integration-first`) — size purity 静的判定(ratchet)が fs トークンで medium を要求するため、後からの分割是正はレビューイテレーションを消費する。

**in-process 駆動(spawn 盲点回避 = 計測の軸)とテスト層(配置の軸)は独立**である。実 FS を触る in-process テストは integration 層に置いたまま lcov 有効。

## 本 intent の unit テスト

| テスト | unit | 何を固定するか |
|---|---|---|
| `tests/unit/t483-non-auto-decided-kinds.test.ts` | u1 | 自動裁定の対象外となる interaction kind の列挙。プレビューが `stage-gate` / `question` 以外を auto-decided と誤って提示しないこと |
| `tests/unit/t452-authorize-interaction-semi.test.ts`(既存) | u1, u4 | semi が `question` と phase 内 stage gate を semi-authority で認可し、phase boundary は人間必須のままであること。u4 の導線文言が主張する semi の範囲の裏付け |

u2 の判定ロジックは `classifyBirthAutonomyFlag` / `resolveBirthAutonomyDeclaration` / `strandedCarryRefusal` として in-process seam に切り出してあり、これらを直接呼ぶことで spawn 盲点(`bun --coverage` が子プロセスを計測しない)を回避している。seam は **既に計測実績のあるモジュール**へ置く(`cid:code-generation:seam-placement-measured-module`) — spawn-only の CLI モジュールを coverage 目的で import すると、そのファイルの全行が 0-hit で lcov に載り patch 行が absent→missed へ反転する。

## 実行

```sh
bun test tests/unit/<file>
```

複数 path を並べる場合は、実行前に**全 path の実在を機械確認**し、実行後に期待ファイル数と runner の `Ran ... across M files` を照合する(`cid:build-and-test:test-path-set-completeness`) — Bun は不存在 path を無音で除外したまま exit 0 になりうるため、green だけでは意図した母集団の全数実行を保証しない。zsh では path 集合を**配列で展開**する(未クォート変数は単語分割されず全体が1語として解決される — `cid:build-and-test:bt-path-existence-array-expansion`)。

## Coverage 上の注意(本 intent で実際に踏んだもの)

- **型注釈行・多行型キャスト**は実行時に消去され、union merge 下で DA:0 に残る → 型は**モジュールスコープへ巻き上げ**、lazy require のキャストは `typeof` 束縛の1行形にする(u1 で実施)
- **関数本体内の standalone コメント行**も恒久 DA:0 になりうる → 説明コメントは関数宣言直上へ置く
- **`process.exit()` で終わるハンドラに隣接する行**は in-process で駆動できない → ガードを呼び出しと同一行へ畳む(u3 の malformed-id 分岐で実施)
- **bare な `case` ラベル行**は union merge で DA:0 に残る → 同一行に文を置く
