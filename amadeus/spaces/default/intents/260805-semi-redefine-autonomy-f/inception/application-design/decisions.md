# Decisions (ADR) — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md

本文書は上記3成果物を次のとおり実参照する。`requirements.md` の Open questions OQ-1(新設 authorization 型と `semi-mode-gate` の関係)/ OQ-2(digest 拡張の replay 互換)/ OQ-3(stop 述語の分割形)/ OQ-5(statusline 表示形式)/ OQ-6(`run_required` 強制の層)/ **OQ-ADV-K**(advisory の occurrence 写像と scope 認可・selector 一意化の整合)を**裁定対象の正本**とし、各 ADR の Context に対応 FR とその受け入れ基準を引く。`architecture.md` 現在節「semi を梯子へ載せるときの最小介入点」の「**`semi` を梯子へ載せるにはこの1行の条件そのものを緩める必要がある**」を ADR-2 の Context とし、同節「`--autonomy` 起動フラグの結線余地」の「既存流儀に整合する形は、birth 経路の `birthPrintDirective`(`:2617-2646`)が先例となる『`amadeus-bolt set-autonomy` を名指しする print directive』である。ただしこれは設計候補であり、本 intent では未確定」を ADR-8 / ADR-12 の代替案の出所とする。`component-inventory.md` 現在節「区間内で追加されたコンポーネント」表(`amadeus-autonomy-review*.ts` 計 1757 行)を ADR-1 の Consequences(下流の受け皿が無改訂で足りる)の根拠とする。

測定 ref: worktree HEAD `974dbf9bcce117a510605b12c20c50e317883566`。§12a レビュー iteration 1 の是正で追加した引用・数値の測定 ref は `d405e34c5b8e42b4acd43fea7535d5199d6816fd`(現 HEAD)であり、両断面の同値性は `git diff --stat 974dbf9bc HEAD -- packages/framework/core/` が**空出力**であることで確認した。コンポーネント記号は components.md に従う。

**ADR-13 の由来**(traceability — `phases/inception.md`「inception で新しい要件を導入する場合は必ずその由来を文書化する」): ADR-13 は上流の Open question ではなく、**§12a レビュー iteration 1 の FOLLOW-UP 指摘**(components.md 末尾 Findings の1件目 — 「C13 の判定3/4 が『新規 birth 直後の state に Intent Autonomy Mode が存在しない』ことを暗黙前提とするが未実測」)を conductor が実測して前提の不成立を確認したことに由来する。裁定対象は新しい要件ではなく、既決の FR-CLI-1 / FR-CLI-3 を成立させるための判別子の選択である(仕様変更ではないためユーザーエスカレーションの対象外)。

---

## 決定一覧

| ADR | 決定 | 可逆性 | 対応 OQ / FR |
| --- | --- | --- | --- |
| ADR-1 | `semi-mode-gate` を `semi-authority` へ**置換**する(併存させない) | 中(型の union 変更。呼び出し点は 3 箇所) | OQ-1 / FR-AUTH-1 |
| ADR-2 | 梯子入口を `authority === null` の**単一述語**にする(認可基体を引数化) | 高(関数シグネチャの追加引数) | FR-AUTH-2 |
| ADR-3 | semi の scope / norm fingerprint は既存 `fallbackFingerprints` を export して再利用する | 高 | FR-AUTH-1(c) |
| ADR-4 | semi 方針の担体は `AutonomyProjection.semiPolicies?`(**任意フィールド**)。不在 = 方針ゼロ = confirmed-policy 段の縮退 | **低**(監査 journal の schema に触れるため) | OQ-2 / FR-POL-1 |
| ADR-5 | 非 full の確認 digest を `nonFullCommandDisplayDigest` の 1 定義へ寄せ、方針集合を合成対象に含める | 高 | FR-POL-2 |
| ADR-6 | advisory の選択は `kind: "question"` の occurrence へ写像し、`selector` に advisory instance を含める | 中(選択の再利用性に影響) | **OQ-ADV-K** / FR-ADV-1 |
| ADR-7 | stop hook の述語は**分割**する(引数フラグにしない) | 高 | OQ-3 / FR-STOP-1 |
| ADR-8 | `--autonomy` は engine 内で mode を適用する(print directive で `amadeus-bolt` を案内するだけにしない) | 中 | FR-CLI-1〜5 |
| ADR-9 | advisory store の `schema` を 2 へ上げ、schema 1 は既存 fail-closed 経路で hold にする | 高(store は machine-local) | FR-ADV-3 |
| ADR-10 | statusline は state ファイルの `Intent Autonomy Mode` を読む(audit projection を読まない) | 高 | OQ-5 / FR-DISP-1 |
| ADR-11 | `run_required: true` の強制は**選択肢空間**(主)と**効果分類**(従)の2面で行い、directive 検証側は不変とする | 高 | OQ-6 / FR-ADV-4 |
| ADR-12 | `--autonomy none` の active grant 実在チェックは **C13(engine 側の適用ハンドラ)が所有**し、projection 読取不能も fail-closed で拒否する | 高 | FR-CLI-2(2) / C-3 |
| ADR-13 | 「mode が宣言済みか」の判別子は **`modeProvenance.kind === "human-command"`** とし、state フィールドの有無・値を判別に使わない | 高 | FR-CLI-1 / FR-CLI-3 |

**可逆性の低い決定は ADR-4 の1件のみ**であり、`phases/inception.md`(「後方互換レイヤ・移行シムは既定でスコープ外」)と C-7 の観点から最も注意を要する。ADR-4 は独立した根拠節を持つ。

---

## ADR-1 — `semi-mode-gate` を `semi-authority` へ置換する

### Context

`requirements.md` OQ-1 が「新設 authorization 型の名称と、`DecisionAuthorization` 判別ユニオンへの載せ方。既存 `semi-mode-gate`(`amadeus-intent-autonomy.ts:516`)との関係(置換か併存か)を ADR で決める。併存させる場合は org.md Forbidden の二重実装に当たらない根拠を ADR の Consequences に書く」と明示的に本 ADR を要求している。

現行 `semi-mode-gate`(`:515-520`、verbatim `      kind: "semi-mode-gate",`)は phase 内 stage-gate のみに対して発行され、`modeProvenance` と `projectionRevision` を運ぶ。FR-AUTH-1 は「(a) scope 認可 (b) effect 認可 (c) basisFingerprint」の3責務を持つ型を要求する — `semi-mode-gate` はこのうち (c) の材料(`modeProvenance`)しか持たない。

### Options

- **Option A — 置換**: `semi-mode-gate` を削除し、`semi-authority`(`SemiAuthority` を同梱)へ一本化する。
  - pros: semi の認可経路が1本になる。org.md Forbidden(二重実装)を構造的に回避する。C-7(後方互換なし)と整合。
  - cons: `semi-mode-gate` を参照する既存テストの同期が要る。`decide` の分岐(`amadeus-intent-autonomy-runtime.ts:603-615`)の判別子が変わる。
  - reversibility: 中。型の union 変更だが、参照点は `selectDecision:522` / `decide:613` / `authorizeInteraction:516` の 3 箇所に限られる。
- **Option B — 併存**: `semi-mode-gate`(stage-gate 用)と `semi-authority`(question 用)を両方置く。
  - pros: 既存テストが無改変で通る可能性が高い。
  - cons: **同一 mode に認可基体が2つ**という状態を作る。どちらが正かの判断がすべての呼び出し点に散る。org.md Forbidden の「二重実装」に該当し、C-7 が禁じる互換温存と実質同じ。
  - reversibility: 低(いったん2本になると統合は困難)。
- **Option C — `modeProvenance` を認可基体そのものとする**(型を新設しない)。
  - pros: 新しい型が要らない。留保 R1 が指摘するとおり `modeProvenance` は既に semi の認可述語(`:512`)かつ裁定 principal の供給元(`:603-604`)として機能している。
  - cons: FR-AUTH-1 が要求する3責務(特に (a) scope 認可と (b) effect 認可)を `modeProvenance` に持たせると、**mode 変更の来歴**という本来の意味が拡張される。3責務を単一の型で明示できない。

### Decision

**Option A(置換)を採る。**

`DecisionAuthorization` の union から `semi-mode-gate` を削除し、`{ kind: "semi-authority"; occurrence; authority: SemiAuthority; projectionRevision }` を追加する。`basisKind` の値域 `"mode-semi"` は**保持**する(`DecisionBasisKind:535-542`)— 認可の種別と裁定基体の種別は別の軸であり、`mode-semi` は「semi の gate 即決」という裁定基体の名前として引き続き正しい。

### Consequences

