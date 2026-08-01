# e2e 実測記録 — u8-e2e-acceptance(S1/S2 先行分)

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

本書は FR-E1(advisory 到達)と FR-E2(チェックポイント両貫通)の e2e 実測記録である。u8 の FD `business-logic-model.md` の S1/S2/S4/S5 に対応し、S3(新規モデル到達 — u7 MirrorLifecycle)は u7 Phase B 未着地のため本書の範囲外(後続指示待ち)。

すべての数値・出力は実行由来である(I1 — 手書きイベント・演出なし。numbers-from-command-output-only)。

## 測定条件

- **測定 ref(HEAD SHA)**: `849f8ce0a4597e96e0bb8376825a29e2388a39ce`(measurement-ref-in-artifacts)
- **worktree**: `.amadeus/worktrees/bolt-u8-e2e-acceptance`(ブランチ `bolt-u8-e2e-acceptance`)
- **実測日**: 2026-08-01(UTC 07:17Z〜07:22Z)
- **compose 状態**: `.claude/.amadeus-plugin-composition.json` に `formal-model-check`(stageIndex: `formal-model-check`)が実在 — 判定器の第1ゲート(compose 済みか)は充足済み。u4 の compose を追加実行する必要はなかった。

### 実測で確定した plugin host root

```
hostRoot = /Users/.../.amadeus/worktrees/bolt-u8-e2e-acceptance/.claude
composed = true
```

`pluginActivationHostRoot()`(amadeus-orchestrate.ts:1286)は `process.env.AMADEUS_PLUGINS_HOST_ROOT ?? dirname(TOOLS_DIR)` を返す。env 未設定の実運用では **ハーネスディレクトリ(`.claude/`)** が host root になる。この事実が S4-1(後述)の起点である。

## S1: advisory 到達の e2e(FR-E1)

### S1-a: `never-run` 判定の advisory が directive JSON に載る(CP1)

コマンド(worktree ルートで実行):

```
bun .claude/tools/amadeus-orchestrate.ts next --stage requirements-analysis --single
```

exit code: `0`

stderr(人間チャネル)verbatim:

```
advisory: formal-model-check has no recorded verdict (specs/tla) — run /amadeus --stage formal-model-check
```

stdout directive JSON の `advisories` フィールド verbatim:

```json
{
  "kind": "run-stage",
  "stage": "requirements-analysis",
  "advisories": [
    {
      "plugin": "formal-model-check",
      "code": "never-run",
      "message": "advisory: formal-model-check has no recorded verdict (specs/tla) — run /amadeus --stage formal-model-check",
      "stage": "requirements-analysis"
    }
  ]
}
```

FR-B2(機械チャネル)と L5(stderr 併用は付加であって置換でない)が両方成立している。`stage` フィールドは発火した checkpoint 名を正しく載せる。

### S1-b: `current` 判定は完全に沈黙する

`recordActivationVerdict` で verdict を記録した直後に同じコマンドを実行:

- stderr の `advisory:` 行数: `0`
- stdout directive に `advisories` フィールドが**存在しない**(空配列ではなく欠落 — `'advisories' in d` が `false`)

amadeus-directive.ts:143-146 の「Present ONLY when non-empty」契約どおり。

### S1-c: `changed` 判定の advisory(CLI 経由)

watch 対象の spec 集合へ意味のある変更(`\* u8 e2e: meaningful spec change injection` の1行追記)を注入し、ラッチを消してから再実行:

exit code: `0`

stderr verbatim:

```
advisory: formal-model-check spec hash CHANGED (specs/tla) — run /amadeus --stage formal-model-check
```

stdout `advisories` verbatim:

```json
[{"plugin":"formal-model-check","code":"changed","message":"advisory: formal-model-check spec hash CHANGED (specs/tla) — run /amadeus --stage formal-model-check","stage":"requirements-analysis"}]
```

