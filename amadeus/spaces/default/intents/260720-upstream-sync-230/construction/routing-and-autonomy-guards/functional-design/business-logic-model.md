# Business Logic Model — routing-and-autonomy-guards

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 設計裁定: E-USSU04FD1 A（Stop hook best-effort stale削除 + doctor read-only、3–0）とE-USSU04FD2 A（upstream同型優先、autonomous時janitor N/A、3–0）。

## 責務境界

U04はC2 Workflow Runtime Correctnessの入力・guard面だけを所有する。新規serviceや永続storeを作らず、既存Bun CLI process内で3つの純粋判定seamと薄いside-effect adapterを組み合わせる。

| seam | 入力 | 純粋な出力 | adapter |
|---|---|---|---|
| `classifyHelpIntent` | token列または正規化済みinput | help / workspace verb / freeform | orchestrate parser、terminal classifier、utility handler |
| `inspectComposeMarker` | marker statまたはabsence、`nowMs`、TTL | absent / fresh / stale / unreadable | Stop hook、doctor |
| `assertRecomposeAllowed` | workflow state snapshot | allowed / denied(reason, remediation) | utility `recompose` transaction |

pure seamはfilesystem、audit、stdoutを変更しない。adapterだけが既存lock、filesystem、CLI exit codeへ投影する。helperだけを先行着地させず、各consumerと回帰testを同じBoltに同乗させる。

## Help routing workflow

### 分類アルゴリズム

1. argvが単独の`help`または`-h`ならglobal helpを返す。
2. argv内に既存read-only flag（`--help`を含む）があれば既存規則どおりterminal commandを返す。
3. 先頭tokenが`intent`または`space`で、第2 tokenが`help` / `-h`ならglobal helpを返す。
4. 先頭tokenがworkspace verbなら既存workspace commandとして返す。`space-create help/-h`はhelpへsilent rerouteせず、作成choke pointがactionable errorで拒否する。
5. それ以外はfreeformとする。`help me build auth`や`build a help desk`のような複数token文中の`help`を奪わない。

engine側`parseNextFlags`とpre-LLM側`classifyTerminalCommand`は同じdecision tableを使い、片側だけのroutingを禁止する。direct utility invocationでは`handleIntent` / `handleSpace`が同じglobal help backstopを持つ。

### Namespace guard

intent birthとspace creationはslug生成後にreserved setを検査する。`help`はgrammarなのでrecord名にできない。`space-create -h`はslugify前に拒否し、`h`というjunk spaceの生成を防ぐ。未知intent/spaceのswitch errorは「既存recordの一覧」へだけ誘導し、workflow birthやspace creationを回復手順として提示しない。

拒否経路はactive cursor、intent directory、space directory、state、auditを不変にする。reserved vocabularyは一箇所で所有し、parserごとの文字列集合を増やさない。

## Compose marker workflow

### Freshness判定

workspace-levelの単一pathを`composeMarkerPath(projectDir)`で導出し、TTLを`24 * 60 * 60 * 1000`として一箇所で共有する。`inspectComposeMarker`は次の順で判定する。

1. markerなし → `absent`。
2. stat失敗または非有限mtime → `unreadable`。
3. `ageMs = max(0, nowMs - mtimeMs)`を計算する。
4. `ageMs <= TTL` → `fresh`、`ageMs > TTL` → `stale`。

未来mtimeはage 0としてfreshに丸め、clock skewだけで正規gateを破壊しない。境界値ちょうど24時間はfresh、1ms超過からstaleとする。

### Stop hook decisionとjanitor

Stop hookはautonomous Constructionなら先頭で`continue-enforcement`を確定し、markerを読まずjanitorを`not-applicable`として終了する。これはupstream `45035ea`の実行順とE-USSU04FD2 Aで固定され、stale markerも保持する。非autonomous時だけfreshnessを判定し、次の二段階を明示的に分ける。

1. **Carve-out decision:** `fresh`だけが`allow-stop`。`absent` / `stale` / `unreadable`は全て`continue-enforcement`。
2. **Janitor outcome:** `stale`に限りbest-effort unlinkを実行し、`deleted`または`delete-failed`を観測する。どちらでもstep 1の`continue-enforcement`を変更しない。