- semi の認可経路が1本になり、`selectDecision` の分岐が「occurrence.kind による2分岐」だけになる(component-methods.md §C6)。
- `semi-mode-gate` を文字列で参照する箇所の同期が要る。**2キー棚卸し**(`cid:application-design:dual-key-consumer-inventory`)で洗う: 識別子 `semi-mode-gate` と展開後リテラル `"semi-mode-gate"`。⚠ 本設計段では棚卸しを実行していない(実装時実測が確定条件)。
- 下流の未レビュー受け皿(`amadeus-autonomy-review*.ts` 計 1757 行、`component-inventory.md` 現在節)は `reviewState` のみを見るため**無改訂**で足りる。
- **Option C を「不可能」とは記述しない**(留保 R1 の反映)。`requirements.md` FR-AUTH-1 §採用理由の明記は、新設型(本 ADR の Option A)を採る理由を「`modeProvenance` 案(本 ADR の Option C)が不可能だから」ではなく「**3責務を単一の型で明示でき `:702` の緩和が単一述語に閉じるから**」と書けと要求する。本 ADR の Decision と Alternatives Rejected はこの要求どおりに書いてあり、Option C を不能とは述べていない(留保 R1 が指摘するとおり `modeProvenance` は既に `:512` の認可述語かつ `:603-604` の principal 供給元として機能している)。

### Alternatives Rejected

- **Option B(併存)** — org.md Forbidden の二重実装に該当する。認可基体が2つあると「どちらを見るべきか」の判断が全呼び出し点へ散り、C-7 が禁じる互換温存と構造的に同じになる。
- **Option C(`modeProvenance` の認可基体化)** — 実現可能だが、mode 変更の来歴という型の意味が3責務ぶん拡張される。FR-AUTH-1 の受け入れ基準(1)「型定義の直読で4つ目の責務を持たないことを確認できる」が、拡張された `modeProvenance` では満たしにくい。

---

## ADR-2 — 梯子入口を単一述語にする

### Context

`architecture.md` 現在節が「さらに `resolveAutoDecision` の full ハードゲート(`:702`)が `mode !== "full"` を一律拒否するため、**`semi` を梯子へ載せるにはこの1行の条件そのものを緩める必要がある**」と述べる。FR-AUTH-2 は「`projection.mode !== "full" || grant === null` を、『当該 occurrence に対する認可基体が解決できたか』という単一述語へ置き換える。mode 名の直接比較を梯子入口に残さない」と要求する。

### Options

- **Option A — 認可基体を引数化**: `ResolveAutoDecisionInput` に `authority: DecisionAuthority | null` を足し、入口を `if (input.authority === null)` にする。
  - pros: 梯子が mode を知らなくなる(関心の分離)。将来 mode が増えても梯子は無改訂。`resolveConfirmedPolicy` の `grant` 依存も同時に解ける。
  - cons: 関数シグネチャが変わり、呼び出し点(`selectDecision:524`)とテストの同期が要る。
  - reversibility: 高(引数の追加は戻せる)。
- **Option B — mode 比較を緩める**: `if (projection.mode === "none")` へ書き換える。
  - pros: 変更が1行に収まる。
  - cons: **mode 名の直接比較が梯子入口に残る**(FR-AUTH-2 の受け入れ基準 grep に違反)。`grant === null` の扱いが宙に浮き、`resolveConfirmedPolicy` が `grant` を要求し続けるため semi では 0 段目が必ず落ちる。
  - reversibility: 高。
- **Option C — semi 用のダミー grant を発行**: semi にも `IntentGrant` を作り、梯子を無改訂にする。
  - pros: 梯子・`resolveConfirmedPolicy`・`reserveFullDecision` がすべて無改訂。
  - cons: **FR-AUTH-3(semi は current grant = null を維持)に正面から違反**。`assertLegalAutonomyProjection:195`(verbatim `  if (isTerminal ? current !== null : (projection.mode === "full") !== (current?.state === "active")) {`)の不変条件も破る。

### Decision

**Option A(認可基体の引数化)を採る。**

```
if (input.authority === null) return { kind: "invalid", reason: "authorization-required" };
```

`resolveConfirmedPolicy` の `grant: IntentGrant` 引数を `authority: DecisionAuthority` へ差し替える(component-methods.md §C4)。

### Consequences

- 梯子(`:699-744`)が `projection.currentGrant` を読まなくなる。`projection` 引数は `decisionRecord` の生成にのみ使われる。
- `invalid` の理由文字列が `full-grant-required` から `authorization-required` へ変わる。この文字列を assert する既存テストは同期対象(⚠ 2キー棚卸しは実装時実測が確定条件)。
- 将来 mode が増えても梯子は無改訂で済む(設計の可変性が上がる)。
- `decisionRecord:602` の `  const grant = input.projection.currentGrant;` は**残る**(`grantId` と `principalId` の解決に使う)。semi では `grant === null` のため `grantId: null` / `principalId` は `modeProvenance.principalId` になる(`:603-604` の既存分岐がそのまま働く)— **改訂不要**。

### Alternatives Rejected

- **Option B(mode 比較の緩和)** — FR-AUTH-2 の受け入れ基準(関数本体の grep で `mode !== "full"` が 0 hit)を満たせない。confirmed-policy 段が semi で構造的に死ぬため FR-POL-1 とも両立しない。
- **Option C(ダミー grant)** — FR-AUTH-3 と `assertLegalAutonomyProjection` の不変条件に違反する。「grant を持たない mode」という C-1 の構造を偽装することになり、`--status` の Grant 行にも偽の grant が出る。

---

## ADR-3 — semi の fingerprint は既存 `fallbackFingerprints` を再利用する

### Context

`SemiAuthority` は scope / norm fingerprint を必要とする(梯子の history 段が `scopeLineageFingerprint`、norm 段が `normFingerprint` を照合するため)。full では `grant.scope.scopeFingerprint` / `grant.scope.normFingerprint` が供給する。semi には grant が無い(C-1)。

**「既存に無い → 新設」の反証確認**(`cid:requirements-analysis:absence-claim-grep-verify` 追補): `commitProductionQuestionDecision:541-543` を直読したところ、**grant 不在時の fingerprint 経路は既に実在する**:

```
  const fallback = fallbackFingerprints(projection.intentUuid, "intent");
  const scopeFingerprint = projection.currentGrant?.scope.scopeFingerprint ?? fallback.scopeFingerprint;
  const normFingerprint = projection.currentGrant?.scope.normFingerprint ?? fallback.normFingerprint;
```

`commitProductionStageGateDecision:469-472` にも同型の分岐がある。`fallbackFingerprints`(`amadeus-intent-autonomy-production.ts:281-289`)は module-private である。

### Options

- **Option A — `fallbackFingerprints` を export して再利用**。
  - pros: 既存の grant 不在経路と**同一の fingerprint** を semi でも使う。full → semi の遷移で history 段の照合が壊れない。新しい digest 定義を増やさない。
  - cons: production 層の関数を純関数層(`SemiAuthority`)から呼べない(層の向きが逆)。→ **呼び出しは production 層(C9 / S5)が行い、`SemiAuthority` は fingerprint を引数で受ける**ことで解決する。
  - reversibility: 高。
- **Option B — `SemiAuthority` 専用の fingerprint 関数を新設**。
  - pros: 純関数層で閉じる。
  - cons: 同じ intentUuid・scopeId に対して**2種類の scopeFingerprint** が生まれ、既存の grant 不在経路(`:541-543`)と照合が合わなくなる。history 段の過去裁定が semi から見えなくなる。
  - reversibility: 中(fingerprint が journal に焼かれるため後戻りが難しい)。
- **Option C — `SemiAuthority` に scope / norm fingerprint を持たせず `authorityFingerprint` 1本に畳む**(梯子へは authority fingerprint だけを渡す)。
  - pros: 型のフィールドが減り、fallback の呼び出し自体が不要になる。ADR-1 の3責務制限にも形式上は適合する。
  - cons: 梯子の **norm 段(`:708-717`)と history 段(`:718-725`)が照合キーを失う**。history 段は `fact.scopeLineageFingerprint === input.scopeLineageFingerprint`(`:718-720` verbatim `    fact.selector === occurrence.selector && fact.scopeLineageFingerprint === input.scopeLineageFingerprint &&`)を要求し、confirmed-policy 段は `policy.scopeFingerprint` を要求するため、scope fingerprint を持たない authority では**梯子5段のうち0段目・2段目が構造的に死ぬ**。FR-POL-1(方針が 0 段目で効く)と両立しない。
  - reversibility: 高(型のフィールド追加は戻せる)。ただし FR との両立不能が先に効くため採れない。

### Decision

**Option A を採る。** `fallbackFingerprints` を export し、production 層が `SemiAuthorityScope` を組み立てて `SemiAuthority.of` へ渡す。純関数層は fingerprint の**生成方法を知らず**、受け取った値の形(`SHA256.test`)だけを検査する。

### Consequences

- `SemiAuthority` は projectDir も state も知らないまま純関数層に置ける(services.md §論理サービス S1)。
- semi と「grant 不在の question 裁定」が同じ fingerprint 空間を共有するため、`--autonomy semi` の前後で history 段の一貫性が保たれる。
- `fallbackFingerprints` の export により、この関数の変更が semi の裁定にも影響するようになる(結合の増加)。ただし現状すでに 2 箇所(`:469` / `:541`)から使われており、3 箇所目になるだけである。