**重要な限定**: この `changed` 実測は、watch 対象ディレクトリ(= host root 相対の `specs/tla/`、実測では `.claude/specs/tla/`)へ spec を配置した条件下でのみ得られた。リポジトリルートの実 spec(`specs/tla/FormalElection.tla`)への変更では `changed` に到達しない — S4-1 を参照。実験用に作成した `.claude/specs/` と `.claude/.amadeus-plugin-activation.json` は実測後に削除済み(falling-proof-injection-one-set: 注入 → 実測 → 撤去を不可分の1セットで実施)。

### S1-d: formal-model-check ステージへの到達

```
bun .claude/tools/amadeus-orchestrate.ts next --stage formal-model-check --single
```

exit code: `0`、directive verbatim:

```json
{
  "kind": "run-stage",
  "stage": "formal-model-check",
  "stage_file": ".claude/plugins/formal-model-check/stages/formal-model-check.md"
}
```

compose 済み plugin ステージが `--stage` で解決され、composed plugin のステージファイルへ正しくルーティングされる(FR-7(a) の実運用面)。

### S1-e: TLC verdict 到達(実探索)

ステージ本文 Step 2 のコマンドを実行:

```
bun plugins/formal-model-check/tools/run-model-check.ts \
  --model specs/tla/FormalElection.tla \
  --cfg   specs/tla/FormalElection.cfg \
  --out   <scratch>/u8-tlc-run1
```

exit code: `0`。CLI 出力 verbatim:

```
{"schema":"amadeus.run-model-check.v1","runId":"68a52a54-7bc8-4e11-8b12-21a0d11cad82","outcome":"NOT_DETECTED","exitCode":0,"errorCode":null,"counterexampleIdentity":null}
run-model-check: NOT_DETECTED
```

完全探索の成立証跡(`finite-exploration-not-detected-proof` が要求する completion marker + state 統計の両方):

`completion-marker.json`:

```json
{
  "complete": true,
  "runId": "68a52a54-7bc8-4e11-8b12-21a0d11cad82"
}
```

TLC stdout の探索統計 verbatim:

```
5203730 states generated, 529692 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 9.
Finished in 104208ms at (2026-08-01 07:22:06)
```

`env-receipt.json` の inspections: `image-digest` = not-applicable(Darwin sandbox-exec)、`jar-sha256` / `network-deny` / `jdk-snapshot` / `sandbox-profile` の4件が `passed`。verdict は実 TLC 出力由来であり、ハードコード値ではない(NFR-3)。

### S1-f: audit イベントの状況(未充足 — conductor への引き継ぎ)

FD S1 が求める「audit の formal-model-check ステージイベント ≥1 件」は**本 Unit の権限内では産出できなかった**。実測事実:

- 本作業の全 `next --single` 実行および TLC 実行の前後で、audit shard の行数は `857` のまま不変。
- 差分に現れた seq 847〜857 は、本作業の開始前(UTC 05:32:35Z〜07:14:50Z)に conductor 側の Bolt fork が書いたもの(`GATE_APPROVED` / `SUBAGENT_COMPLETED` / `HUMAN_TURN` ×2 / `SWARM_STARTED` ×2 / `ERROR_LOGGED` / `WORKTREE_CREATED` / `BOLT_STARTED` / `STATE_FORKED` / `AUDIT_FORKED`)。本作業に起因するイベントは1件もない。
- 機序: `STAGE_STARTED` の発火点は `amadeus-jump.ts:590-592`(および advance 側)であり、`next` は directive を stdout へ出すだけで audit を書かない。ステージイベントは conductor の `report`/advance 経路からのみ生まれる。

本 Unit のディスパッチは `report` / `approve` / state 変更 verb を禁じているため、この証跡の産出は conductor の作業である。**S1 の完了判定にはこの1件が残っている**(bt-workflow-completion-substance-gate — 機構の実測 green を実体完了と同一視しない)。

## S2: チェックポイント両貫通(FR-E2)

3 checkpoint(`requirements-analysis` / `functional-design` / `build-and-test`)は `ACTIVATION_ADVISORY_STAGES`(amadeus-orchestrate.ts:1301-1305)で定義される。実測は `--single` 経路(`emitSingleRunStage` の第2配線、amadeus-orchestrate.ts:3484)で行った。

