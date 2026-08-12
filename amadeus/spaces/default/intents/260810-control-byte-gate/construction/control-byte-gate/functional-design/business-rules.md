# Business Rules — control-byte-gate(Issue #2814)

上流入力(consumes 全数): requirements.md(FR → BR の1:1導出元)、unit-of-work.md(BR の適用範囲 = U1)、unit-of-work-story-map.md(BR-6 の UX 根拠)、components.md(BR の所有コンポーネント割付)、component-methods.md(BR を運ぶ署名)、services.md(BR-7 の exit 契約)

## ルール一覧

- **BR-1(列挙の fail-closed)**: `git ls-files -z` の spawn 失敗・非 0 exit は即 exit 1 + 原因メッセージ。部分列挙での続行禁止。[FR-CBG-2、NFR-3]
- **BR-2(検出集合)**: 違反バイト = `b < 0x20 かつ b ∉ {0x09, 0x0A, 0x0D}`、または `b == 0x7F`。[FR-CBG-3、ADR-3]
- **BR-3(生バイトのみ)**: 判定はバイト値のみに基づく — ソーステキスト上のエスケープ表記は判定対象の形をとらない(構造的成立)。[FR-CBG-4]
- **BR-4(allowlist)**: `BINARY_ALLOWLIST` の path 完全一致で走査 skip。エントリ path が列挙集合に不在なら staleAllowlist 行き(= exit 1)。エントリは `{path, reason}` で reason 必須(型強制)。[FR-CBG-5、ADR-2]
- **BR-5(読取の fail-closed)**: 読取失敗は readErrors 行き(= exit 1)。skip・無音続行の禁止(t55 型 fail-open の否定)。[NFR-3]
- **BR-6(診断書式)**: 違反 1 件 = `<path>: control byte 0x<HEX 大文字2桁> at offset <10進>` の 1 行。全件列挙・打ち切りなし。stale は `stale allowlist entry: <path>`、読取失敗は `read error: <path>: <message>`。正常時は `scanned <N> files, no control bytes found` の 1 行。[FR-CBG-6、NFR-2]
- **BR-7(exit 契約)**: violations・staleAllowlist・readErrors がすべて空 → exit 0。いずれか非空 → exit 1。その他の内部例外は未捕捉のまま非 0(Bun 既定)で loud。[FR-CBG-1]
- **BR-8(決定性)**: 時刻・env・ネットワークへの依存禁止。出力順は列挙順(git ls-files の決定的順序)。[NFR-1]
- **BR-9(依存)**: 実装は Bun 標準 API + git spawn のみ。外部 grep 系の呼び出し禁止。[FR-CBG-13、NFR-4]
- **BR-11(型の単一定義)**: `Violation`・`GateResult` は domain-entities.md の readonly 形を正本とし、実装では1定義を CLI/述語/テストが共有する(component-methods.md のインライン形は同一型への参照として実装する — 二重定義禁止)。
- **BR-10(canonical 参照)**: 述語定義部のコメントに `isUtf8`(amadeus-migrate.ts:477)と `CONTROL_CHARS`(amadeus-lib.ts:4298)への出典参照、および CR 除外の意図的相違(ADR-3)を記載。import はしない。[FR-CBG-11]

## 例外・エッジケース

- 空ファイル(0 bytes): 違反なし(green)。
- サブモジュール・シンボリックリンク: `readFileSync` は symlink を辿るため、tracked symlink では「git が追跡する blob(リンク先パス文字列)」でなく「デリファレンス先の内容」を走査しうる — 走査対象と tracked 内容の一致性は**実装時に実測して確定**する(injection-surface-verify と同処遇。現 tracked コーパスの symlink 有無も実装時に `git ls-files -s` の mode 120000 で棚卸しする)。デリファレンス失敗(dangling・directory 実体)は BR-5 で loud(無音 skip しない)。
- 巨大ファイル: 全バイト走査(部分読みしない)。timeout は CI step 側の 30s が上限(FR-CBG-14)。