### Alternatives Rejected

- **Option B(専用 fingerprint)** — fingerprint 空間の分裂を招く。監査 journal に焼かれた値は後から統合できないため、可逆性が最も低い選択になる。
- **Option C(`authorityFingerprint` 1本へ畳む)** — 梯子の confirmed-policy 段と history 段が照合キーを失い、semi では 0 段目・2 段目が構造的に死ぬ。FR-POL-1(方針が 0 段目で効く)を満たせない。

---

## ADR-4 — semi 方針の担体は任意フィールドとし、不在を「方針ゼロ」と読む

### Context

`requirements.md` OQ-2 が「FR-POL-2 の digest 拡張が replay 互換に与える影響。既存の非 full `set-mode` 監査ブロックが拡張後の replay で復元できることを設計段で確認する(**既存 journal の後方互換は『互換レイヤの新設』ではなく replay の入力受理範囲の問題として扱う**)」と裁定枠を与えている。

**永続化機構の実読**(`cid:functional-design:c8` — 「既存機構に載るだけ」と確約する前に供給面を実読で確定する):

- 監査 journal は**projection のスナップショットを丸ごと**保存する(`amadeus-intent-autonomy-runtime.ts:214-225` の `transactionFor` が `projection: input.after` を同梱)。
- 保存値は digest で束縛される(`amadeus-intent-autonomy-replay.ts:42` verbatim `    return value.afterProjectionDigest === autonomyDigest(value.projection) && value.events.length > 0;`)。
- `transactionShape` は `assertLegalAutonomyProjection(value.projection)` を通す(`:40-41`)。
- したがって**既存 journal の projection は書き換えられない**(書き換えると digest が壊れる)。新しい**必須**フィールドを `AutonomyProjection` へ足すと、既存 journal の projection は on-disk でそのフィールドを持たないまま復元される。

### Options

- **Option A — 任意フィールド + 総関数読み**: `readonly semiPolicies?: readonly DecisionPolicy[]` とし、読み口を `projection.semiPolicies ?? []` の**単一の総関数**に閉じる。不変条件は「存在するなら mode は semi」の片方向のみ。
  - pros: 既存 journal は無改変で replay できる。読み口が1つで、旧/新の分岐が**存在しない**。「方針が無い」という状態は semi の正当な状態であり(`intent-statement.md:20` の「方針なしは縮退」)、不在は**縮退した梯子**として意味を持つ。
  - cons: 型が optional になる(`undefined` を扱う)。
  - reversibility: 中。
- **Option B — 必須フィールド + 不変条件の強化**: `readonly semiPolicies: readonly DecisionPolicy[]` とし、`assertLegalAutonomyProjection` で `Array.isArray` を要求する。
  - pros: 型が単純。
  - cons: **既存 journal の全 projection がこの検査に落ちる**(どの mode でもフィールドが無いため)。`transactionShape` が false → `decodeIntentAutonomyTransaction` が throw → **全 Intent の autonomy projection が復元不能**になる。NFR-2(replay から projection を復元できる)に正面から違反する。
  - reversibility: **極低**。
- **Option C — schemaVersion 2 の二重デコード**: `schemaVersion: 1` と `2` を別々にデコードする。
  - pros: 型は必須にできる。
  - cons: **旧形式と新形式の2本のデコード経路**が恒久的に残る。org.md Forbidden(要求されていない後方互換レイヤ・二重実装)と C-7 に正面から抵触する。requirements の OQ-2 も「互換レイヤの新設ではなく」と明示的に排除している。
  - reversibility: 低。

### Decision

**Option A(任意フィールド + 総関数読み)を採る。**

```
export interface AutonomyProjection {
  // ... 既存 13 フィールド ...
  readonly semiPolicies?: readonly DecisionPolicy[];
}

export function semiPoliciesOf(projection: AutonomyProjection): readonly DecisionPolicy[] {
  return projection.semiPolicies ?? [];
}
```

`assertLegalAutonomyProjection` へ追加する不変条件は**片方向のみ**:

```
if (projection.semiPolicies !== undefined && projection.mode !== "semi") {
  throw new Error("ILLEGAL_STATE:semi-policies-mode-combination");
}
```

### 「これは互換シムではない」の根拠(C-7 / org.md Forbidden への説明)

C-7 と org.md Forbidden が禁じるのは「**古い挙動を温存する分岐・シム・二重実装**」である。本決定はそれに当たらない:

1. **旧/新の分岐が存在しない**。読み口は `semiPoliciesOf` の1本だけで、`schemaVersion` も `if (legacy)` も持たない。
2. **不在は旧形式の徴ではなく、正当なドメイン状態である**。`--mode semi --policies-file` を渡さずに設定した semi Intent は、新形式でも `semiPolicies` を持たない(component-methods.md §C8 の表)。すなわち不在は「古い」ではなく「方針ゼロ」を意味する。
3. **不在の帰結は縮退であって旧挙動の再現ではない**。方針ゼロの semi は梯子の 0 段目(confirmed-policy)が空振りし、norm 以降の4段で解決する — これは `intent-statement.md:20`(「方針なしは3段縮退」)が想定している正規の挙動であり、旧 semi 挙動(質問で止まる)の温存ではない。
4. optional 型は**on-disk schema の正直な写像**である(parse, don't validate)。「必須と型で宣言しておいて実際は `undefined` が来る」より、optional で受けて総関数で潰すほうが型が事実に一致する。

### Consequences

- 既存 journal(全 mode)は無改変で replay できる。NFR-2 が満たされる。
- `semiPolicies` を読む箇所は `semiPoliciesOf` の1本に閉じる。直接 `projection.semiPolicies` を読む箇所を作らないことを functional-design のレビュー観点に固定する。**この規則は件数取得(`.length`)にも例外を設けない** — 件数は `semiPoliciesOf(projection).length` で取る。総関数が不在を `[]` へ潰すため `?? 0` のフォールバックも不要になる。
- `IntentAutonomyStatusEnvelope.policyCount` は `grant?.policies.length ?? semiPoliciesOf(projection).length` で解決する(C15)。
- **§12a レビュー iteration 1 の是正**: 本 Consequences と C15 実装案の間にあった自己矛盾を解消した。直読(`projection.semiPolicies?.length`)が残っていたのは components.md §C14〜C15 と component-methods.md §C15 の**2箇所**であり、両方を `semiPoliciesOf` 経由へ揃えた。本節の記述(`grant?.policies.length ?? semiPoliciesOf(projection).length`)は当初から直読ではなく、規則側の緩和は行っていない。
- **replay 側は無改訂**(`amadeus-intent-autonomy-replay.ts` は本 intent の diff に現れない)。OQ-2 の「既存の非 full `set-mode` 監査ブロックが拡張後の replay で復元できる」は、フィールドを任意にしたことで**構造的に**成立する。
- FR-POL-2 の digest 拡張は `displayDigest`(**projection に入らない表示用の値**)に対する変更であり、journal に保存される projection の digest とは別物である — したがって digest 拡張自体は replay 互換に影響しない。この分離の確認が OQ-2 の答えである。

### Alternatives Rejected

- **Option B(必須フィールド)** — 既存 journal の全 projection が `assertLegalAutonomyProjection` に落ち、`transactionShape` が false を返して `decodeIntentAutonomyTransaction` が throw する。全 Intent の autonomy projection が復元不能になり NFR-2 に違反する。journal は digest 束縛のため遡及修正もできない。
- **Option C(schemaVersion 2 の二重デコード)** — 旧形式デコーダが恒久的に残る。org.md Forbidden(移行シム・二重実装)と C-7(後方互換なし)に抵触し、requirements OQ-2 の「互換レイヤの新設ではなく」という枠づけにも反する。

---

## ADR-5 — 非 full の確認 digest を 1 定義へ寄せる

### Context

`architecture.md` 現在節「`--policies-file` の無音破棄」のとおり、`prepareNonFullCommand`(`amadeus-intent-autonomy-production.ts:382-395`)は policies を取らず、digest も方針を含まない(`:394` verbatim `    displayDigest: autonomyDigest({ intentUuid: before.intentUuid, mode }),`)。FR-POL-2 は「非 full の `displayDigest` を full 側の合成形と同形へ拡張し、方針集合を digest の合成対象に含める」を要求する。

現行の非 full digest は**2箇所**にある: revoke 版(`:387`)と set-mode 版(`:394`)。

### Options

- **Option A — `nonFullCommandDisplayDigest` の1定義へ寄せる**(`revokedGrantId: string | null` で分岐を吸収)。
  - pros: 「canonical 1定義から導出」(`phases/construction.md`)。合成対象の追加が1箇所で済む。
  - cons: 引数が1つ増える。
- **Option B — `grantIssuanceDisplayDigest` をそのまま再利用**。
  - pros: 新しい関数を作らない。
  - cons: `grantIssuanceDisplayDigest`(`:334-336`)は `principalId` と `scope: GrantScopeDescriptor` を**必須引数**に持つ。semi は grant scope を持たないため、ダミーの scope を組む必要が生じる(ADR-2 Option C と同型の偽装)。
- **Option C — digest は据え置き、方針は別欄で表示**。
  - pros: 変更が最小。
  - cons: FR-POL-2 の受け入れ基準(同一 mode・異なる policy 集合で digest が異なる)を満たさない。確認 digest の目的(人間が確認した内容と適用される内容の一致を機械照合する)が方針について果たされない。

### Decision

**Option A を採る。** `nonFullCommandDisplayDigest({ intentUuid, mode, revokedGrantId, policies })` を新設し、既存の 2 digest 生成をこれへ寄せる。合成は `autonomyDigest({ ...input, policySetDigest: autonomyDigest(input.policies) })` とし、full 側 `grantIssuanceDisplayDigest:334-336` と**同形**にする。

> **引用の意味論適合の照合**(`cid:application-design:citation-semantics-check`): `grantIssuanceDisplayDigest` は `principalId` と `scope` を合成対象に含む。`nonFullCommandDisplayDigest` は**含めない** — semi は grant scope を持たず(C-1)、`principalId` は非 full コマンドの確認内容ではないためである。これは**意図的相違**であり、FR-POL-2 の受け入れ基準は `policySetDigest` の合成だけで満たされる。

### Consequences

- 同一 mode・異なる policy 集合で digest が変わる(FR-POL-2 の受け入れ基準)。
- **非 full 側に digest 照合点が現状存在しない**ため、拡張した digest が実効を持つには照合点の追加が要る。この照合を `planHumanAutonomyCommand` の `set-mode` / `revoke-full` 分岐へ加えるか否かは **functional-design の設計事項**とする(§未確定事項 U-1)。
- `displayDigest` は projection に保存されない表示用の値であるため、ADR-4 の replay 互換とは独立である。

### Alternatives Rejected

- **Option B(`grantIssuanceDisplayDigest` の直接再利用)** — semi に存在しない `scope` / `principalId` をダミーで埋める必要があり、grant の意味論を semi へ持ち込むことになる(FR-AUTH-1 の3責務制限に反する)。
- **Option C(digest 据え置き)** — FR-POL-2 の受け入れ基準を満たさない。方針が確認内容に含まれないまま適用される経路が残る。

---

## ADR-6 — advisory の選択を `kind: "question"` occurrence へ写像する(OQ-ADV-K)

### Context

`requirements.md` **OQ-ADV-K**: 「FR-ADV-1 が advisory の選択を `kind: "question"` の occurrence へ写像する設計としたが、その写像が FR-AUTH-1 の semi 専用 authorization 型の scope 認可(許可する occurrence 種別の集合)および `selector` の一意化規約と整合するかは未設計。」

FR-ADV-1 の逐語: 「advisory の選択を `kind: "question"` の occurrence として組み、`selector` に advisory instance を含めて一意化する」。Out: 「`InteractionKind` への `advisory-choice` 追加(Q4 選択肢 C — scopeFingerprint 互換の棚卸しが本 intent の射程を広げるため非採用)」。

**整合性の2点を実測で確認する**:

**(1) scope 認可との整合**: `SemiAuthority` の `allowedInteractionKinds` は `SEMI_ROUTINE_INTERACTIONS = ["stage-gate", "question"]`(components.md §C1)。full grant 側は `ALL_INTERACTIONS`(`amadeus-intent-autonomy-production.ts:62-67`、4値すべて)。したがって `kind: "question"` の advisory occurrence は **semi でも full でも scope 内**である。✅ **整合する**。`InteractionKind` を増やさないため `scopeFingerprint` の互換棚卸しも発生しない(Out の非採用理由と一致)。

**(2) selector 一意化規約との整合**: `selector` は梯子の**2つの段が照合キーとして使う**:

- confirmed-policy 段(`:638-642`): `policy.selector === input.occurrence.selector`
- history 段(`:718-720`、verbatim `    fact.selector === occurrence.selector && fact.scopeLineageFingerprint === input.scopeLineageFingerprint &&`)

一方 occurrence の**一意性そのもの**は `occurrenceId`(`createInteractionOccurrence:453-472` が `intentUuid` / `kind` / `stage` / `phase` / `bolt` / `interactionId` / `optionIds` / `graphRevision` から合成)が担い、`selector` は合成対象に**含まれない**。したがって「selector に instance を含める」ことは occurrence の一意化には**必須ではなく**、むしろ**梯子の再利用性に影響する**。

### Options

- **Option A — `selector = advisory:<plugin>:<code>:<advisoryInstance>`**(FR-ADV-1 の逐語どおり)。
  - pros: 要件文に**逐語で適合**する。同一 advisory instance に対する裁定が他の instance へ波及しない(過去裁定の誤適用リスクがゼロ)。
  - cons: `advisoryInstance` は `randomUUID()`(`amadeus-advisory-choice.ts:374` verbatim `  instanceFactory: () => string = randomUUID,`)であり毎回異なるため、**confirmed-policy 段と history 段が構造的に一致しない**。advisory 裁定は実効的に norm / solo-election / agent-recommendation の3段で解決される。
  - reversibility: 中(selector は journal の `DecisionFact` に焼かれる)。
- **Option B — `selector = advisory:<plugin>:<code>`**(instance を含めない)。
  - pros: 同一 (plugin, code) の advisory に対する過去裁定・確認済み方針が再利用され、梯子5段がすべて機能する。
  - cons: **FR-ADV-1 の逐語からの逸脱**であり、`cid:requirements-analysis:implementation-deviation-election` / P3 により裁定が要る。また「一度 defer を選んだら以後の同種 advisory がすべて自動 defer される」という**望ましくない一般化**を history 段が生む危険がある(FR-ADV-4 の趣旨に反する方向)。
  - reversibility: 中。
- **Option C — `InteractionKind` へ `advisory-choice` を追加**。
  - **Out で明示的に非採用**(Q4 選択肢 C)。scopeFingerprint 互換の棚卸しが射程を広げる。

### Decision

**Option A(要件文の逐語どおり、`selector` に advisory instance を含める)を採る。**

```
kind:          "question"
interactionId: advisory-<advisoryInstance>
selector:      advisory:<plugin>:<code>:<advisoryInstance>
optionIds:     runRequired ? ["run-now"] : ["run-now", "defer-with-risk"]
```

**SAFE_ID 適合の実測**は component-methods.md §C16 の表に記載(`advisoryInstance` = `randomUUID()`、`code` ∈ `CODES`、`plugin` は `formal-model-check` — いずれも `/^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/` に適合)。

### Consequences

- **advisory の裁定は実効的に3段**(norm / solo-election / agent-recommendation)で解決される。confirmed-policy 段と history 段は selector が毎回異なるため一致しない。これは梯子が「決定的でない」ことを意味せず、`unreviewed` として検収対象になる裁定の割合が上がることを意味する(FR-LAD-4 の受け皿がそのまま働く)。
- 逆に、**過去の defer 選択が別 instance へ波及しない**という安全側の性質を得る。これは FR-ADV-4(`run_required` は強制実行)の趣旨と同じ方向であり、Option A を安全側の選択にしている。
- scope 認可は semi / full ともに整合する(上記 (1))。`InteractionKind` は増えない。
- **3段への縮退が実運用上許容できないと判明した場合**、Option B への変更は**仕様変更**(FR-ADV-1 の逐語の改訂)であり、エスカレーション正準リスト(4)によりユーザー裁定を要する。§未確定事項 U-2 に申し送る。

### Alternatives Rejected

- **Option B(instance を含めない selector)** — FR-ADV-1 の逐語からの逸脱であり、設計段で単独決定できない(P3)。加えて history 段が「一度の defer 選択」を同種 advisory 全体へ一般化する危険を持ち、FR-ADV-4 の趣旨(強制実行)と方向が逆になる。
- **Option C(`InteractionKind` の拡張)** — `requirements.md` Out で明示的に非採用。`scopeFingerprint` 互換の棚卸しが本 intent の射程を広げる。

---

## ADR-7 — stop hook の述語は分割する

### Context

FR-STOP-1 は「`isFullyAutonomousIntent`(`:167-178`)を**無条件に書き換えてはならない**。本 intent が semi へ開く呼び出し点は **`:422` のみ**とする」と要求する(留保 R3 の反映)。呼び出しは実測 3 箇所(`grep -n 'isFullyAutonomousIntent' packages/framework/core/hooks/amadeus-stop.ts` → 定義 `:167` / `:422` / `:457` / `:716`)。

### Options

- **Option A — 述語を2つに分ける**(full 限定 / 質問 carve-out)。
  - pros: 各呼び出し点が「自分は何を要求しているか」を関数名で表明する。`:457` / `:716` は述語の**中身を1文字も変えない**ため、無条件共有へ戻す誤りが構造的に起きない。
  - cons: 関数が1つ増える。改名する場合 `tests/.coverage-patch-allowlist.json:5268` と `tests/unit/t147-kiro-hook-adapter.test.ts:723` の同期が要る。
  - reversibility: 高。
- **Option B — 引数フラグ `allowSemi: boolean` を足す**。
  - pros: 関数が1つのまま。
  - cons: 呼び出し点の意味が**引数の真偽値へ散る**。`isFullyAutonomousIntent(state, dir, true)` は「full かどうか」を問うているのに semi でも真を返す — **関数名と挙動が乖離**する。誤って `true` を渡す変更がレビューで見えにくい。
  - reversibility: 高。
- **Option C — 呼び出し点側で `|| mode === "semi"` を足す**(述語は無改訂)。
  - pros: 述語の同一性が完全に保たれる。
  - cons: 認可判定のロジックが hook の呼び出し点に散る。`:422` は projection の `modeProvenance` も見る必要があるため、呼び出し点に projection 読取が現れる(責務の漏出)。

### Decision

**Option A(分割)を採る。** ただし**命名の最終形は functional-design へ委譲**する(OQ-3 が明示的に FD へ送っているため)。本 ADR が確定するのは「分割する」「引数フラグにしない」の2点である。

### Consequences

- `:457` / `:716` が使う full 限定述語は**現行 `isFullyAutonomousIntent` と完全同値**であり、FR-STOP-1 の受け入れ基準(2)の「落ちる実証」(無条件共有へ戻すと赤)がこの同値性を守る。
- 改名を選ぶ場合の同期対象は `tests/.coverage-patch-allowlist.json:5268`(実測 verbatim `      "function": "isFullyAutonomousIntent",`)と `tests/unit/t147-kiro-hook-adapter.test.ts:723`。
- carve-out 述語は projection の `modeProvenance.kind` を読むようになる(現行は `currentGrant.state` のみ)。読取は `readProductionAutonomyProjection` の 1 回で済む(追加 I/O ゼロ)。

### Alternatives Rejected

- **Option B(引数フラグ)** — 関数名と挙動が乖離し、呼び出し点の意図がレビューで見えなくなる。FR-STOP-1 が「無条件に書き換えてはならない」と警戒する事故(意図せず全呼び出し点を semi へ開く)を、引数の書き換え1文字で再現できてしまう。
- **Option C(呼び出し点で条件追加)** — 認可判定が hook の 3 箇所へ散る。`:422` には projection 読取が現れ、hook の責務(停止判定)と認可判定が混ざる。

---

## ADR-8 — `--autonomy` は engine 内で mode を適用する

### Context

`architecture.md` 現在節「`--autonomy` 起動フラグの結線余地」は「既存流儀に整合する形は、birth 経路の `birthPrintDirective`(`:2617-2646`)が先例となる『`amadeus-bolt set-autonomy` を名指しする print directive』である。ただしこれは設計候補であり、本 intent では未確定」と述べる。

一方 FR-CLI-2 の受け入れ基準(1)は「grant 不在の Intent への `--autonomy none` が **0 exit で mode=none を設定**」を要求し、FR-CLI-3(1)は「mode=semi の Intent へ `--autonomy semi` → 監査イベントを増やさず正常継続」を要求する。C-6 は `READ_ONLY_FLAGS` への追加を禁じる(autonomy は監査済みの状態変更であるため)。

### Options

- **Option A — engine 内で `applyProductionAutonomyMode` を呼ぶ**。
  - pros: 「起動の一手で走行水準を宣言し、**そのまま**無人で回す」(`requirements.md` Intent analysis 1)が成立する。FR-CLI-2(1)の「設定」を字義どおり満たす。書込経路は `amadeus-bolt set-autonomy` と**同一の関数**であり、第2の書込経路を作らない。
  - cons: engine の `next` が状態変更を伴う(ただし `next` は既に report / 監査 emit を通じて状態に触れており、read-only 契約ではない)。
  - reversibility: 中。
- **Option B — print directive で `amadeus-bolt set-autonomy` を案内するだけ**。
  - pros: engine の書込を増やさない。`birthPrintDirective` の既存流儀に沿う。
  - cons: **FR-CLI-2(1)の受け入れ基準を満たさない**(0 exit で「設定」されない)。利用者は起動コマンドの後にもう1コマンド打つ必要があり、`claude -p`・夜間・CI といった非対話起動では宣言が成立しない(Intent analysis 1 のゴールが達成されない)。
  - reversibility: 高。
- **Option C — `applyProductionAutonomyMode` に `source` 引数を足し、起動フラグ由来かを区別する**。
  - pros: 起動フラグ固有の制約(`revoke-full` 禁止)を production 層に集約できる。
  - cons: **ドメイン関数の挙動が呼び出し元の身元に依存する**ようになる。`amadeus-bolt set-autonomy --mode none` は revoke を許す必要があるため、同じ関数が2つの規則を持つ。フラグ形状の関心が production 層へ漏れる。

### Decision

**Option A(engine 内での適用)を採る。** ただし engine が持つのは**判定と委譲**のみで、書込は既存 `applyProductionAutonomyMode` が独占する(第2の書込経路を作らない)。起動フラグ固有の制約(再宣言の loud 化・`none` の grant チェック・`full` の fail-closed)は **C13 が保持する**(ADR-12)。

### Consequences

- `--autonomy` は `READ_ONLY_FLAGS` に入らない(C-6)。
- provenance は既存の HUMAN_TURN 要求(`amadeus-intent-autonomy-production.ts:409-411`)をそのまま通る。フラグ自体は provenance にならない(FR-CLI-5)。
- 判定 5(宣言済みかつ mode 異値 → loud)が判定 8(書込)より先に置かれることで、`prepareNonFullCommand:385-390` の `revoke-full` 経路が起動フラグから**構造的に到達不能**になる(FR-CLI-3(3))。判定順の全体は components.md §C13、判別子の裁定は ADR-13。
- engine の `handleNext` に新しい早期 return 分岐が1つ増える。既存の Branch 群(Branch 3b の `--scope` 検証 `:2632-2638` など)と同じ様式に置く。

### Alternatives Rejected

- **Option B(print directive のみ)** — FR-CLI-2(1)の受け入れ基準(0 exit で設定)を満たさない。`architecture.md` が先例として挙げた `birthPrintDirective` は「まだ Intent が無い」状況の案内であり、本件は「Intent があり mode を宣言する」状況で、既に適用可能な状態にある — **引用元と状況の意味論が異なる**(`cid:application-design:citation-semantics-check`)。
- **Option C(`source` 引数)** — ドメイン関数の挙動が呼び出し元の身元に依存する設計になる。起動フラグの制約は起動フラグのハンドラが持つべきである(ADR-12)。

---

## ADR-9 — advisory store の schema を 2 へ上げる

### Context

FR-ADV-3 は receipt の provenance を判別ユニオン化し、**並存でなく置換**とすることを要求する(留保 R5)。`AdvisoryChoiceReceipt` は `humanTurn: HumanTurnProvenance` を必須に持つ(`amadeus-advisory-choice.ts:54-64`)。store は `.amadeus-advisory-choice.json` に永続化され、`parseStore:450-467` が `value.schema !== 1` を拒否する。

**永続面の性質の実読**: store は docsRoot 配下の `.amadeus-*` であり、`.claude/CLAUDE.md` § Git Integration の gitignore 対象(`amadeus/spaces/*/intents/*/.amadeus-*`)= **machine-local runtime** である。監査 journal(version-controlled)とは信頼水準が異なる。

### Options

- **Option A — schema を 2 へ上げ、schema 1 は既存の fail-closed 経路で hold にする**。
  - pros: 読替コードを1行も書かない。`guardAdvisoryChoicesLocked:743`(verbatim `  if (intentRun === null || !storeResult.ok) return fallbackAdvisoryHold(stage, advisories, intentRun);`)が**既に**不正 store を hold へ倒す経路を持っており、**既存機構に載るだけ**である。失われるのは machine-local な過去 receipt のみで、結果は「人間にもう一度選ばせる」= fail-closed。
  - cons: 移行時に一度だけ人間の選択が要る Intent がありうる。
  - reversibility: 高。
- **Option B — schema 1 の receipt を読み替えて `provenance: {kind:"human-turn", ...}` へ変換**。
  - pros: 過去 receipt が保存される。
  - cons: **旧形式の読替コードが恒久的に残る**。org.md Forbidden(移行シム)と C-7 に抵触する。version-controlled でない machine-local ファイルのために互換負債を負う。
  - reversibility: 低。
- **Option C — `humanTurn` を optional にして `provenance` を併置**。
  - pros: 型変更が最小。
  - cons: **並存**であり FR-ADV-3(置換)と留保 R5 に正面から違反する。受理の3点が2つのフィールドを見ることになり、二重実装になる。

### Decision

**Option A(schema 2 + 既存 fail-closed 経路)を採る。** `parseStore` の `value.schema !== 1` を `!== 2` へ変える(1行)。

> **既存機構の供給面の実読**(`cid:functional-design:c8`): `guardAdvisoryChoicesLocked` の `!storeResult.ok → fallbackAdvisoryHold` は**engine 側ハードコードではなく既存の分岐**であり、`readStore:473-481` が `parseStore` の失敗をそのまま返す構造で成立している。ADR-9 が「既存機構に載るだけ」と言えるのはこの2関数の直読による。**新しいエラー経路も新しい directive 種別も追加しない。**

### Consequences

- schema 1 の store を持つ Intent は、次回 advisory 発火時に一度 hold になり人間が選び直す。これは fail-closed であり安全側。
- 読替コードがゼロなので C-7 / org.md Forbidden に抵触しない。
- receipt の `humanTurn` フィールドは**消える**。`hasMatchingAdvisoryPresentation` / `isGroundedHumanTurn` は `provenance.kind === "human-turn"` の分岐内でのみ呼ばれる(component-methods.md §C17)。
- 重複排除が provenance 種別を跨いで働くよう、`acceptsFreshChoice:838-850`(identity 単位の判定)を受理の前段へ引き上げる。新しい索引は作らない。

### Alternatives Rejected

- **Option B(読替)** — machine-local な使い捨てファイルのために恒久的な旧形式デコーダを抱える。C-7 と org.md Forbidden に抵触する。
- **Option C(`humanTurn` optional + `provenance` 併置)** — FR-ADV-3 の「置換」と留保 R5 に違反する。受理の3点が2フィールドを見る二重実装になる。

---

## ADR-10 — statusline は state ファイルを読む

### Context

FR-DISP-1 は statusline への Autonomy 表示を要求する。`amadeus-statusline.ts` は**毎プロンプト**起動される non-blocking hook である(`component-inventory.md:723` の hook インベントリ実測)。`main()` は既に state ファイルを読み込んでいる(`:286`、verbatim `  const state = readFileSync(stateFile, "utf-8");`)。

### Options

- **Option A — state ファイルの `Intent Autonomy Mode` を `extractField` で読む**。
  - pros: **追加 I/O ゼロ**(既読の文字列から抽出するだけ)。`amadeus-stop.ts` の `intentAutonomyMode:162-165`(verbatim `  const mode = getField(stateContent, "Intent Autonomy Mode")?.trim();`)と**同じ情報源**であり、hook 層の一貫性が保たれる。
  - cons: state は投影であり canonical ではない(`architecture.md` 現在節「永続化3面」)。state と projection が乖離した場合、表示が projection と食い違う。
  - reversibility: 高。
- **Option B — `readProductionAutonomyProjection` で canonical を読む**。
  - pros: canonical と一致する。grant の state まで表示できる。
  - cons: 毎プロンプトで**監査シャードの全読 + 全トランザクションの replay** が走る。statusline は non-blocking だが人間の体感遅延に直結する。`cid:nfr-design:c1`(CLI/library の NFR では常駐 service 向け機構を持ち込まない)と、NFR-3 の趣旨(表示のために I/O を増やさない)に反する。
  - reversibility: 高。
- **Option C — state を読んで表示しつつ、projection と突き合わせて乖離時に警告記号を添える**(両方読む)。
  - pros: 表示が canonical と一致し、かつ乖離そのものを可視化できる(state 手術の早期検知)。
  - cons: **projection 読取のコストが Option B と同じ**(毎プロンプトの監査全読)であり、Option B の却下理由がそのまま当たる。加えて statusline に「警告状態」という第2の表示語彙が生まれ、FR-DISP-1 の受け入れ基準(`--status` と同一の mode 名を使い表示専用語彙を作らない)に抵触する。乖離の検出は canonical を読む `--status`(C15)が既に担う。
  - reversibility: 高。

### Decision

**Option A(state ファイル読み)を採る。** 表示語彙は `--status` の `Autonomy:` 行(`amadeus-utility.ts:341`)と同一の mode 名(`none` / `semi` / `full`)を使う。表示専用語彙は作らない(FR-DISP-1 の受け入れ基準)。

### Consequences

- statusline の実行コストは実質不変。
- state と projection の乖離時、statusline は state 側を表示する。**canonical を見たいときは `--status`** という役割分担になる(`--status` は C15 で projection を読む)。この分担を docs の該当箇所へ1行で明記する(FR-DOC-1 の改訂範囲内)。
- 表示形式(OQ-5)は ` @<mode>` の固定 5〜6 文字とし、既存 `printLine` の幅処理に委ねる(component-methods.md §C14)。追加の省略規則を設けない。

### Alternatives Rejected

- **Option B(projection 読み)** — 毎プロンプトの監査全読は表示のためのコストとして過大。`cid:nfr-design:c1` と NFR-3 の趣旨に反する。
- **Option C(両読み + 乖離警告)** — projection 読取のコストは Option B と同一であり同じ理由で却下される。加えて警告表示が FR-DISP-1 の「表示専用語彙を作らない」に抵触し、乖離検出は `--status`(C15)と役割が重複する。

---

## ADR-11 — `run_required: true` の強制は選択肢空間と効果分類の2面で行う

### Context

`requirements.md` OQ-6 は「`run_required: true` の強制実行(FR-ADV-4)を実装する層。guard 側(`guardAdvisoryChoices`)か directive 検証側(`amadeus-directive.ts:684-688`)か、両方か。plugin 非依存でない事実(FR-ADV-5)との整合を実装時に確認する」と問う。

FR-ADV-4 は「**新規性の明示**: これは現行コードの追認ではない。(中略)**`defer-with-risk` を禁じる強制は現行コードに存在しない**」と述べる(留保 R6)。FR-ADV-5 は「`run_required` 経路は plugin 非依存**ではない** — `formalCheckRoute`(`:677`)が実行コマンドをハードコードしている(`:685`、verbatim `    "bun", "plugins/formal-model-check/tools/run-model-check.ts",`)」と射程を限定する(留保 R7)。

### Options

- **Option A — 無人経路の選択肢集合を絞る(主)+ 効果分類で封じる(従)**。
  - pros: 選択肢空間側は「無人裁定に `defer-with-risk` を提示しない」を保証し、効果分類側は「万一選ばれても適用されない」を保証する。**2つは別の不変量**(どの選択肢が存在するか / どの効果が許されるか)であり二重実装ではない。人間経路は無改訂(FR-ADV-4 が「人間経路での `defer-with-risk` の可否は本 intent で変更しない」と要求)。
  - cons: 2箇所を触る。
  - reversibility: 高。
- **Option B — directive 検証側(`amadeus-directive.ts:684-688`)で強制**。
  - pros: directive の schema 検証は既存のゲート。
  - cons: directive 検証は**directive が組み立てられた後**に走る。無人経路は `await-advisory-choice` を組み立てる**前**に判定する必要があるため、時点が合わない。加えて `amadeus-directive.ts` は C-3 により本 intent で触らない面である。
  - reversibility: 高。
- **Option C — 効果分類のみで封じる**(選択肢集合は常に2値)。
  - pros: 変更が1箇所。
  - cons: 梯子が `defer-with-risk` を選び、効果適用で拒否され、人間経路へ落ちる — という**無駄な1往復**が毎回起きる。`run_required` の advisory では梯子の選択が常に無意味になる。

### Decision

**Option A を採る。**

- **主(選択肢空間)**: C16 が occurrence を組むとき `optionIds = hold.runRequired ? ["run-now"] : ["run-now", "defer-with-risk"]` とする。
- **従(効果分類)**: effect registry で `defer-with-risk` を `classification: "quality-waiver"` とする。`quality-waiver` が `PROHIBITED_EFFECTS`(`amadeus-intent-autonomy-production.ts:69-75`、5値)に**実在すること**は起草時に実読で確認した(測定 ref `d405e34c5`、verbatim):

  ```
  const PROHIBITED_EFFECTS = [
    "new-permission",
    "irreversible",
    "scope-out",
    "norm-waiver",
    "quality-waiver",
  ] as const;
  ```

  この定数は `:277`(verbatim `    prohibitedEffects: PROHIBITED_EFFECTS,`)で grant scope へ載る。したがって `defer-with-risk` は semi の `applySemiDecision` の `workflow-reversible` 要求と full の `authorizeDecisionEffect` の `prohibitedEffects` 照合の**両方**で弾かれる。**本 ADR の従機構はこの収載に全面依存する**ため、収載が崩れると FR-ADV-4 の fail-closed が空文化する — functional-design で `quality-waiver` の収載を assert するテストを置くこと(⚠ 申し送り)。
- **directive 検証側(`amadeus-directive.ts:684-688`)は不変**(C-3 と整合)。

### Consequences

- `run_required: true` では無人経路に `defer-with-risk` が**存在しない**(FR-ADV-4 の受け入れ基準「選ばせようとすると fail-closed で拒否される」は従の面が担う)。
- `run_required: false` でも無人経路は `defer-with-risk` を**適用できない**(効果分類が prohibited)。梯子が defer を選んだ場合は `semi-gate-effect-not-authorized` / `PROHIBITED_EFFECT` により人間経路へ戻る — 梯子は「決定器」ではなく「フィルタ」として働く。この挙動は FR-ADV-4 が禁じる範囲より**厳しい**が、Out(「`run_required: true` advisory の無人 `defer-with-risk`」)に違反せず、fail-closed 側への逸脱である。
- 人間経路の `defer-with-risk` は無改訂(`ADVISORY_CHOICE_OPTIONS:25-28` の2値は不変、A-6 と一致)。
- FR-ADV-5 の射程注記を守る: 本 ADR は `run_required` の**強制**を扱うが、`formalCheckRoute:685` のコマンドハードコードには触れない。「`run_required` 経路が plugin 非依存である」とは**本文書のどこにも書かない**。plugin 非依存を主張するのは `guardAdvisoryChoices` の**hold 判定の面に限る**。

### Alternatives Rejected

- **Option B(directive 検証側)** — 判定の時点が合わない(directive 組み立て後)。C-3 により `amadeus-directive.ts` は本 intent の非改訂面である。
- **Option C(効果分類のみ)** — `run_required` の advisory で毎回無駄な1往復が起きる。梯子の選択が構造的に無意味になり、検証劇場に近づく。

---

## ADR-12 — `--autonomy none` の grant 実在チェックは C13 が所有する

### Context

**ユーザー裁定 2026-08-05**(エスカレーション正準リスト(4)仕様変更)により `--autonomy` の値域が 2値 → 3値へ改訂された。FR-CLI-2 の逐語: 「`--autonomy none` は **active grant が存在しない Intent に対してのみ受理**する(mode を `none` へ設定、または既に `none` なら no-op)。**active grant が存在する Intent への `--autonomy none` は loud エラーで停止**し、`amadeus-bolt set-autonomy --mode none`(明示 revoke)を案内する — 不可逆寄りの grant 取消を起動フラグの側面効果にしない。」

**危険の機構**(実読): C13 が素朴に `applyProductionAutonomyMode({ mode: "none" })` を呼ぶと、`prepareNonFullCommand:385-390` の分岐(verbatim `  if (before.currentGrant !== null) {` / `      command: { kind: "revoke-full", targetMode: mode },`)により **grant が無言で revoke される**。これが FR-CLI-2 が禁じる「側面効果としての grant 取消」である。したがってチェックの所有者を決めることは必須である。

### Options

- **Option A — C13(engine 側の適用ハンドラ)が所有**。`readProductionAutonomyProjection` で active grant を読み、実在すれば loud stop。
  - pros: 起動フラグ固有の制約が起動フラグのハンドラに閉じる。`amadeus-bolt set-autonomy --mode none` の revoke 経路は無改訂で残る(明示コマンドとしての revoke は正当)。読取は read-only で監査イベントを生まない。
  - cons: engine が projection を1回読む(advisory hold と同様、既に `productionStageAutonomy:2183` が読んでいる面)。
  - reversibility: 高。
- **Option B — print directive で `amadeus-bolt set-autonomy` を案内するのみ**(engine は判定しない)。
  - pros: engine が grant を知らずに済む。
  - cons: **判定なしでは案内すべきかどうかが分からない**。grant 不在の Intent への `--autonomy none` は FR-CLI-2(1)により 0 exit で設定されねばならないため、engine は結局 grant の有無を知る必要がある。案内一本にすると FR-CLI-2(1)が満たせない。
  - reversibility: 高。
- **Option C — `applyProductionAutonomyMode` に `allowRevoke: boolean` を足して production 層で拒否**。
  - pros: revoke の禁止が書込関数に隣接する。
  - cons: ADR-8 Option C と同型の問題 — ドメイン関数の挙動が呼び出し元の身元(起動フラグか明示コマンドか)に依存する。`amadeus-bolt set-autonomy` は revoke を許す必要があるため、同じ関数が2つの規則を持つ。

### Decision

**Option A(C13 が所有)を採る。** かつ **projection 読取不能(`unreadable`)も拒否側に倒す**(fail-closed)。

```
function activeGrantState(projectDir: string): "present" | "absent" | "unreadable";
```

**ADR-13 による実装形の更新**: ADR-13 が同じ projection 読取から宣言状態(`modeProvenance.kind`)も取るため、この3値述語は `readLaunchAutonomyContext`(component-methods.md §C13)へ統合され、`unreadable` は読取そのものの失敗として、`present` / `absent` は `grant` フィールドとして表現される。**判定内容は不変**(読取不能は拒否側へ倒す)であり、変わるのは projection 読取が2回でなく1回になる点のみである。

- 判定 3(全値共通、読取不能): loud stop
- 判定 6(`--autonomy none`): `grant === "present"` → loud stop
- 判定 7(`--autonomy full`): `grant === "present"` のみ通す

> **引用の意味論適合の照合**(`cid:application-design:citation-semantics-check`): 引用元 `isFullyAutonomousIntent:175-177` の `catch → false` は「carve-out を与えない = 保守側」を意味する。判定 3 で同じ `catch → false` を使うと「grant も宣言状態も不明なら `--autonomy none` を通す」= **緩和側**になり、引用元と意味が逆転する。したがって判定 3 は `catch` を吸収せず読取不能を明示し、拒否側へ倒す。これは**意図的相違**であり、引用元の様式をそのまま持ち込まない理由を明記する。

### Consequences

- 起動フラグから `revoke-full` 経路へ到達できない(FR-CLI-2(2) / FR-CLI-3(3))。防壁は二重: 判定 5(宣言済みかつ mode 異値の loud)と判定 6(grant 実在の loud)。**判定 6 は宣言状態の記録が grant の実在と乖離した場合(state 手術・部分書込)にも grant を守る** — これが判定 6 を state 読取ではなく projection 読取で行う理由である。
- 落ちる実証(FR-CLI-2(4)): `readLaunchAutonomyContext` の `grant` を無条件 `"absent"` に差し替えると判定 6 のテストが赤になる。
- engine は projection を読むが**書かない**。書込は `applyProductionAutonomyMode` が独占する(ADR-8)。
- **directive 値域との非同一視**(C-3): C13 は `directive.intent_autonomy_mode` へ一切書き込まない。directive への射影は `routeMainWorkflowDirective:2192`(verbatim `  if (autonomy.mode === "semi" || autonomy.mode === "full") {`)が独占し、この 1 行が `none` の搬送を構造的に排除する。**この供給面は実読で確定した**(`cid:functional-design:c8`)— `:2192-2199` の直読で、この `if` の外に `directive.intent_autonomy_mode` への代入が無いことを確認している。`amadeus-directive.ts:97` / `:606` は本 intent の diff に現れない。

### Alternatives Rejected

- **Option B(print directive のみ)** — FR-CLI-2(1)(grant 不在なら 0 exit で設定)を満たせない。案内の要否を判断するために結局 grant の有無を知る必要があり、判定を避けられない。
- **Option C(`allowRevoke` 引数)** — ドメイン関数の挙動が呼び出し元の身元に依存する。`amadeus-bolt set-autonomy --mode none` の明示 revoke は正当な操作であり、同じ関数が文脈で規則を変えるのは責務の混線である。

---

## ADR-13 — 「宣言済み」の判別子は `modeProvenance.kind` とする

### Context

C13 の判定順(components.md §C13)は「mode が既に宣言済みか」を判別し、宣言済みかつ異値なら loud 停止する(FR-CLI-3(2))。当初案はこの判別を **state ファイルの `Intent Autonomy Mode` フィールドの有無・値**で行っていた。

**§12a レビュー iteration 1 の FOLLOW-UP がこの前提を未実測と指摘し、conductor が実測した結果、前提は成立しないと判明した**(測定 ref `d405e34c5`):

`amadeus-utility.ts:4635` verbatim:

```
- **Intent Autonomy Mode**: none
```

state テンプレートは Intent の birth 時点でこのフィールドを **`none` として必ず書く**。したがって「フィールドが無ければ未宣言」は恒偽であり、「値が `none` なら未宣言」も採れない(`--autonomy none` を明示宣言した Intent と区別できなくなる)。当初案のままだと**新規 Intent への `--autonomy semi` が常に「設定済み(`none`)かつ異値」と判定されて loud 停止**し、FR-CLI-1 / FR-CLI-3 が想定する主用途(起動の一手で走行水準を宣言する)が構造的に成立しない。

### Options

- **Option A — `modeProvenance.kind === "human-command"` を判別子にする**。
  - pros: 「人間が宣言したか」を**直接**表す事実を使う。既存機構の再利用であり新設ゼロ — `authorizeInteraction:512`(verbatim `    if (!internalGate \|\| projection.modeProvenance.kind !== "human-command") {`)が既に同じ述語を認可に使っている。判別が projection(canonical)側で完結し、state 投影の乖離に影響されない。
  - cons: 判別に projection 読取が要る(ただし ADR-12 が同じ読取を既に要求しており、1回に統合できる)。
  - reversibility: 高。
- **Option B — state に「未宣言」を表す新しい語彙(`unset` 等)を導入する**。
  - pros: state だけで判別でき projection 読取が不要。
  - cons: `AutonomyMode`(`amadeus-intent-autonomy.ts:11`、verbatim `export type AutonomyMode = "none" | "semi" | "full";`)の値域に無い第4の語彙を state 面だけに作ることになり、`readAutonomyMode`(`amadeus-orchestrate.ts:1615-1623`)・`intentAutonomyMode`(`amadeus-stop.ts:162-165`)など既存の全読み手へ伝播する。state テンプレート(`:4635`)の既定値変更は既存 Intent との非互換も生む。C-7(後方互換なし)の下で既存 state の読替が必要になる。
  - reversibility: 低(state 語彙は永続面)。
- **Option C — 判別をやめ、再宣言は常に受理する**(異値でも上書き)。
  - pros: 実装が最小。主用途は当然成立する。
  - cons: **FR-CLI-3(2)(既存 mode と異値の再宣言は loud エラー)に正面から違反**する。さらに `full` → `none` の異値宣言が判定 6 の grant チェックのみに依存することになり、FR-CLI-2(2)が禁じる「側面効果としての grant 取消」への防壁が二重から一重へ落ちる。
  - reversibility: 高。

### Decision

**Option A(`modeProvenance.kind` を判別子とする)を採る。**

```
declared = (projection.modeProvenance.kind === "human-command")
```

- `kind !== "human-command"`(= `system-default` / `legacy-fail-closed`)→ **未宣言**。`--autonomy <any>` を**初回宣言として受理**し、loud にしない(components.md §C13 判定 4)。
- `kind === "human-command"` → **宣言済み**。同値は no-op、異値は loud(判定 5)。

**判別子の値域と生成点の実読**(`cid:functional-design:c8` — 供給面を実読で確定する):

| 事実 | file:line | verbatim |
| --- | --- | --- |
| `ModeProvenance` は3値の判別ユニオン | `amadeus-intent-autonomy.ts:50-72` | `export type ModeProvenance =` / `      readonly kind: "human-command";` / `      readonly kind: "system-default";` / `      readonly kind: "legacy-fail-closed";` |
| 初期投影は `system-default`(legacy 無し) | 同 `:217-218` | `  const modeProvenance: ModeProvenance = legacy.length === 0` / `    ? { kind: "system-default", targetIntentUuid: input.intentUuid, sourceIdentity: "DEFAULT_MODE_V1", after: "none" }` |
| legacy standing grant 保有時は `legacy-fail-closed`、mode は `none` | 同 `:219-224` / `:227` | `        kind: "legacy-fail-closed",` / `    mode: "none",` |
| legacy 側も「人間による mode 選択が未了」と診断する | 同 `:234-238` | `      recommendedHumanAction: "select-intent-autonomy-mode",` |
| 人間コマンド通過時のみ `human-command` へ遷移(`set-mode` / `issue-full` / `replace-full` / `revoke-full` 共通の1箇所) | 同 `:359-360` / `:376` | `    const provenance: ModeProvenance = {` / `      kind: "human-command",` / `      modeProvenance: provenance,` |

`legacy-fail-closed` を**未宣言側**に含めるのは、`:234-238` の診断が明示的に mode 選択を推奨しており、mode が `none` に固定されたまま人間の宣言を待つ状態だからである。

### Consequences

- 新規 Intent への `--autonomy semi` / `--autonomy full` / `--autonomy none` が**初回宣言として受理される**。FR-CLI-1 / FR-CLI-3 の主用途が成立する。
- 判別に projection 読取が要るが、ADR-12 の grant 実在チェックと**同じ読取**であり、`readLaunchAutonomyContext`(component-methods.md §C13)の1回に統合される。追加 I/O はゼロ。
- 判別が canonical(projection)側で完結するため、state 投影が乖離しても判定は壊れない。ADR-10(statusline は state を読む)との役割分担は保たれる — 表示は state、**認可・判定は projection** である。
- state の `Intent Autonomy Mode` フィールドは**判別に使わない**が、表示(C14)と既存の scheduling 読み(`readAutonomyMode`)では引き続き使われる。本 ADR はフィールドの意味を変えない。
- 落ちる実証(FR-CLI-3): `declared` を無条件 `true` に差し替えると、新規 Intent への `--autonomy semi` が判定 5 の異値で loud 停止して赤になる。逆に無条件 `false` に差し替えると、宣言済み Intent への異値再宣言が黙って通り FR-CLI-3(2)のテストが赤になる。**両方向で赤にできる**ことがこの判別子が実効を持つ証拠である。

### Alternatives Rejected

- **Option B(state に `unset` 語彙を導入)** — `AutonomyMode` の値域に無い第4語彙を state 面だけに作り、既存の全読み手(`readAutonomyMode` / `intentAutonomyMode` / statusline)へ伝播する。state テンプレートの既定値変更は既存 Intent との非互換も生み、C-7 の下で読替が必要になる。可逆性が最も低い。
- **Option C(判別をやめる)** — FR-CLI-3(2)に正面から違反する。加えて `full` → `none` の異値宣言に対する防壁が判定 6 のみになり、FR-CLI-2(2)が求める二重防壁が一重へ落ちる。

---

## 可逆性の総括

`phases/inception.md` は「不可逆な決定にはより厳しい検討を」と要求する。

| 可逆性 | ADR | 理由 |
| --- | --- | --- |
| 高 | ADR-2 / ADR-3 / ADR-5 / ADR-7 / ADR-9 / ADR-10 / ADR-11 / ADR-12 / ADR-13 | 関数シグネチャ・machine-local ファイル・表示など、変更しても既存データが壊れない(ADR-13 は判別子の選択のみで、永続面に触れない) |
| 中 | ADR-1 / ADR-6 / ADR-8 | 型の union / journal に焼かれる `selector` / engine の書込経路。変更は可能だが既存 journal の解釈に影響しうる |
| **低** | **ADR-4** | 監査 journal(version-controlled、digest 束縛)の schema に触れる。誤ると全 Intent の projection が復元不能になる |

**ADR-4 に対する追加の検討**: Option B(必須フィールド)を採った場合の失敗モードを実読で確定した — `transactionShape:34-45` が `assertLegalAutonomyProjection` を通し、false を返すと `decodeIntentAutonomyTransaction:53-62` が `throw new Error("invalid-intent-autonomy-transaction")` する。この throw は `readIntentAutonomyTransactions:95-120` の中で起き、catch されずに伝播する。すなわち**1件でも旧形式 projection があれば当該 Intent の autonomy が全損する**。任意フィールドを選ぶ判断はこの実読に基づく。

---

## 未確定事項(下流ステージへの申し送り)

| # | 未確定 | 送り先 | 確定条件 |
| --- | --- | --- | --- |
| U-1 | 非 full の `confirmedDisplayDigest` 照合点を `planHumanAutonomyCommand` の `set-mode` / `revoke-full` 分岐へ加えるか(ADR-5 Consequences) | functional-design | 照合点が無いと拡張 digest が実効を持たない。FR-POL-2 の受け入れ基準を満たす最小形を決める |
| U-2 | ADR-6 の selector に instance を含める設計が生む「梯子3段への縮退」が実運用で許容できるか | 運用観測 → 必要なら**ユーザー裁定**(仕様変更) | Option B への変更は FR-ADV-1 逐語の改訂であり、エスカレーション正準リスト(4)によりユーザー裁定を要する |
| U-3 | `withAuditLock` の再入可否。C16 を `guardAdvisoryChoices` の外側から呼ぶ配置でロック区間が重ならないことの実測 | functional-design / code-generation | ⚠ 実装時実測が確定条件。重なる場合は C16 の呼び出し位置を再検討する |
| U-4 | `semi-mode-gate` / `MODE_REQUIRES_HUMAN` / `full-grant-required` の文字列を assert する既存テストの全数(2キー棚卸し) | functional-design | ⚠ 本設計段では棚卸し未実施。識別子と展開後リテラルの両キーで grep する(`cid:application-design:dual-key-consumer-inventory`) |
| U-5 | stop hook 述語の最終命名と `tests/.coverage-patch-allowlist.json:5268` / `tests/unit/t147-kiro-hook-adapter.test.ts:723` の同期 | functional-design(OQ-3) | ADR-7 は「分割する」までを確定。命名は FD |
| U-6 | `tests/.coverage-patch-allowlist.json` の行ピン再束縛(本 intent が `amadeus-stop.ts` / `amadeus-orchestrate.ts` などへ行を挿入するため) | code-generation | `cid:code-generation:c1-allowlist-mechanical-remap` / `cid:code-generation:cg-allowlist-straddle-swell` に従う。**縮小見込みの数値は本設計段で断定しない**(`cid:application-design:c1-future-value-trace`)— 述語の意味論を対象変更へ適用した机上トレースか実測が確定条件 |
| U-7 | `run_required: true` の advisory を無人経路が `run-now` で解決した後、実際に formal check を実行させる結線(`formalCheckRoute` の command をどこが実行するか) | code-generation(OQ-6) | 現行は `await-advisory-choice` directive の `formal_checks` として conductor へ渡している。無人経路では directive を返さないため、実行の担い手が未確定。FR-ADV-5 の射程注記(plugin 非依存でない)と併せて実装時に確定する |