### CP1(requirements-analysis)

S1-a / S1-c に記載のとおり `never-run` / `changed` の両コードで発火。`stage` フィールド = `"requirements-analysis"`。

### CP2(functional-design)

ラッチを消した新規 run で実行:

- `never-run` コード:

```json
{
  "kind": "run-stage",
  "stage": "functional-design",
  "advisories": [
    {
      "plugin": "formal-model-check",
      "code": "never-run",
      "message": "advisory: formal-model-check has no recorded verdict (specs/tla) — run /amadeus --stage formal-model-check",
      "stage": "functional-design"
    }
  ]
}
```

- `changed` コード:

```json
[{"plugin":"formal-model-check","code":"changed","message":"advisory: formal-model-check spec hash CHANGED (specs/tla) — run /amadeus --stage formal-model-check","stage":"functional-design"}]
```

CP1 と CP2 の両方が、両コードで、directive JSON へ載ることを実測した。**FR-E2 の両貫通は機構面で成立**(audit 証跡面は S1-f と同じ未充足が残る)。

### ラッチ挙動(同一 run 内の重複抑止)

同一 run(同一 session leaf)で連続実行した実測:

| 実行順 | stage | 結果 |
|---|---|---|
| 1 | requirements-analysis | advisory 発火(stderr 1行 + directive `advisories`) |
| 2 | functional-design | 抑止(stderr `advisory:` 行数 `0`、`advisories` フィールド欠落) |
| 3 | build-and-test | 抑止(同上) |
| 4 | scope-definition(非 checkpoint) | 発火なし(そもそも checkpoint 集合外) |

ラッチマーカーの実在(実測):

```
amadeus/spaces/default/intents/.amadeus-advisory-latch/no-session/formal-model-check.never-run
```

内容(単一行のタイムスタンプ):

```
2026-08-01T07:17:23.833Z
```

`changed` コードでの run では `formal-model-check.changed` マーカーが生成された。ラッチキーは `(plugin, code)` であり **checkpoint 単位ではない** — 設計どおり(business-logic-model L4「first raise per (plugin, code) wins for the run」)。したがって1つの run では3 checkpoint のうち最初の1点でしか advisory は出ない。CP2/CP3 単独の発火を観測するにはラッチ leaf の消去(= 新しい run)が必要だった。

セッション leaf が `no-session` になっているのは、本 worktree に `active-intent` カーソルが無く `readCurrentSessionId` が null を返すためで、`advisoryLatchDirForRun` の設計どおりの fallback である。

## S4: 発見事項

BR-U8-3 の3値判定に従って分類した。

### S4-1【重大 / (ii) 仕様・設計判断を要する — 未修正、Issue 起票を提案】spec-hash watcher の watch root が実 spec 位置と乖離し、`changed` 経路が実運用で到達不能

**実測による証明**(すべて実行由来):

```
STEP1 judgment(before verdict) = never-run
STEP2 recordActivationVerdict wrote = true
STEP3 state = {
  "schema": 1,
  "lastVerdictHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "recordedAt": "2026-08-01T07:18:32.670Z"
}
STEP4 judgment(after verdict) = {"kind":"current","hash":"sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
STEP5 injected change into specs/tla/FormalElection.tla bytes 12999 -> 13026
STEP6 judgment(after REAL spec change) = {"kind":"current","hash":"sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
STEP7 advisories at requirements-analysis = []
```

記録された `lastVerdictHash` の `sha256:e3b0c442...b855` は **空入力の SHA-256** である。つまり watch 対象のファイル集合が空だったことを意味する。

**機序**:

- `ACTIVATION_WATCH_GLOBS = ["specs/tla/**"]`(amadeus-plugin-activation.ts:41)は host root 相対で展開される(`expandGlob` の `join(hostRoot, base)`、同 :101-102)。
- 実運用の host root は `.claude/`(上記「実測で確定した plugin host root」)。
- 実 spec は **リポジトリルートの `specs/tla/`** にある。`.claude/specs/tla` は存在しない。ステージ本文 Step 2 のコマンドも `--model specs/tla/FormalElection.tla` とプロジェクトルート相対で書かれており、spec がプロジェクトルート資産であることは stage file 自身が示している。
- `expandGlob` は base 不在時に空リストを返す(:102、「a deleted spec set is a determinate, hashable state」)ため、fail-closed の網にかからず空集合ハッシュが正常値として通る。

