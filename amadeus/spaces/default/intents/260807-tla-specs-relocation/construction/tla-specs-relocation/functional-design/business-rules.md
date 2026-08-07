# Business Rules — Unit tla-specs-relocation

上流: `inception/requirements-analysis/requirements.md`(FR-1〜FR-9)、`domain-entities.md`(E-1〜E-6)。各ルールは検証可能な形で記す。

## 解決・配置ルール

- **BR-1(単一経路)**: spec root の解決は E-1 SpecRootResolver の1実装に集約する。activation・sensor・loader・authoring・evidence の各消費者は独自のパス組立てを持たない(FR-2)。現行3系統の独立解決(`amadeus-plugin-activation.ts:100-102` / `amadeus-sensor-model-completeness.ts:37,247-250` / `tla-model-loader-internal.ts:134-153`)は本移設で置き換える
- **BR-2(active-space 連動)**: spec root は `amadeus/spaces/<activeSpace>/specs/` に解決する。space 切替(`/amadeus space <name>`)に追随し、単一チーム(default のみ)ではパス移設以外の挙動差を出さない(Q1=A)
- **BR-3(所有ルート宣言)**: watch 基底は所有ルート `amadeus/spaces/<activeSpace>/specs/` で明示宣言し、glob は `tla/**`(cid:code-generation:cg-watch-root-separation)。リポジトリルート基底の長い glob 形は採らない(Q3=A)

## 検出・互換ルール

- **BR-4(legacy fail-closed)**: `<workspaceRoot>/specs/tla/` に spec(`.tla` / `model-map.json`)を検出した場合、spec 解決は移設手順付きエラーで停止する。旧・新の両存も停止(FR-6、Q4=A)
- **BR-5(二重読み・シム禁止)**: 旧パスのフォールバック読み・シンボリックリンク併存・後方互換シムを設けない(Issue #2398 完了条件の既決。非採用案の踏襲禁止)
- **BR-6(検出の単一点)**: legacy 検出は E-1 の Resolver 内にのみ実装し、消費者側に検出ロジックを複製しない(要求されない二重実装の禁止)

## 不変性ルール

- **BR-7(意味論不変)**: TLA モデルの意味論・TLC 実行契約・verdict 語彙は変更しない。TLA ソースへの変更は自己参照コメント5行(MirrorLifecycle.cfg:2、MirrorLifecycle.tla:8、MirrorLifecycleAsImplemented.tla:17、MirrorLifecycleCore.tla:11,539)と model-map.json の path 値5箇所(:7,:11,:60,:64,:69)に限定する(NFR-1)
- **BR-8(identity 不変)**: model-map の `identity` はコンテンツ base の canonical ハッシュであり、パス移動で再計算しない。変わるのは `path` 値と validator の正準パス生成のみ(FR-5)
- **BR-9(歴史不変)**: `amadeus/spaces/*/intents/**`、`elections/**`、`memory/` learned エントリの旧パス文言は書き換えない。codekb は派生キャッシュとして手書換しない(Constraints)
- **BR-10(evidence watch 除外)**: evidence store root は watch glob の対象外を維持する(260804-tla-authoring ADR を新 root 基準で継承。FR-4)

## 配布・検証ルール

- **BR-11(鏡像の byte-identity)**: plugin 側 `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` は core 正本から `bun run build` で再生成する。手編集しない(guard: t-package-generated-plugin-sources)
- **BR-12(CI 非接触)**: `.github/workflows/ci.yml` は `specs/tla` リテラルを持たないため変更しない。CI 結合は runner(`ci-model-check-domain.ts:189` の bind mount src/dst)側の修正で追従する
- **BR-13(落ちる実証)**: 完了には3つの否定証拠を要する(FR-9) — (a) 旧パス配置 spec が検出されず BR-4 のエラーで停止すること、(b) 新パス配下の spec 変更で drift advisory が発火すること、(c) 旧パス値の model-map が validator に reject されること
- **BR-14(再現性)**: 配布面の検証は隔離2回ビルド再現性検査・`bun run source-only:check`・グラフ不変量検査を含める(project.md Mandated)。`dist/`・self-install 面の直接編集・コミットはしない
- **BR-15(テスト採番)**: 新規テストは t481 以降を採番する(observed 最大 t480、RE 実測)
