# セキュリティ設計 — U5 doctor-observability

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## 読み取り専用保証の層別

security-requirements「読み取り専用」の合否(実行前後 bytes 一致)を、一枚岩の断定ではなく 3 層で保証する:

1. **純関数層(ポート不保持)**: `buildDoctorPluginSection` は入力 3 引数の射影のみで、fs / process への参照を持たない(performance-requirements の純関数性合否と同一機構 — performance-design 参照。書込 API へ到達する経路が型上存在しない)
2. **handler 層(既存読み経路の再利用)**: doctor ハンドラ側の入力取得(diagnosePlugins 呼出・composition record 読取・U6 判定関数呼出)は全て read-only の既存経路で、U5 が新設する書込呼出は 0 件。U6 判定関数の呼出は「表示のみ」であり、U6 側の状態単方向設計(発火経路 read-only — U6 の BR-U6-6)がこの層の前提を支える
3. **検証層(bytes 比較)**: doctor 実行前後で record / host bytes / SpecHashState の bytes 一致を integration テストで assert(BR-U5-3)。層 1・2 の構造保証を実測で裏取りする

## 判定の非搬送(false green / false red の構造的排除)

security-requirements「判定の非搬送」のとおり、business-logic-model 分岐表は diagnosePlugins の実戻り値(composed | drift | recovery-pending)+DropsRecord+U6 判定からの **機械写像** であり、doctor 側の再判定・推測・閾値判断を禁止する。設計上は写像表(reliability-design の射影表)を唯一の分岐源とし、写像に現れない状態値は typed に「未知状態」行として loud に表示する(未知値を無音で読み飛ばす fail-open を作らない — fail-closed 縮退)。

- DropsRecord 不在時は drops 由来行を出さない(未書込と空 DropsRecord を同一の縮退挙動(BR-U5-7 verbatim 準拠)とし fail-open な行生成をしない — BR-U5-7。scalability-requirements の少数前提集合に対する縮退規則)

## silent drop の禁止(可視性の直接検証)

security-requirements「silent drop の禁止」合否を、テスト設計で直接固定する: DropsRecord fixture の各 entry について出力行の **出現自体** を文字列 assert し、[degraded] → doctor FAIL 寄与 / [advisory] → PASS(advisory) の両 severity 対照テストを置く(BR-U5-2 — reliability-requirements の両側実測と共有)。

## 認証情報の非保持(N/A 継承)

security-requirements「認証情報の非保持」のとおり資格情報を扱う経路がなく、秘匿情報設計は **N/A を継承** する。