**帰結**: 現状 advisory が出ているのは `never-run`(state ファイル不在)だからにすぎない。一度 verdict が記録されると判定は恒久的に `current` に固定され、実 spec を何度変更しても advisory は二度と出ない(STEP6/STEP7 が実測)。**FR-E1 の価値チェーン「実 spec 変更 → advisory」は実運用で不通**である。

**既存テストで検出されない理由**: t319/t320/t321/t322/t378/t381 はいずれも `AMADEUS_PLUGINS_HOST_ROOT` を、composition record と `specs/tla/` の**両方を含む合成 fixture host** に向ける。fixture 内では両者が同一ルート配下にあるため `changed` 経路が成立し、テストは 66/66 green になる。実運用の配置(composition record は `.claude/`、spec はプロジェクトルート)は fixture に存在しない。これは #1738 (d) が問題視した「機構は green だが価値に届かない」構造そのものであり、`cid:code-generation:corpus-sweep-for-new-guards`(fixture green と実 corpus の乖離)の同型である。

**先行事例**: #1591(CLOSED)は「compose の書込ルート(プロジェクトルート)と engine/graph の読取ルート(ハーネスディレクトリ)の乖離」で同じクラスの欠陥。本件はその未修復の別インスタンス(activation watcher 面)。重複起票検査として `gh issue list --state all` を3クエリ(`activation spec hash host root` / `specs/tla advisory` / `pluginActivationHostRoot`)で実施し、本件に対応する既存 Issue は無い(#1738 は本 intent の親 enhancement)。

**当初の保留と、その後の裁定**: 修正には「watch glob をどのルートに対して解決するか」の決定が要る。候補は (a) spec watch のみプロジェクトルート基準にし、composition record の判定は host root のまま(2ルートの明示分離) (b) host root 自体を変える(u6 の BR-U6-9 と他 unit のテスト契約に波及) (c) watch 対象を plugin 同梱資産に移す(spec の所有者が変わる仕様変更)。いずれも u6 の着地契約に触れる設計判断であるため、`cid:requirements-analysis:implementation-deviation-election` と BR-U8-3 (ii) に従い u8 では実装せず裁定へ回した。

**conductor 裁定(2026-08-01)**: 本件は **FR-B3 既決要件への回復 = 執行クラスの glue 修正**として u8 内で実施する(ゲートで開示)。方式は候補 (a) — `specRoot = dirname(hostRoot)` を正とし、activation state file と composition record の解決は hostRoot のまま据え置く。実施内容と再実測は § S4-1 の是正(実施済み)を参照。

**Issue 起票文案**(日本語、bug / P1 / S2-CRITICAL 想定):

> タイトル: bug(formal-model-check): activation watcher の spec watch root がハーネスディレクトリで、実 spec 変更が `changed` 判定に到達しない
>
> 本文: `ACTIVATION_WATCH_GLOBS = ["specs/tla/**"]` は host root(実運用では `.claude/`)相対で展開されるが、実 spec はプロジェクトルート `specs/tla/` にある。結果として watch 集合が常に空になり、`lastVerdictHash` に空入力の SHA-256(`sha256:e3b0c442...b855`)が記録される。一度 verdict が記録されると判定は恒久 `current` になり、実 spec を変更しても advisory は発火しない(実測: 上記 STEP1〜STEP7)。既存テストは composition record と spec を同一 fixture host に置くため構造的に検出できない。#1591 と同クラス(書込/読取ルートの乖離)の別インスタンス。

### S4-1 の是正(実施済み — TDD)

#### Red(修正前の失敗実測)

