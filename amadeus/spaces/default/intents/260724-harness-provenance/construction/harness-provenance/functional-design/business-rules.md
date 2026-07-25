# Business Rules — harness-provenance

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## 適用範囲

unit-of-work.mdとunit-of-work-story-map.mdが単一Unitへ割り当てた全シナリオに適用する。requirements.mdのFR-1〜FR-4を規範とし、components.mdのDetector/Recorder責務、component-methods.mdの型・resolver契約、services.mdの同一プロセス同期境界を変更しない。

## 判定規則

### BR-1: type overrideの存在判定

`AMADEUS_HARNESS_TYPE`はtruthy判定ではなく、環境変数が`undefined`でないことを「明示設定」とみなす。空文字も明示された不正値である。

### BR-2: type overrideのparse

明示値は7値`HarnessType`との完全一致だけを受理する。trim、小文字化、別名変換は行わない。既知値はそのまま返し、未知値・空文字は`unknown`へ閉じる。

### BR-3: 明示設定は自動検出を遮断

type overrideが存在する場合、値の妥当性にかかわらず`CLAUDECODE`、dot-dir、fallbackを評価しない。誤設定を別の補助シグナルで隠さない。

### BR-4: Claude Code一次シグナル

type overrideが存在せず、`CLAUDECODE`が文字列`"1"`と完全一致するときだけ`claude-code`とする。その他の値は未成立である。

### BR-5: harness-dir envの既存契約

`AMADEUS_HARNESS_DIR`は既存`harnessDir()`と同じtruthy条件でresolverの最優先とする。空文字は未設定相当としてscript-path以降へ進む。この規則はBR-1のtype override存在判定とは意図的に異なる。

### BR-6: fallback provenance

resolverの`source`が`fallback`なら、`dir`が`.claude`でも必ず`unknown`とする。実検出された`.claude`だけがmappingを通じて`claude-code`となる。

### BR-7: canonical mapping

`HARNESS_DIR_TO_TYPE`の5 key/valueだけを既知対応とする。型上のsupported dir集合はmappingのkeyから導出する。`KNOWN_HARNESS_DIRS`はCWD probe順序であり、存在ハーネスのsource of truthではない。

### BR-8: open-set未知dir

script-pathまたはenvでdot-dir形式の未知値を解決しても例外を投げず`unknown`とする。新しいハーネスを既存種別へ推測で割り当てない。

## state記録規則

### BR-9: 新規birth時のexactly-one記録

新規intent stateの`## Project Information`にはHarness行をちょうど1件生成する。同一build中に判定を複数回呼んで異なる値を混在させない。

### BR-10: Harnessはoptional V7拡張

State Versionは7のままとし、`Harness`を`STATE_V7_FIELDS`の必須allowlistへ追加しない。既存stateにHarnessがなくてもvalidationを成功させる。

### BR-11: 既存field書式

行は既存scalar形式`- **Harness**: <value>`に従う。値は改行を含まない7値unionであり、独自parserや新しいschema表現を導入しない。

### BR-12: birth失敗条件を増やさない

検出不能・未知override・未知dot-dirを理由にintent birthを失敗させない。すべて`unknown`へ正規化して記録する。

## resolver互換規則

### BR-13: 公開API不変

`harnessDir(): string`の署名、文字列結果、call-time env優先を維持する。新しいresolution型はモジュール内部に閉じる。

### BR-14: cache単位

非envの解決結果はprocess内で1回だけ計算し、`dir`と`source`を一体でcacheする。env結果はcacheせず、各callで先に評価する。

### BR-15: 解決順序

解決順序はtruthyなharness-dir env、non-env cache、script-path、CWD probe、fallbackで固定する。CWD probe内の既存候補順も変更しない。

### BR-16: 通常birthのCWD非到達

全6配布形態の各ケースを、non-env cacheが空のfresh processで実行する。`AMADEUS_HARNESS_TYPE`、`CLAUDECODE`、`AMADEUS_HARNESS_DIR`を明示unsetし、配布元とは異なるtypeへ写像される競合CWD候補を置く。この条件で配布元typeとなることを、script-pathがCWD probeより前に確定した証拠とする。Claude配布には`.codex`を、他5配布には`.claude`を競合候補として使う。

## memory運用規則

### BR-17: 非構造的な補助記録

Harness値は、conductorが最初の実観測を記す通常diaryエントリ本文へ`Harness=<type>`として併記する。新規見出し、frontmatter、専用fieldを追加しない。

### BR-18: synthetic entry禁止

ハーネス情報だけを目的とするentryは生成しない。実観測がないfresh diaryは`total=0`を維持する。

### BR-19: 一次記録面

機械参照はstateのHarness fieldを使う。memoryは人間可読な補助証跡であり、構造化抽出の正確性を保証しない。

## テスト不変条件

- 全7 type override値が自己同一にparseされる
- 未知値・空文字は`unknown`となり、競合する自動シグナルへfall throughしない
- 5 mapping key/valueの欠落・余分・誤対応を検出する
- fallback `.claude`とscript-path `.claude`が異なるtype結果になる
- `AMADEUS_HARNESS_DIR`変更は既存cacheより優先される
- 全6配布形態をケースごとのfresh processで実行し、3 envを明示unsetした状態で異なるtypeの競合CWD候補に勝って配布元typeを返す
- 新規stateはHarnessを1件持ち、既存stateはHarnessなしでも有効
- `t100-memory-template-lifecycle`の4見出し・`total=0`がgreen
- dist/self-install再生成後も正本と同じ挙動を持つ

## ルール競合の扱い

上記規則と実装中の都合が衝突した場合、実装者が暗黙に緩和しない。requirements.mdまたは承認済みApplication Designへの変更として停止し、裁定を受ける。単一Unit内の実装順序は変更できるが、services.mdの`amadeus-utility.ts → amadeus-lib.ts`依存方向を逆転させてはならない。
