# Business Logic Model — harness-provenance

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## 目的と境界

unit-of-work.mdが定義する単一deployable Unit `harness-provenance`について、requirements.mdのFR-1〜FR-4とunit-of-work-story-map.mdの利用シナリオを、intent birth中の同期処理として具体化する。components.mdのHarness Detectorが判定を所有し、Harness Recorderがstate生成を所有する。component-methods.mdのprovenance付きresolverと7値`HarnessType`を維持し、services.mdどおり外部サービス・非同期処理・永続ストアを追加しない。

本Unitの処理境界は次のとおり。

1. `amadeus-lib.ts`内で実行ハーネス種別を純粋な文字列判定として解決する
2. `amadeus-utility.ts`のintent birthが判定結果を新規stateテンプレートへ1回だけ埋め込む
3. 生成後の各stageでは、conductorが最初の実観測diaryエントリへstateの値を人間可読に併記する

監査シャード変更、既存stateの遡及更新、memory template変更は行わない。

## ハーネス種別の判定フロー

`detectHarnessType()`は以下を上から順に評価し、最初に成立した結果を返す。

1. **明示type override**
   - `AMADEUS_HARNESS_TYPE`が「環境変数として存在」するかを`undefined`との比較で判定する
   - 値が7値`claude-code | codex | cursor | opencode | kiro | unknown | manual`のいずれかなら、その値を返す
   - 空文字を含む未知値なら`unknown`を返す。`CLAUDECODE`やdot-dirへfall throughしない
2. **Claude Code一次シグナル**
   - `CLAUDECODE === "1"`なら`claude-code`を返す
   - それ以外の値や未設定は成立扱いにしない
3. **dot-dir補助シグナル**
   - 内部`resolveHarnessDir()`を呼ぶ
   - `source === "fallback"`なら、`dir === ".claude"`でも`unknown`を返す
   - fallback以外なら、`HARNESS_DIR_TO_TYPE`のown keyだけを対応値へ写像する
   - open-setの未知dot-dirは`unknown`を返す

例外は投げず、intent birthを継続する。設定ミスは誤った自動検出値で隠さず`unknown`としてstateへ残す。

## dot-dir解決フロー

内部`resolveHarnessDir()`は`HarnessDirResolution { dir, source }`を返す。解決順序とcache契約は次のとおり。

1. truthyな`AMADEUS_HARNESS_DIR`があれば`{ dir: value, source: "env" }`をcall-timeで返す。この結果はcacheしない
2. 非env resolutionのprocess cacheがあれば、その`HarnessDirResolution`を返す
3. 実行中`amadeus-lib.ts`の親が`tools`で、grandparent basenameがdot-dir形式なら`source: "script-path"`としてcacheする
4. script-pathが成立しなければ、既存`KNOWN_HARNESS_DIRS`の順にCWD上の実在候補を調べ、最初の候補を`source: "cwd-probe"`としてcacheする
5. 候補がなければ`{ dir: ".claude", source: "fallback" }`をcacheする

既存`harnessDir(): string`は`resolveHarnessDir().dir`を返すだけとする。環境変数のcall-time優先、非env結果のprocess内cache、最終文字列`.claude`という既存契約を変えない。cacheは文字列ではなくresolution全体を保持し、検出元を失わない。

## intent birth記録フロー

`handleIntentBirthStateBuild()`はstate本文を組み立てる前に`detectHarnessType()`を1回呼び、ローカルな`harnessType`へ保持する。`## Project Information`内の`Active Agent`直後へ`- **Harness**: <harnessType>`を挿入してから、既存`writeStateFile()`を1回呼ぶ。

この配置により以下を満たす。

- 新規stateは`getField(content, "Harness")`で読み取れる
- `Harness`をoptionalフィールドとして扱い、`STATE_V7_FIELDS`へ追加しない
- 既存のHarnessなしV7 stateの読込・検証を変更しない
- state writeやaudit eventの回数・順序を変更しない

## AC-3dの実行時検証モデル

通常のintent birthでは、orchestratorが`<dot-dir>/tools/amadeus-utility.ts`を起動し、utilityが同じ`tools`の`./amadeus-lib.ts`をimportする。Claude/Codex/Cursor/OpenCode/Kiro/Kiro IDEの全6manifestがこの配置を生成する。