新規テスト `tests/integration/t382-activation-real-layout-spec-root.integration.test.ts` を、**実デプロイレイアウト**(`<projectRoot>/.claude` を host root、`<projectRoot>/specs/tla` に spec)の fixture で先に書いた。純ヘルパー `specRootForHost` のみを追加した(未配線)状態で実行し、挙動面の赤を実測:

```
 3 pass
 2 fail
 10 expect() calls
Ran 5 tests across 1 file. [250.00ms]
```

失敗2件はいずれも欠陥の指紋(空入力ハッシュ)に着地した。実文:

```
85 |     const currentHash = judgment.kind === "never-run" ? judgment.currentHash : "";
86 |     expect(currentHash).not.toBe(EMPTY_SET_HASH);
                                 ^
error: expect(received).not.toBe(expected)

Expected: not "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

```
97 |     expect(settled.kind === "current" ? settled.hash : "").not.toBe(EMPTY_SET_HASH);
                                                                    ^
error: expect(received).not.toBe(expected)

Expected: not "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

(最初の実行はシンボル未定義の `SyntaxError: Export named 'specRootForHost' not found` で赤になったが、これは欠陥の証明にならないため、純ヘルパーだけを追加して**挙動の赤**を取り直した。)

#### Green(修正)

`packages/framework/core/tools/amadeus-plugin-activation.ts`:

- `specRootForHost(hostRoot) = dirname(hostRoot)` を新設・export。ハーネスディレクトリは常にプロジェクトルート直下にあるため、その親がプロジェクトルートになる。
- `resolveActivationJudgment` と `recordActivationVerdict` の spec ハッシュ計算を `computeSpecHash(specRootForHost(hostRoot), ...)` へ変更。
- `computeSpecHash` の第1引数名を `hostRoot` → `specRoot` へ改名(**シグネチャ変更なし**)。この関数は「渡されたルートに対して glob を解決する」ものであり、名前を実体に合わせることが2ルートの再融合を防ぐ。
- **activation state file(`.amadeus-plugin-activation.json`)と composition record の解決は hostRoot のまま**据え置き — 状態は host に属する。t382 がこの分離を明示的に pin する(`state stays on the host root, not the spec root`)。

#### 既存テスト契約の明示改訂

既存 fixture(t320 / t321 / t322 / t378 / t381)は composition record と `specs/tla/` を**同一ルート直下に置く欠陥前提レイアウト**だったため、修正により 13 件が失敗した。これらを実レイアウト(`<root>/.claude` を host、`<root>/specs/tla` に spec)へ改修した。これは pinned-behavior の**明示改訂**であり、根拠は FR-B3 の要件接地(fixture が実配置を写していなかったこと自体が欠陥の隠蔽要因)である。コミットメッセージにも宣言した。

改修内容: t320 は `projectRoot` を導入し spec 書込と直接 `computeSpecHash` 呼出をそちらへ、状態・composition は `host` に据置。t321 / t378 / t381 は `makeHost` / `makeChangedHost` を入れ子レイアウトへ、spec 上書きは `specRootForHost(h)` 経由へ。t322 は3箇所のインライン host 生成を `makeHostRoot` / `writeProjectSpec` ヘルパーへ集約し、cleanup が harness ディレクトリだけでなくツリー全体を消すよう `hostProjectRoot` を追跡。

#### 再実測(実運用レイアウト、修正後)

S4-1 の STEP1〜STEP7 を**実 worktree**(host root = `<wt>/.claude`、spec = `<wt>/specs/tla`)で再実行:

```
hostRoot = /Users/.../bolt-u8-e2e-acceptance/.claude
specRoot = /Users/.../bolt-u8-e2e-acceptance
STEP1 judgment(before verdict) = {"kind":"never-run","currentHash":"sha256:8cb8c48e1511d469190a3d3372adbc2dd8422a5aff0ec1947b241a3a91e3663d"}
STEP2 recordActivationVerdict wrote = true
STEP3 state = {
  "schema": 1,
  "lastVerdictHash": "sha256:8cb8c48e1511d469190a3d3372adbc2dd8422a5aff0ec1947b241a3a91e3663d",
  "recordedAt": "2026-08-01T09:04:42.856Z"
}
STEP4 judgment(after verdict) = {"kind":"current","hash":"sha256:8cb8c48e1511d469190a3d3372adbc2dd8422a5aff0ec1947b241a3a91e3663d"}
STEP5 injected change into specs/tla/FormalElection.tla bytes 12999 -> 13026
STEP6 judgment(after REAL spec change) = {"kind":"changed","currentHash":"sha256:82446ff70273d035e61eaabd2a5144cd1e1a00bc7e18e03b28ae6640bab699df","lastHash":"sha256:8cb8c48e1511d469190a3d3372adbc2dd8422a5aff0ec1947b241a3a91e3663d"}
STEP7 advisories at requirements-analysis = [{"plugin":"formal-model-check","code":"changed","message":"advisory: formal-model-check spec hash CHANGED (specs/tla) — run /amadeus --stage formal-model-check","stage":"requirements-analysis"}]
```

修正前との対照が要点である。STEP1 の hash は空入力の `e3b0c442...` ではなく実 spec の `8cb8c48e...`(§ 実測で確定した plugin host root で先に測った repo ルート spec のハッシュと一致)。STEP6 は `current` 固定ではなく `changed` へ遷移し、STEP7 は空配列ではなく Advisory を1件返す。

**CLI 経由の確認**(S1-c を実運用レイアウトで再証明 — `.claude/specs/` のような人工配置は一切使っていない):

```
bun .claude/tools/amadeus-orchestrate.ts next --stage requirements-analysis --single
```

exit code `0`、stderr verbatim:

```
advisory: formal-model-check spec hash CHANGED (specs/tla) — run /amadeus --stage formal-model-check
```

stdout verbatim:

```json
{
  "kind": "run-stage",
  "stage": "requirements-analysis",
  "advisories": [
    {
      "plugin": "formal-model-check",
      "code": "changed",
      "message": "advisory: formal-model-check spec hash CHANGED (specs/tla) — run /amadeus --stage formal-model-check",
      "stage": "requirements-analysis"
    }
  ]
}
```

注入した spec 変更を復元(`git diff --stat specs/` が空)して同じコマンドを再実行すると、stderr の `advisory:` 行数 `0`・`advisories` キー欠落へ戻る。すなわち **FR-E1 の価値チェーンは実運用レイアウトで閉じた**。実験に使った verdict state とラッチは撤去済み。

### S4-2【是正済み】stage file の verdict 語彙が CLI 出力と反転していた

ステージ本文 Step 3 の記述:

```
3. Report the CLI's verdict by its exit code — `0` = the checked invariants held
   across the whole finite state space (detected), `1` = a counterexample /
   not-detected, `2` = a harness error
```

一方、実測した CLI 出力は exit 0 に対して `outcome: "NOT_DETECTED"` を返す(S1-e)。実装側の対応は `run-model-check-domain.ts:258-259` で確定できる:

```
  if (outcome.kind === "NOT_DETECTED") return 0;
  if (outcome.kind === "DETECTED") return 1;
```

CLI の語彙が指す「検出」の対象は**反例**であり、exit 1(`DETECTED`)が「反例が見つかった」、exit 0(`NOT_DETECTED`)が「反例なし=不変条件が保持された」を意味する。stage file の括弧書きラベルはこれと正確に反転していた。

**是正済み**: 正本 `plugins/formal-model-check/stages/formal-model-check.md` の Step 3 を、CLI の outcome 名を明示する3項の箇条書きへ書き換えた(exit 0 = `NOT_DETECTED` / exit 1 = `DETECTED` / exit 2 = `HARNESS_ERROR`)。`bun scripts/package.ts` と `bun run promote:self` により、生成面(`dist/plugins/formal-model-check/` の neutral bundle と全ハーネスツリー、`.claude/` セルフインストール)へ伝播済み。`dist:check` / `promote:self:check` がともに exit 0 で同期を確認している。

なお本節冒頭の引用ブロックは**修正前の文面をそのまま保存**している(発見時点の記録として意図的に残す)。

