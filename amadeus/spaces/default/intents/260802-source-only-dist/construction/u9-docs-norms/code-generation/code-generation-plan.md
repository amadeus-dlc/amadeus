上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, frontend-components, logical-components, performance-design, reliability-design, scalability-design, security-design, requirements, unit-of-work, unit-of-work-story-map, bolt-plan

# Code Generation Plan — u9-docs-norms(Bolt 8)

requirements の FR-3.5 / FR-6、C9、u9 の FD/NFR に基づき、u8 で成立したsource-only境界を公開文書と恒久規範へ固定する。対象は現在形の配布契約を持つ文書と正本規範に限定し、履歴・research・CodeKB・Intent record内の旧状態引用は変更しない。

- [x] **Step 1: 現在形の旧契約を棚卸しする**
  - `dist` / `drift` / `promote` / `codeload` / `package.ts --check` をキーに、README、CONTRIBUTING、AGENTS、harness guide、release guide、Developer Reference、正本scope prose、project規範を走査する
  - 実装事実は `package.json`、`scripts/package.ts`、`scripts/source-only-boundary.ts`、`.github/workflows/{ci,release}.yml`、installerのasset/codeload境界と照合する
- [x] **Step 2: onboardingと公開配布契約を日英同期する(FR-3.5 / FR-6.1)**
  - README / README.ja と CONTRIBUTING に clone → `bun install --frozen-lockfile` → `bun run build` → harness起動を固定する
  - `dist/` を未追跡のローカル生成物、GitHub Release Assetを公開配布契約として記述する
- [x] **Step 3: harness・開発・release文書を新境界へ更新する(FR-6.1)**
  - 各harness guide、Harness Engineering、Developer Reference、publishing guide、用語集を更新する
  - `package.ts --check` / `dist:check` / `promote:self:check` を、隔離2回buildの再現性検査、`source-only:check`、graph不変量検査へ置換する
  - `.gitattributes` は未追跡生成面のlinguist指定を除き、追跡allowlistの可視性だけを表す
- [x] **Step 4: 規範衝突5点を同一Boltで解消する(FR-6.2)**
  - project.md の旧Forbidden/Mandatedをsource-only境界に合わせて改訂する
  - G3の受容論証をREADMEと規範へ固定する: ローカル `dist/` 編集はGitに乗らず、release assetはclean checkoutから生成されるため伝播経路がない。代替の手編集ガードは置かない
  - 移行時のuser-facing棚卸し規範は維持し、本Intentで実施済みのprovenanceを記録する
- [x] **Step 5: focused検証を行う**
  - glossary projection、docs legacy refs/language pair、source-only境界、差分whitespace、旧契約語彙の現在形文書での残存を確認する

## テスト方針

文書・規範専用Unitのため新規テストコードは追加しない。既存の文書契約テストとsource-only境界検査をfocused実行し、コマンド例・相対リンク・日英対・用語投影の整合を確認する。全体 `test:ci` は後続build-and-test stageの責務とする。

## トレーサビリティ

| 要件 | 実装 | 検証 |
|---|---|---|
| FR-3.5 | README / README.ja / CONTRIBUTING のfresh-clone手順 | 日英差分レビュー、旧command残存grep |
| FR-6.1 | 公開・harness・開発・release文書、`.gitattributes`、AGENTS | docs contract、legacy refs/language pair、リンク・command照合 |
| FR-6.2 / G3 | project.mdの恒久規範と伝播経路消滅の論証 | norm 5点照合、`source-only:check` |
| C9 / BR-U9-6 | 現在形文書の旧契約残存除去 | 対象面を限定した語彙grep |

## 設計からの精密化

FDはproject.md改訂4点を別norm PRで起草までとしたが、ユーザーはIntentを分割せず、親conductorから「u9 docsと5点のnorm変更を本Boltの単一PRへ含める」と明示された。この最新の人間裁定を優先し、文書・規範を同一Boltへ収束させる。PRの作成・mergeは引き続き人間承認境界を維持する。
