# Business Logic Model — U1 boundary-guard

> 上流入力(consumes 全数): unit-of-work(U1 定義)、unit-of-work-story-map(FR-5 トレース)、requirements(FR-5a〜5c)、components(C1)、component-methods(C1 契約)、services(サービス非該当の確認)

## 検査ロジック(2述語)

### 述語1: scripts/ 参照検査(FR-5a)

```
scanDistributionTreeForScriptsRefs(files: {path, content}[], allowlist: AllowRule[]) -> Finding[]
```

- 入力: 配布ツリー(packages/framework/** / dist/** / self-install 5面)のテキストファイル集合
- 判定: 行内の `scripts/` パス参照の**出現単位**検出(grep -v 型の行単位除外はしない — cid:grep-occurrence-level-exclusion)。allowlist は AllowRule(id+file glob+pattern)に一致する出現のみ免除
- 出力: Finding[](file/line/excerpt)。0件で green
- 層分割: 判定は純関数(unit 層)、実 FS 収集は integration 層(cid:fs-tests-integration-first)
- **AD 契約からの精密化申告**: component-methods.md C1 の `(roots: string[], allowlist: RegExp[])` から、純関数化のため引数を FS 走査済み `files` 配列へ、allowlist を id 付き AllowRule へ精密化(fs-tests-integration-first 整合の FD レベル是正 — citation-semantics-check 準拠の申告)。述語2(findDuplicatedAssets)は component-methods の契約表に未収載で、AD components.md C1 プローズ(generic assert)の FD レベル精密化である

### 述語2: 重複不変量(残置検査 — FR-1a/2a/3a の P5 対称)

```
findDuplicatedAssets(scriptsBasenames: string[], canonicalBasenames: string[]) -> string[]
```

- 判定: `scripts/` 直下の資産 basename と配布正本(`packages/framework/core/tools/` + `core/skills/`)の basename の**積集合**が空であること
- 3状態意味論: 移動前(scripts のみ)= green / 移動後(正本のみ)= green / コピー残置(両実在)= red
- 順序制約なし: U2/U3 の着地タイミングと独立に常時有効(AD components.md C1 是正済み方式)

## 落ちる実証フロー(FR-5b)

1. fixture(scripts/ 参照を含む SKILL.md 断片)を tests/fixtures/ に置き、述語1が Finding を返すことを assert(fixture 赤)
2. live tree 検査は現存層またぎ(contrib SKILL.md)が解消される U2 と同一 Bolt で有効化(Bolt 1 内で赤→green を完結 — falling-proof-injection-one-set の Bolt 面)
3. 重複不変量は fixture(両実在の合成ディレクトリ)で赤を実証したうえ live へ常時適用(現状 live は「scripts のみ実在」で green)

## corpus sweep(FR-5c)

導入時に配布ツリー全域へ述語1を適用し、正当既存出現を allowlist へ id 付きで登録して偽赤 0 を実測(cid:corpus-sweep-for-new-guards)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:11:18Z
- **Iteration:** 1
- **Scope decision:** none

FR-5a〜5c 全数カバー・3状態意味論の AD 一致・層分割整合・frontend-components 不在正当・テスト分岐なし・型スタイル整合を確認。Minor4件(契約精密化の申告/述語2未収載注記/AllowRule スマートコンストラクタ/AD C2 出典残余の参考情報)— Minor1-3 は conductor が即時反映済み

### Findings

- Minor1: 述語1シグネチャの AD 契約からの精密化を申告注記(反映済み)
- Minor2: 述語2の component-methods 未収載を明示(反映済み)
- Minor3: AllowRule に parse コンパニオン追加(反映済み)
- Minor4(参考): AD components.md の Review 履歴が NOT-READY 表示のまま(残余は C2 出典面で C1 非関連 — conductor 機械閉包済みの記録)
