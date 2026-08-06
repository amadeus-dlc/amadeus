# re-scan: 260805-cross-harness-resume

## 実行メタデータ

- Date: `2026-08-05`
- Intent: `260805-cross-harness-resume`（scope `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal、Test Strategy: Comprehensive）
- ミラー Issue: [#2285](https://github.com/amadeus-dlc/amadeus/issues/2285)
- Base commit: `b938898f364160d4b5857e153579b40b5ab18372`（直前 intent `260804-phase-boundary-approval` の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い祖先性を実測 — `git merge-base --is-ancestor b938898f3 7060956c5` exit 0）
- Observed commit: `7060956c5617125dd2f4e284957aa180cb306484`（= 本 worktree HEAD、`git rev-parse HEAD` 一致。`cid:reverse-engineering:c2-observed-mainline-commit` により origin/main 系譜のコミットを記録）
- 区間規模: **34 commits / 493 files**（`+43826 / −217`）
- Scan mode: DIFFERENTIAL refresh。Developer scan の列挙を一次入力とし、Architect が患部 seam を observed 断面の verbatim 実読で再検証した。
- Focus: **ハーネス跨ぎのワークフロー引き継ぎ（cross-harness resume）**。ユーザー要件は「`claude` / `codex` / `cursor` / `kimi` / `kiro` / `kiro-ide` / `opencode` / `pi` のどの組み合わせでも引き継ぎ可能であること」。

本記録の file:line はすべて observed `7060956c5617125dd2f4e284957aa180cb306484` 時点。

## Focus の一次患部

### caller-authorization（`packages/framework/core/tools/amadeus-caller-authorization.ts`、122行）

| 行 | 述語 | 結果 |
| --- | --- | --- |
| `:72` | `export function authorizeMainConductor(projectDir: string): MainConductorAuthorization` | 判定の唯一の入口 |
| `:75` | `if (detectHarnessType() !== "kimi") return { kind: "authorized" };` | **kimi 以外は無条件で素通り** |
| `:81-85` | `existsSync(denyPath) \|\| existsSync(endedPath) \|\| existsSync(\`${markerPath}.lock\`)` → `{ kind: "denied", role: "unknown" }` | deny ラッチ3種 |
| `:94` | marker（`kimi-active-subagents.json`）が不読・不正 → `{ kind: "denied", role: "unknown" }` | carrier 欠損 |
| `:105` / `:108` | `.current-session` が空 / `parsed.mainSessionId` と不一致 / 読取例外 → `{ kind: "denied", role: "unknown" }` | セッション不一致 |
| `:111-115` | `roles` 非空 → `{ kind: "denied", role: <sorted first role> }` | subagent 在席 |
| `:117-122` | `callerAuthorizationError(role)` | 復旧手順の案内なし |

呼び出し元は2ファイルのみ（`grep` 全数）:

- `amadeus-orchestrate.ts:2400` `refuseUnauthorizedKimiCaller` — `handleNext :2446` / `handleReport :4543` / `handlePark :5099` / `handleGateReserve :5326` / `handleGateReject :5387`
- `amadeus-state.ts:902` `enforceCallerAuthorization` — `:908-912` で `get` / `count` / `lookup` のみ除外し、`:914` で判定。残る全27語彙をゲートする。**`case "park"` `:1024` と `case "unpark"` `:1027` を含む。**

#### 所見A（デッドロック — 構造的、in-band 復旧経路の不在）

拒否状態に入った Kimi セッションは `next` / `report` / `park` / `gate-reserve` / `gate-reject` に加えて **`unpark` も打てない**。park 時の復旧文言は unpark を案内するが、その unpark 自体が同じゲートに掛かる。したがって拒否状態からの回復手段はワークフロー内（in-band）に存在せず、ファイル系（`amadeus/.amadeus-sessions/` 配下の手作業削除）または別ハーネスでの再起動という out-of-band 手段しか残らない。

#### 所見A'（原因の判別不能性）

`{ kind: "denied", role: "unknown" }` を返す経路は `:85` / `:94` / `:105` / `:108` の4つある。いずれも同一のエラーメッセージ（`callerAuthorizationError("unknown")`）に畳まれるため、**利用者からは「marker 不在」「セッション不一致」「ended-deny 残存」「carrier 分裂」が区別できない**。復旧手順も文言に含まれない。

#### 所見A''（未文書の認可バイパス）

`detectHarnessType`（`amadeus-harness.ts:113-123`）は `:114-116` で `process.env.AMADEUS_HARNESS_TYPE` を最優先し、次に `:118` `CLAUDECODE === "1"`、最後に `resolveHarnessDir()` を見る。したがって **`AMADEUS_HARNESS_TYPE` を kimi 以外の値にすると `:75` で無条件 authorized になり、Kimi の認可境界が丸ごと素通りする**。この env は docs で認可への影響として説明されていない。あわせて `kiro-ide` は harness dir が `.kiro` のため type `kiro` に畳まれる（型としての `kiro-ide` は `detectHarnessType` の戻り値に現れない）。

### セッション carrier（全ハーネス対照）

`.current-session` の書き手は core hook **`amadeus-session-start.ts:97` `if (sessionId) writeCurrentSessionId(projectDir, sessionId);` の唯一箇所**（実体は `amadeus-lib.ts:2170` `writeCurrentSessionId`）。`:88-96` のコメントが明記するとおり、この hook が session_id を見る唯一の場所であり、CLI 側の切替 verb からは供給できない。

| ハーネス | core `session-start` 呼出 | `session_id` 転送 | `.current-session` を書くか |
| --- | --- | --- | --- |
| `claude` | あり | あり | **書く** |
| `codex` | あり | 条件付き | 書く（session_id ありの時） |
| `cursor` | あり | 条件付き | 書く（session_id ありの時） |
| `kimi` | あり | あり | **書く** |
| `kiro` | あり | 条件付き | 書く（session_id ありの時） |
| `kiro-ide` | あり（`amadeus-kiro-adapter.ts:261,266,388` で `amadeus-session-start.ts` を起動） | **なし**（`session_id` の転送 grep 0 hit） | **書かない** |
| `opencode` | **なし**（`amadeus-session-start` grep 0 hit、`plugins/` 構成で hooks なし） | — | **書かない** |
| `pi` | **なし**（`amadeus-session-start` grep 0 hit、`extensions/amadeus-pi-extension.ts:779` `case "session-started"` でネイティブに audit を生成） | — | **書かない** |

#### 所見B（carrier を書かない3面）

**`kiro-ide` / `opencode` / `pi` の3ハーネスは `.current-session` を書かない。** これらのセッションが直前に走った後で Kimi へ引き継ぐと、`.current-session` は「最後に書いた別ハーネスのセッション ID のまま」あるいは「不在のまま」で残り、Kimi 側の `:105` / `:108` に落ちる。すなわち **ユーザー要件（8ハーネスの任意の組み合わせで引き継ぎ可能）は現状の carrier 設計では成立しない**。

#### 所見C（carrier 分裂 — Kimi adapter の raw cwd）

Kimi の carrier（`kimi-active-subagents.json` と2種の deny ラッチ）を書くのは `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts` の module-private 関数群 — `:236` `establishKimiMainBaseline`、`:281` `clearKimiRoleCarrier`（いずれも **非 export**、外部から呼べる復旧 seam ではない）。`:285-286` で ended-deny と role-deny を書き、これを消せるのは次の Kimi `SessionStart` のみ（tombstone）。

一方、adapter の入口 `:704` は `const dir = env.cwd ?? projectDir;` として **payload の raw cwd をそのまま projectDir に使う**。core hook 側の解決は `amadeus-lib.ts:298` `resolveProjectDirFromHook` のラダー（`:305` payload cwd は **workspace marker を持つときだけ**採用 → `:308` `CLAUDE_PROJECT_DIR` → `:317` marker 祖先探索 → `:322` script path 由来 → `:329` known harness dir）で、marker 検証を挟む。この非対称により、marker を持たない cwd（サブディレクトリ・別 worktree）から起動した Kimi セッションは **adapter が書く carrier と core hook が読む carrier が別ディレクトリに分裂する**。

raw-cwd 挙動は `tests/integration/t-kimi-adapter.test.ts:413`（テスト名 `"the payload cwd wins as the core hook's project dir"`）で pin されており、是正するならこのテストの明示改訂を伴う。

### resume 経路

- **resume 時のハーネス一致検査は存在しない。** state の `Harness` フィールドの読み手は migrate 系のみ。`docs/guide/11-session-management.md:7` は `> **Harness note.** Session resume works on every harness (the state lives in the intent's record dir, not the harness).` と宣言しており、**文書上の契約（どのハーネスでも resume 可）と Kimi 認可境界の実挙動が不整合**である。
- 別 project dir（worktree）からの resume 専用経路はない（`resolveProjectDir` のラダー上、明示 `--project-dir` のみ）。`Worktree Path` フィールドは装飾で、読み手は持たない（`amadeus-state.ts:4878` / `:5006` のコメント）。
- 全 carrier（`amadeus/.amadeus-sessions/` 配下）は gitignored = per-clone / per-worktree であり、worktree を跨いだ時点で共有されない。

### 復旧手段の不在

- session carrier を修復する verb は存在しない（`amadeus-utility.ts` の verb dispatch を全数確認、`session-repair` 系 grep 0 hit）。
- `doctor` は kimi hook の配線のみを検査し、carrier の状態は見ない（carrier ファイル名の grep 0 hit）。
- ハーネス跨ぎ引き継ぎの手順書は docs に存在しない。

## 決定的再現（conductor 実施 — 一次証拠）

repo 外 scratch（`/private/tmp/claude-501/.../scratchpad/repro/cross-harness-auth-repro.ts`、`cid:requirements-analysis:scratch-script-discipline` 準拠）で `authorizeMainConductor` を直 import し、`AMADEUS_HARNESS_TYPE=kimi` を与えて実測。

| ケース | 条件 | 実測結果 |
| --- | --- | --- |
| C1 | marker（`kimi-active-subagents.json`）不在 | `{"kind":"denied","role":"unknown"}` |
| C2 | `.current-session` を別ハーネスが上書き（セッション不一致） | `{"kind":"denied","role":"unknown"}` |
| C3 | `kimi-session-ended-deny` 残存 | `{"kind":"denied","role":"unknown"}` |
| C4 | 整合状態（対照） | `{"kind":"authorized"}` |
| C5 | `roles = {reviewer: 1}` | `{"kind":"denied","role":"reviewer"}` |
| C6 | carrier 分裂（adapter と core hook で projectDir が別） | `{"kind":"denied","role":"unknown"}` |
| 対照 | `AMADEUS_HARNESS_TYPE=claude-code` で C1-C6 全ケース | すべて `{"kind":"authorized"}` |

**確定事項:**

1. **C1 / C2 / C3 / C6 の4原因が同一の出力に畳まれ、判別不能**（所見A' を実測で確定）。
2. Developer scan の演繹「Kimi → 他ハーネス → Kimi の往復で恒久 denied になる」（C2 経路）と「carrier 分裂」（C6 経路）は、**いずれも実測で確定**した（演繹ではなく観測）。
3. 対照実験により、**`AMADEUS_HARNESS_TYPE` による認可バイパスも実測で確定**した（所見A''）。

## 区間内変更（b938898f3..7060956c5）

- **session lifecycle / caller-authorization / harness detection のコード面は区間内で無変更。** 当該パスに触れる区間内コミットは `fc862e879` の1件のみで、内容は kimi `SKILL.md` の docs 変更に限られる。
- 34 commits の大半は TLA+ authoring、metrics、live E2E、phase-boundary docs。**本 intent の患部は区間の外側で導入済みの既存構造であり、区間内の退行ではない。**

## テスト現況

- caller-authorization 専用の unit テストは存在しない。
- `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` が拒否／許可の両面を pin するが、**substring assert（`"is not the main conductor"`、`:504` / `:536` / `:573` / `:646` / `:669` / `:689`）のみ**でエラー文言の全文 verbatim ピンはない。したがって文言に原因判別と復旧ガイドを追加しても、既存テストの明示改訂は不要（追加テストは要る）。
- session lifecycle は `t10` / `t30` / `t167` / `t169` / `t173` / `tests/integration/t-kimi-adapter.test.ts` が pin。
- `tests/integration/t-kimi-adapter.test.ts:413` の raw-cwd pin は、project-dir 解決を変えるなら明示改訂が必要（`cid:reverse-engineering:c1-pinned-behavior-ruling` — 仕様裁定とテスト契約の改訂をセットで要件段に確定すること）。
- coverage 台帳: `tests/.coverage-patch-allowlist.json` に `authorizeMainConductor` エントリ3件、no-silent-drop 台帳にも同ファイルのエントリあり。**行挿入を伴う修正では機械 remap（`cid:code-generation:c1-allowlist-mechanical-remap`）+ span 膨張検査（`cid:code-generation:cg-allowlist-straddle-swell`）+ census 再バインド（`cid:code-generation:c1-260803-state-integrity`）が該当する。**

## Developer scan との差分（Architect による訂正）

| 項目 | Developer scan | observed 実読 | 扱い |
| --- | --- | --- | --- |
| `refuseUnauthorizedKimiCaller` の宣言行 | `:2403-2405` | `:2400`（関数宣言） | 訂正して採用 |
| `enforceCallerAuthorization` の判定行 | `:914-919` | `:902`（関数宣言）/ `:914`（判定） | 精密化して採用 |
| `t-kimi-adapter.test.ts` のパス | ファイル名のみ | `tests/integration/t-kimi-adapter.test.ts`（unit ではない） | フルパスへ訂正（`cid:requirements-analysis:mechanism-cite-verify-at-draft` 追補） |
| `docs/guide/11-session-management.md` | `:7-8` | `:7`（Harness note 冒頭行） | 精密化 |
| `establishKimiMainBaseline` / `clearKimiRoleCarrier` | `:236-277` / `:281-303` | `:236` / `:281`、**いずれも非 export** | 「外部から呼べる復旧 seam ではない」点を追記 |

その他の主要引用（`:75` / `:81-85` / `:94` / `:105` / `:108` / `:111-115` / `:117-122`、`amadeus-harness.ts:113-123`、`amadeus-session-start.ts:97`、`amadeus-lib.ts:298`）は observed 断面で一致。

## Requirements Analysis へ送る裁定事項

1. **復旧経路の形** — 拒否状態からの in-band 復旧を何で提供するか。(a) 専用の復旧 verb を新設する（例: session carrier の再確立）、(b) `doctor` を carrier 状態の診断＋修復まで拡張する、(c) `SessionStart` の自動回復を強化して次回起動で必ず整合させる、のどれを主経路とするか。所見A のデッドロックを閉じるには、**復旧手段自体が caller-authorization のゲート外にあること**が必要条件である。
2. **エラーメッセージの原因判別化と復旧ガイド** — `:85` / `:94` / `:105` / `:108` の4経路を区別する `role`（あるいは `reason`）を返し、文言に復旧手順を含めるか。既存 assert は substring のため改訂不要だが、判別値の語彙と安定性契約（テストで pin するか）を決める必要がある。
3. **全ハーネス要件の充足範囲** — `.current-session` を書かない `kiro-ide` / `opencode` / `pi` の3面をどう扱うか。(a) 3面にも carrier 書込を配線して8ハーネス対称にする、(b) Kimi 側の判定を carrier 不在に対して寛容にする（fail-open 方向 — 認可境界の弱化を伴う）、(c) 引き継ぎ可能なハーネス組み合わせを明示的に限定して docs の全ハーネス宣言（`11-session-management.md:7`）を訂正する。**ユーザー要件は (a) 方向を指すが、(b) は `org.md` Forbidden の検証劇場・認可境界の弱化に触れる可能性があるため要裁定。**
4. **`AMADEUS_HARNESS_TYPE` による未文書バイパスの扱い** — 実測で確定した認可素通り（所見A''）を、(a) 意図された開発用 escape hatch として文書化する、(b) 認可判定では env を無視して実 harness dir で判定する、(c) 現状維持、のどれにするか。**(b) は本 intent の復旧経路設計と競合しうる**（テストや復旧ツールが env でハーネスを騙る手段を失う）ため、裁定1とセットで判断する。
5. **Kimi adapter raw-cwd（carrier 分裂）の是正可否** — `amadeus-kimi-lib.ts:704` の `env.cwd ?? projectDir` を core hook のラダー（`amadeus-lib.ts:298`）と対称にするか。是正する場合は `tests/integration/t-kimi-adapter.test.ts:413` の明示改訂を伴うため、仕様裁定とテスト契約改訂をセットで確定する（`cid:reverse-engineering:c1-pinned-behavior-ruling`）。

## 更新した成果物

- `reverse-engineering-timestamp.md`（現在節を追加し、`260804-phase-boundary-approval` を履歴へ降格）
- `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` / `business-overview.md`（各現在節を本 intent 断面へ更新、直前 intent の節は本文保持のまま履歴へ降格）
- 本ファイル `re-scans/260805-cross-harness-resume.md`（新設）
