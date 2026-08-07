# U1 detection-skeleton — Business Rules

**上流入力(consumes 全数)**: `requirements`(FR-1/FR-2・AC-1/AC-2 — 各 BR の受け入れ根拠)/ `components`(C-1/C-2/C-4/C-5/C-6 の責務)/ `component-methods`(シグネチャと注入点)/ `unit-of-work`(U1 完了条件)/ `unit-of-work-story-map`(警告の受け手)/ `services`(fail-open・配布契約)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## BR-U1-1: verdict の判定順(先勝ち)

`classifyAgentType(agentType, resolution)` の判定は次の順で最初に該当した値を返す:
1. `agentType === "unknown"` → `unknown-type`
2. 台帳(BUILTIN_AGENT_TYPES — 同モジュールの sibling export C-4)に完全一致 → `builtin`
3. `resolution.allowed.has(agentType)` → `persona`(allowed = persona ∪ builtin の合成につき、builtin を先に除いた残余一致は persona)
4. それ以外 → `outside-allowed-set`

根拠: 判定1を先頭に置くことで、台帳・persona 側の誤収載に対しても「型未指定は必ず警告対象」の不変条件2(domain-entities)が成立する。判定2を判定3より先に置くことで、component-methods.md の `AllowedSetResolution`(3フィールド)へフィールドを追加せずに persona/builtin を区別できる(§12a iteration 1 BLOCKER の是正 — canonical シグネチャ保存)。組込型と同名の persona は `builtin` に分類される(domain-entities 不変条件5 — 警告発火に影響なし)。

**意図的相違の明文照合(`citation-semantics-check`)**: component-methods.md の規則コメント「persona 集合に完全一致 → persona / 台帳に完全一致 → builtin」は persona 先勝ちの順序を示唆するが、本 FD は **builtin 先勝ちへ意図的に置き換える** — AD の3フィールド署名には persona 単独集合が存在せず、コメントの順序どおりには実装不能なため(署名と規則コメントの AD 内不整合を FD 側で解消)。警告発火集合(FR-2b: `unknown-type` ∪ `outside-allowed-set`)は両順序で同一のため要件への影響はない。

## BR-U1-2: 警告の発火条件と形

- 発火条件: verdict ∈ {`unknown-type`, `outside-allowed-set`}(FR-2b)。警告の受け手は unit-of-work-story-map の検出ジャーニー(セッションを運転する人間)— audit を開かずに stderr で即時に気づける形にする
- 形: **stderr へ1行** `advisory: subagent type "<値>" is <verdict> (allowed set: personas + builtin ledger) — see #2279`(ADR-1)。値は `subagentPurposeLine` と同様に制御文字を除去してから埋め込む(audit 行汚染の既存防御と同水準)
- **fail-closed 拒否はしない** — 警告後も emit は継続(#2279 代替案2の非採用)

## BR-U1-3: fail-open(NFR-3)

照合・解決経路(C-1 の dir 読取、C-2 の分類、属性組立)のいずれで throw が起きても、(a) catch して stderr へ警告1行 (b) `Type Verdict` 属性の追加をスキップ (c) **既存フィールドでの emit を継続**する。監査の書込を止める失敗モードを構造的に排除する。

## BR-U1-4: completed 面への差し込み位置

`core/hooks/amadeus-log-subagent.ts` の `normalizeAgentType(parsed.agent_type)`(`:50`)直後で C-1/C-2 を呼び、`:68-72` のフィールド構成へ `"Type Verdict"` を追加する。started 面(`subagentStartFields`)への差し込みは **U2 の範囲**(unit-of-work の割付どおり — U1 は completed 単面)。

## BR-U1-5: registry 追加(C-6 の U1 半面)

`SUBAGENT_COMPLETED`(`event-registry.ts:624-632`)の optional 列へ `"Type Verdict"` を追加する。required は触らない。`SUBAGENT_STARTED` 側の optional 追加は U2 で行う(U1 は completed 面のみを出荷するため — 台帳の同一 PR 内順序制約「C-6 → C-5」は U1 内で completed 分について成立)。

## BR-U1-6: 許可集合の解決タイミング

hook 発火ごとに `.claude/agents/` を読み直す(キャッシュなし — `services.md` の決定的ファイル境界契約)。agents dir のパス解決は hook が既に持つ project-dir 文脈から行い、新しい環境変数を導入しない(`cid:infrastructure-design:guard-activator` — 起動者不在の設定を作らない)。

## BR-U1-7: テスト契約(AC-1 / AC-2)

- unit 層: `classifyAgentType` の4 verdict 全分岐 + 判定順(台帳へ `unknown` を注入しても `unknown-type` が勝つ / 組込型と同名の allowed 値は `builtin` が勝つ — 不変条件5)+ ケーシング対照(`Explore` ≠ `explore`)
- integration 層: `resolveAllowedAgentTypes`(実 FS — `cid:code-generation:fs-tests-integration-first`)の正常系 + dir 不在の fail-open
- **落ちる実証(AC-2)**: 集合外型の payload を completed hook 経由で流し、stderr advisory と `Type Verdict: outside-allowed-set` の実出力を確認。**通る実証**: persona 型で警告ゼロ
- fail-open: 照合層に故意の throw を注入し、emit が継続することを確認(注入は実行時に消費される行へ — `cid:code-generation:inject-runtime-consumed-lines`)

## BR-U1-8: TDD(NFR-2)

各 BR は失敗テスト先行(Red 実測)→ 最小実装(Green)の vertical slice で実装する。一括先行・実装後テストは TDD と認めない(`tdd-default-with-narrow-exceptions`)。
