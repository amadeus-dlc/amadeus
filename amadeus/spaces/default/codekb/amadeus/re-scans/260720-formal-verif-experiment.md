# リバースエンジニアリング per-intent scan note: 260720-formal-verif-experiment

## 実行メタデータ

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `1865bc902ff5ecb1e51caefc339aae18e015431b`(`git rev-parse HEAD` 実測一致。merge commit — origin/main 取込後の断面)
- Intent: `260720-formal-verif-experiment`(選挙 CLI(`scripts/amadeus-election*.ts`)に対する形式検証(property-based testing / モデル検査)実験ハーネスの実現可能性 RE。既知の 5 欠陥修正(#1268 / #1273 三系 / #1277)を「型緑・意味赤」の外科的注入面として使い、PBT・モデル検査が各欠陥を検出できるかを CI/coverage 両ゲート上で実証する実験の下地を観測する)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。`re-scans/*.md` 43ファイルを `Observed at` / `Observed commit` / 既存小文字ヘッダの様式差込みで全数走査し、観測 SHA を抽出できた42ファイルについて HEAD `1865bc902` への祖先性と距離を機械照合した。自己 scan を除く祖先 observed の距離最小は `re-scans/260719-goa-multiseg-ecode.md` および `260719-cursor-complete-clear.md` の `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`git merge-base --is-ancestor a326f47bc 1865bc902` exit 0、`git rev-list --count a326f47bc..1865bc902`=**29**)であり、これを base に採用(rescan-base-ancestry)。直近と誤認した非祖先 observed `c2e4975ff` の merge-base `bd147dc7b`(距離47)を使う必要はなかった。observed=`1865bc902`。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `1865bc902` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間コミットの実質構成は `git log a326f47bc..1865bc902` から導出。件数(区間29)はコマンド出力からの転記(numbers-from-command-output-only)。

区間 `a326f47bc..1865bc902` の選挙 CLI 5正本への変更は3コミット(#1268=`ea6acac53` / #1273=`a6f4a4522` / #1277=`e1fd1826b`)・4ファイル(model / store / record / 本体。transport は変更0件)。これらは本実験で再注入する既知5欠陥を修正したコミットそのものであり、Observed 直読で確定した注入面・行番号・分離可能性を支持する。区間外の Bolt 1-5 を実質構成に含めた旧記述を訂正した。

## フォーカス面知見

### 現行構造(選挙 CLI = 5ファイル計1745行)

- **model**(464行、純ドメイン): 7状態 `ElectionState` :39-46 / 7クラス `BallotError` :99-106 / `Goa` ブランド型 :26-35 / `TallyResult` winner 形 :411-418 / `tally` :427-464 = `resolveBallots` :431 → GoA 集計 → first-match hold(block :442 / discussion :443 / quorum :444)→ choice winner :448-463。
- **store**(261行): tmp+rename、fail-closed。
- **record**(224行、純 render/verify): `verifySelf` receipt 軸 :212-213 / `GoaLineCode` `^E-[A-Z0-9]+$` :34。
- **transport**(207行): `VoterTransport` port :78-80 / agmsg spawn :134-152 / `DeliveryRecord` private brand :61-70。
- **本体**(589行): `TRANSITIONS` :153-158(4遷移)+ `tallied→hold` 上書き :177-181 / `HOLD_RESOLUTIONS` :69-74 / `directiveFor` :121-149 / `parseGoaLine` import :46。

### 5欠陥の注入面(全て型緑・意味赤の外科的注入)

1. **#1268 winner=GoA 軸**: model `tally` :445-463 の winner 選定を favor/against 判定へ差替(`TallyResult` 新型は維持)。分離可能性=高。
2. **#1273-2a invalid-timestamp**: model :253 の1行(`isValidSubmittedAt` チェック)削除。分離可能性=高。
3. **#1273-2b amend 経路**: `parseKindRef` :194-203 を常に original 返却化、または store :150-158 の unknown-ref check 削除。分離可能性=中(2a と `parseBallotShape` を共有するが注入点は非交差)。
4. **#1273-2c per-voter resolution**: model :431 + 本体 :381, :459 の `resolveBallots` 呼出3点を生 ballots へ差戻し。分離可能性=高。※2b と意味連鎖あり(2c 単独観測には 2b 残置が正しい隔離)。
5. **#1277 timeline 軸**: record :212-213 の `receivedAt ?? at` → `at` 差戻し(2行)。分離可能性=高。

### テスト基盤

- 選挙テスト: unit t234 / t238 / t239、integration t235 / t236 / t240 / t242、e2e t237 / t241。
- 選挙テストに fast-check 使用は**ゼロ**。
- PBT 参照様式は3本(setup-semver / setup-manifest / t204): 固定 `PBT_SEED`、`numRuns` 100、`AMADEUS_PBT_DEEP=1` で 50k、`.pbt.test.ts` は dist コピー import の unit 層。
- 層=ディレクトリ(run-tests.ts :829-836)。

### CI

- `ci.yml` の `test:ci` = smoke + unit + integration のみ(**e2e 除外**、package.json:15)。
- coverage patch gate は `scripts/` も対象。
- **t241(機械実行器)は「CI-resident」自称(:2-6)だが PR CI で未実行 — FR-0 意図との乖離(確信度=高)**。
- 実験ハーネスは unit/integration 層配置で CI + coverage 両ゲートに載る。
- TLC spawn は integration 層 + 可用性ガード(claude CLI self-skip 同型)が既存パターン。

### codekb 矛盾

- `architecture.md` / `code-structure.md` に選挙 CLI 構造の記述なし(矛盾なし)。
- 選挙詳細は re-scans 管轄(`260718-election-ts-foundation` / `260719-tally-choice-ruling` / `260719-ballot-failclosed-amend` / `260720-ballot-received-at` が現存、HEAD 実測と一致)。

### scratch 隔離

- CLI `--project` override 実在(本体 :577-578)。scratch 実験を実 record 非汚染で回せる。

## Delivery boundary

- 実装・修正コード、`bun scripts/package.ts` / `promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- 本 scan は観測のみ。区間フォーカス正本には既知5欠陥を修正した3コミット・4ファイルの変更があり、その現行断面から逆変換可能な注入面を確定した。codekb body 8成果物は全点温存(churn 回避、cid:reverse-engineering:c1)。実質の新規知識は「5欠陥の型緑・意味赤な注入面確定」「選挙テストの fast-check 不在と PBT 参照様式3本」「t241 の CI-resident 自称と PR CI e2e 非実行の乖離」「`--project` override による scratch 隔離可能性」の1クラスタのみで、本 re-scans に集約。
