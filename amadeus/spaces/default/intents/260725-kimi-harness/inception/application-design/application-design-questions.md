# Application Design 質問 — 260725-kimi-harness

> モード: 質問なし(参照質問は全て既存実装から導出可能 — requirements-analysis:c5 準拠)。承認は本ステージのゲートで行う

## 参照質問の判定

### Component boundary decisions

**導出済み**。cursor/codex の構造がそのまま境界になる: manifest(宣言的80%) + authored surfaces + adapter(薄い shim) + lib(ロジック)。新規境界は setup のマージモジュールのみで、setup の ports/modules 構造(cli.ts → modules/ → ports/)に従う。

### Architectural style preferences

**導出済み**。09-porting の契約(manifest + adapter + 必要時 emit)が固定しており、選択肢は存在しない。

### Service communication patterns

**N/A**。ネットワークサービスを持たない CLI/ライブラリ変更。hook 呼出しはプロセス起動(bun 直実行)で、通信契約は stdin/stdout の JSON(Claude 型)に既存確定。

### Data ownership and storage strategy

**導出済み**。状態は全て `<record>/` と `amadeus/spaces/` に既存確定。新規の状態は managed block(ユーザー config 内マーカー囲み領域)のみで、ownership はユーザー、管理は setup のマージモジュール。

### Integration approach with existing components (brownfield)

**導出済み**。packager 自動検出(`scripts/package.ts:86-88`)に manifest を置くだけ。3閉集合(PACKAGE_HARNESSES / SELF_INSTALL_HARNESSES / swarm HARNESS_VALUES)と検出クラスタ(`amadeus-harness.ts`)への追加は RE で行番号確定済み。

### UI component structure

**N/A**。UI を持たない。

## 設計上の唯一の分岐とその導出(emit 要否)

kimi の SKILL.md frontmatter 寛容性が未確定なら codex 式 emit による frontmatter 制御が必要だったが、実測で解消: このセッション(Kimi)がロードした `.agents/skills/amadeus-application-design/SKILL.md` の frontmatter(`argument-hint: ""`・`user-invocable: true` 含む)は claude runner-gen 出力と**バイト同一**であり、Kimi は未知フィールドを寛容に扱う。よって `emit: null`・デフォルト runner-gen を採用(実測根拠: 両ファイル head 12 行の直接比較 2026-07-25)。