削除はcarve-out拒否の条件でも副作用でもなく、非autonomous経路のstale判定後に走る独立cleanup outcomeである。unlink失敗をcatchしてもblock判断は維持し、audit/drop diagnosticにはstaleを無視した事実とcleanup outcomeを区別して残す。autonomous経路ではfreshness自体を生成せず、carve-out拒否と`not-applicable`だけを返すため、janitor結果がblock判断へ逆流しない。

### Doctor projection

doctorは同じpath/TTL/freshness seamをread-onlyで使う。absentはrowなし、freshはage付きadvisory PASS、staleはage付きFAILと手動削除/compose解決のremediationを返す。doctorはmarkerを削除しない。stat/probe failureは既存doctor全体をcrashさせず、他checksを継続する。

## Recompose autonomy guard

`recompose`は既存audit lock内でstate snapshotを読み、plan suffix、runtime graph、checkbox、auditを触る前に`assertRecomposeAllowed`を呼ぶ。

1. `Construction Autonomy Mode == autonomous`なら`denied`を返す。
2. errorは「human gateが必要」「gatedへ切替またはswarm完了後に再実行」を示す。
3. denied時はstate bytes、plan suffix、runtime graph、audit entriesを呼出前と同一に保つ。
4. `gated`またはfield未設定なら`allowed`とし、既存Running/pending/graph validationへ渡す。

guardは既存strict recompose validationを置換しない。autonomyを最初のdomain guardとして追加し、その後のstatus、known slug、cursor、walking-skeleton validationとtransactional writeを従来どおり実行する。

## Verification flow

- help: engine parser、terminal classifier、direct utilityの3入口で同じmatrixを検証し、long freeformをnegative controlにする。
- marker: absentとTTL境界に加え、(1) non-autonomous fresh保持、(2) non-autonomous stale削除、(3) non-autonomous unlink失敗でもblock不変、(4) autonomousはmarker未読・stale保持・janitor N/A、の4経路をfake clock/stat/fsで対照検証する。doctor read-onlyも別fixtureで固定する。
- recompose: autonomous拒否前後のstate/audit/runtime graph bytesを比較し、gated/unsetの既存成功fixtureを対照にする。
- upstream `ded69da` / `45035ea`の利用者可視契約をAmadeus path/namespaceへ再著作し、upstream source自体は実行しない。
- Bolt gateはtargeted testsに加えtypecheck、lint、dist/check、self-install checkを後続verificationへ渡す。

## Review

- **Reviewer**: amadeus-architecture-reviewer-agent
- **Date**: 2026-07-20T10:44:15Z
- **Iteration**: 1
- **Verdict**: NEEDS REVISION
- **Findings**:
  - E-USSU04FD1 Aとe2 GoA2留保は、Stop hookがstale markerをbest-effort削除し、unlink成否とcarve-out拒否を独立outcomeとして扱う契約であり、autonomyによる除外は記録されていない。ところが本書52行目と`business-rules.md`のdecision tableは、autonomous Constructionではmarkerを読まずjanitorも実行しない新しい分岐を追加している。これは`functional-design-questions.md` 26行目・31行目の裁定、および`domain-entities.md` 54–57行目の「stale時だけ派生する独立janitor」と不整合である。autonomous時もcarve-out decisionは常に拒否したまま、stale観測とjanitor outcomeを独立に実行する設計へ揃えるか、janitorを実行しない既決根拠を明示して再裁定すること。fresh保持 / stale削除 / unlink失敗の対照testにはautonomous経路も含め、decisionとcleanupの直交性を固定すること。
- **GoA**: 2（上記1点の是正後はREADY）

## Review — Iteration 2

- **Reviewer**: amadeus-architecture-reviewer-agent
- **Date**: 2026-07-20T11:41:36Z
- **Iteration**: 2
- **Verdict**: READY
- **Findings**: 0。E-USSU04FD2 Aにより前回findingの未決条件は閉じた。autonomous時の先頭return・marker未読・janitor N/A・stale保持と、non-autonomous時だけのfreshness判定・独立janitorが3成果物で一致している。fresh保持 / stale削除 / unlink失敗でもblock不変 / autonomous保持の4対照testも裁定どおり固定されている。
- **GoA**: 1