### S4-5【記録のみ / (iii)】composed 済み plugin には in-place 更新経路がない

S4-2 の是正を composed 面(`.claude/plugins/formal-model-check/`)へ届けようとして判明した実測事実:

- `bun .claude/tools/amadeus-plugin.ts compose --all-harnesses` は composed 済みの `.claude` に対して `plugin "formal-model-check" rejected: stage path already in host; tool path already in host; ...` で exit 1 になる。既存パスの上書き経路がない。
- `install <path> --force` も同じ理由で projection が exit 1 になる(ただし `.amadeus-plugin-src/` の再取り込みは先行して実行される)。

すなわち composed 済みホストの plugin 更新には `drop` → `compose` が要る。

**ただしこれは同期義務ではない**。`scripts/promote-self.ts:164-177` が、composed plugin の面(`plugins/<name>/` 配下の stage body、生成された runner skill、`.amadeus-plugin-*` の engine dot-state、stage-graph の `plugin_source` ノード)を **composition record 所有の runtime state として promote ガードから意図的に carve out** している。当該コメント verbatim(`:168-171`、原文の改行位置のまま):

```
// plugin_source node inside tools/data/stage-graph.json. A byte-parity promote
// would misread all of them as drift (ORPHAN / DIFFERS) and --apply would
// destroy the composition. They are tolerated instead, mirroring the
// composed-scope carve-out above, with ownership decided by the composition
```

よって正本(`plugins/formal-model-check/stages/formal-model-check.md`)と出荷 dist bundle の同期が契約であり、ローカル composed ホストの更新は利用者の `compose` 操作である。`dist:check` / `promote:self:check` はいずれも exit 0 で契約面の同期を確認済み。

本ホストの composed コピーは旧文面のままだが、上記のとおり契約違反ではない。更新するなら `drop` → `compose` が必要で、これは本 intent の advisory 機構が依存している composition record を作り直す host 変更にあたるため、u8 では実施せず記録に留める(判断が要る場合は裁定へ)。

### S4-3【記録のみ / (iii)】`run-model-check --out` は既存ディレクトリを拒否する

`--out` に既存ディレクトリを渡すと `OUT_CONFLICT`、親が実在しない/正規化不能なら `OUT_PATH` で exit 2(HARNESS_ERROR)になる(run-model-check-artifacts.ts:126-138)。実測で最初の試行が `HARNESS_ERROR (OUT_PATH)` になった。仕様どおりの fail-closed 挙動(公開前に一時ディレクトリで作業し atomic に publish する設計)であり欠陥ではない。ステージ本文には `--out <out-dir>` としか書かれておらず「未作成のパスを渡す」ことが明示されていないため、運用知識として記録する。

### S4-4【記録のみ / (iii)】§11a advisory 提示規範は着地済み

`.claude/amadeus-common/protocols/stage-protocol.md:894-910` に「11a. Directive Advisories」節が実在し、`advisories` 配列の全エントリをステージ本文開始前にユーザーへ提示すること、message を verbatim 中継すること、nudge であってゲートではないこと、3 checkpoint で run ごとに最大1回であることが規定されている。u5 の主張どおりで、追加是正は不要。

### glue 修正の実施件数: 2 件(S4-1 / S4-2)

conductor 裁定(2026-08-01)により S4-1 を執行クラスの glue 修正として実施し、S4-2 も同時に是正した。S4-3 / S4-4 は記録のみ(是正不要)。

## 検証(実測)

すべて worktree ルートで、パイプを介さず個別に実行し exit code を直接読んだ(`cid:code-generation:no-exit-capture-through-pipe`)。

| コマンド | exit code |
|---|---|
| `bun run typecheck` | `0` |
| `bun run lint` | `0` |
| `bun run dist:check` | `0` |
| `bun run promote:self:check` | `0` |
| `bun test`(t319 / t320 / t321 / t322 / t378 / t381 / t382) | `0` |
| `bash tests/run-tests.sh --ci` | `0` |
| `bun tests/coverage-patch-gate.ts --check` | `0` |

