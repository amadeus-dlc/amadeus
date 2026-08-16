# 実装ノート — U-3 docs-sensors-sync(#3028 / FR-3)

測定 ref: worktree `bolt-docs-sensors`(origin/main 0901182c7 断面)。conductor 直接実装(builder 委譲はセッション上限のため不使用)。

## 変更

- `docs/harness-engineering/06-sensors.md` / `.ja.md` — 欠落4行(`amadeus-nfr-budget` / `amadeus-question-budget` / `amadeus-scope-sizing` / `amadeus-git-drift`)を追加、各 10→**14 行**。`amadeus-model-completeness` 行は U-2(#3086)着地により実際に投影・出荷されるため保持し、プラグイン由来注記(Declared by the opt-in formal-model-check plugin)を追記(幽霊状態は解消済み)
- 新設 `tests/integration/t3028-sensors-docs-sync.integration.test.ts`(実 filesystem 走査のため integration tier / size: medium。§12a 指摘による移設 — size purity ゲート適合(integration tier / size: medium)) — 件数フリー契約: 導出コーパス(core sensors dir ∪ 全 plugin.json の sensors 宣言)と両言語の表の行集合の一致を検査(FR-3 (3) / D-3 (b))。en/ja 同数は「両方が同一集合と一致」で担保

## 実測

- TDD Red→Green: 新テストは現行 docs(10 行)で **2 fail** → 表同期後 **3 pass / 0 fail**
- 落ちる実証: en 表から `amadeus-git-drift` 行を1行除去 → **1 fail**(en テストのみ赤)→ 復元 → 3 pass。残渣: `grep -c '^| \`amadeus-'` = en/ja とも **14**
- coverage registry: `bun tests/gen-coverage-registry.ts` 実行 → 追跡差分 **0 件**(`git status` に registry 変更なし — 本テストは registry universe の対象外)、`--check` → OK exit 0/ typecheck exit 0 / lint エラー 0(警告 464 は既存ベースライン)

## 受け入れ照合(FR-3)

- (1) 表の行数: FR-2 裁定=宣言追加 → **14 行**(`grep -c` 実測、en/ja とも)
- (2) en/ja 同一変更・同数: 本コミットで同時更新、テストが集合一致を恒常検査
- (3) drift 検査: 追加済み(落ちる実証済み)。AC3 の判定=「検査を追加する」(D-3、梯子 auto-decision-d6e7700a)