各配布形態の統合テストは、既存non-env cacheを持たない**fresh subprocess**をケースごとに起動する。そのprocessでは`AMADEUS_HARNESS_TYPE`、`CLAUDECODE`、`AMADEUS_HARNESS_DIR`を親processから継承せず明示的にunsetする。実行CWDには、配布元とは異なるtypeへ写像されるdot-dir候補だけを意図的に置き、対象配布ツリーからintent birthを実行する。

- Claude配布(`.claude`)のCWDには`.codex`を置く
- Codex/Cursor/OpenCode/Kiro/Kiro IDE配布のCWDには、probe順でも先行する`.claude`を置く

期待するstateの`Harness`が競合CWD候補ではなく配布元ハーネスと一致すれば、type override・Claude signal・harness-dir env・既存cacheのいずれでもなく、CWD probeより先行するscript-pathが選択されたことを外部挙動から一意に証明できる。`AMADEUS_HARNESS_DIR`設定ケースは別のfresh subprocessで実行し、その値がscript-pathより先に選択されることを固定する。

privateな`resolveHarnessDir()`や`source`をテスト専用に公開しない。配布ツリー外へコピーしたlibを用いる既存`t144-harness-seam`系のsubprocessテストで、CWD probeとfallbackの振る舞いを`detectHarnessType()`の結果から検証する。

## FR-4の運用フロー

stage diary生成コードは変更しない。conductorはstageで最初の実観測を記録するとき、生成済みstateから`Harness`を読み、同じ通常エントリ本文へ`Harness=<type>`を併記する。観測がないstageにハーネス情報だけのsynthetic entryは作らない。

受入時は次を確認する。

- 実在する通常diaryエントリに`Harness=<type>`がある
- `memory-template.md`の4見出しを変更していない
- fresh templateの`total=0`不変条件が維持される
- 機械的な一次記録面はstateであり、memory単体の構造化parseを要求しない

## 主要シナリオ

| 条件 | 期待結果 |
|---|---|
| `AMADEUS_HARNESS_TYPE=manual` | `manual`。他シグナルを評価しない |
| `AMADEUS_HARNESS_TYPE=""`かつ`CLAUDECODE=1` | `unknown`。Claudeへfall throughしない |
| `AMADEUS_HARNESS_TYPE=invalid`かつ`.codex`実行 | `unknown`。Codexへfall throughしない |
| overrideなし、`CLAUDECODE=1` | `claude-code` |
| override/Claudeなし、`.codex/tools`から実行 | `codex` |
| 3 env unsetのfresh process、`.claude/tools`から実行、CWDに`.codex`のみ | `claude-code`。script-pathがCWD probeに勝つ |
| 3 env unsetのfresh process、`.codex/tools`から実行、CWDに`.claude`のみ | `codex`。script-pathがCWD probeに勝つ |
| override/Claudeなし、未知`.gemini/tools`から実行 | `unknown` |
| 配布外loose copy、CWDに`.cursor`のみ | `cursor` |
| 配布外loose copy、候補なし | fallback provenanceにより`unknown` |
| 新規intent birth | Project InformationにHarness行を1件生成 |
| 既存HarnessなしV7 state読込 | 従来どおり成功 |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T22:38:12Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-4、fail-closed、resolver/cache互換、canonical mapping、依存方向、optional V7、FR-4運用は整合するが、AC-3d統合テストがscript-path選択を一意に証明できる前提を固定していない。

### Findings

- [Major] business-logic-model.md:59-65 と business-rules.md:75-77/93-100 のAC-3dテストは、競合CWD候補とAMADEUS_HARNESS_DIR未設定だけを規定している。script-pathより先に評価されるAMADEUS_HARNESS_TYPE、CLAUDECODE、および既存non-env cacheを排除しないため、特にClaude配布ではCLAUDECODE=1だけで期待値が得られ、resolverを通らない偽陽性になり得る。各配布ケースをfresh processで実行し、AMADEUS_HARNESS_TYPE・CLAUDECODE・AMADEUS_HARNESS_DIRを明示的にunsetしたうえで、異なるtypeへ写像される競合CWD候補を置く条件を3成果物へ固定する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T22:39:51Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 Majorは解消され、fresh subprocess、3 env明示unset、cache非共有、異なるtypeの競合CWD候補が3成果物へ一貫して固定され、FR-1〜FR-4・fail-closed・resolver互換・optional V7・FR-4運用・依存方向も整合している。

### Findings

- None