対象テスト集計(runner 出力からの転記):

```
 71 pass
 0 fail
 198 expect() calls
Ran 71 tests across 7 files. [762.00ms]
```

フルスイート集計(`bash tests/run-tests.sh --ci` の SUMMARY からの転記):

```
Test files: 697
Failed files: 0
Total assertions: 9482
Failed assertions: 0
------------------------------
RESULT: PASS
```

`dist:check` / `promote:self:check` 末尾:

```
package --check: all harness trees in sync with packages/framework/core + harness.
promote-self --check: project-local self install is in sync
```

`bun run lint` は exit 0(警告 341・info 22 はいずれも本変更以前から存在する既存分)。

## 逸脱: compose の副作用と撤去

S4-2 の是正を composed 面へ届ける過程で `compose --all-harnesses` を実行したところ、**composed 済みでなかった4ハーネスツリー(`.codex` / `.cursor` / `.opencode` / `.kimi-code`)へ plugin を新規 compose してしまった**。意図しない副作用であり、内訳は untracked 86 エントリ(`plugins/`、`skills/`、`.amadeus-plugin-*` の各記録)+ tracked 4ファイル(各ツリーの `tools/data/stage-graph.json` に `plugin_source` ノード追加)+ 無関係な4 intent の `amadeus-state.md`(`Stages to Skip` へ `3.8 (formal-model-check)` 行が追加)。

撤去手順と実測:

1. 新規テスト `t382` を先に `git add`(untracked のままだと次手順で消えるため — `git clean -nd` のプレビューで実際に削除対象へ現れることを確認してから実施)。
2. `git clean -fd` で untracked 86 エントリを削除。削除対象がハーネスツリー配下に限定されることをプレビューで機械確認してから実行。`-x` は使用せず、gitignore 済みのマシンローカル資産には触れていない。
3. tracked な `stage-graph.json` 4件と無関係 intent の `amadeus-state.md` 4件を `git checkout --` で HEAD へ復元。
4. `install --force` が書き換えた `.claude/.amadeus-plugin-src/` 4ファイルも HEAD へ復元し、composed ツリーとの整合を回復。

撤去後、`git status --porcelain` の untracked は `0`、`promote:self:check` と `dist:check` はともに exit `0` へ回復した。自 intent の `amadeus-state.md` の差分は本作業開始前の fork 由来分のみで、`Current Stage` は不変。

## 実験残渣の撤去確認

実測のために一時作成した以下は全て削除済み(`git status --porcelain` および `ls` で不在を実測):

- `.claude/specs/`(S1-c の watch 対象 spec 配置)
- `.claude/.amadeus-plugin-activation.json`(verdict state)
- `amadeus/spaces/default/intents/.amadeus-advisory-latch/`(ラッチ)

リポジトリルートの `specs/tla/FormalElection.tla` へ S4-1 の実証で注入した変更は復元済み(`git diff --stat specs/` が空)。

作業終了時の `git status --porcelain` は以下2件のみで、いずれも本作業開始前(UTC 07:14:50Z 以前)に conductor の Bolt fork が書いたものである:

```
 M amadeus/spaces/default/intents/260731-formal-verif-value-chain/amadeus-state.md
 M amadeus/spaces/default/intents/260731-formal-verif-value-chain/audit/j5ik2o-mac-studio-lan-bb703748d068.jsonl
```

state の差分は `Worktree Path` の設定と `Swarm Gated Batch Approvals: 1 → 1, 2` であり、`Current Stage` は `code-generation` のまま不変。本作業は state 前進を行っていない。

## 残件(後続指示待ち)

1. **S1-f の audit ステージイベント** — conductor の `report`/advance 経路でのみ産出可能。
2. **S3(FR-E3 新規モデル到達)** — u7 Phase B の MirrorLifecycle 着地待ち。AsIntended の TLC verdict 到達と AsImplemented 変種の反例トレース保存が対象。

(S4-1 / S4-2 は本 Unit 内で是正済み — 上記 § S4-1 の是正、§ S4-2 を参照。)
