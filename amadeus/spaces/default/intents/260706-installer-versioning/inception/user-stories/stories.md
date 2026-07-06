# Stories — 260706-installer-versioning（Issue #543）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[personas.md](personas.md)、[component-inventory.md](../../../../codekb/amadeus/component-inventory.md)

| ID | ストーリー | 対応 FR | 受け入れの観測点 |
|---|---|---|---|
| US-1 | P-1 として、導入・更新後にどの版（配布元 commit・導入時刻）が入っているかを 1 コマンドで確認したい。サポートを受けるときに再現条件を伝えられるように | FR-1、FR-3 | `--version-info --target <ws>` が 1 行で commit / 時刻 / 追跡数を返す。manifest 不在なら fix: ヒント。更新実行の起動時、manifest 存在時は `previous install found (commit <c>, <installedAt>)` を 1 行告知する（FR-3.3） |
| US-2 | P-1 として、カスタマイズしたファイルがあっても更新で無言に消されたくない。退避場所が出力から直接分かってほしい | FR-2.1〜2.3 | 改変ファイルは退避 → 上書きされ、ステップ行 detail に件数、summary に退避 path が列挙される |
| US-3 | P-1 として、何もカスタマイズしていなければ、更新は従来どおりの出力・結果であってほしい（新機能のノイズを受けない） | FR-2.1(a)(d)、FR-4.1 | 未改変時は退避行・restored 行なしで従来出力と同一。再実行は冪等 |
| US-4 | P-1 として、旧版（manifest 以前）からの更新でも、差分のあるファイルは消える前に退避されてほしい | FR-2.4 | bootstrap で不一致ファイルが退避されてから上書きされる |
| US-5 | P-1 として、更新で配布物から廃止されたファイルに自分の変更があった場合も、無言で消えないでほしい | FR-2.6 | 廃止 + 改変のファイルが退避される（未改変なら従来どおり消える） |
| US-6 | P-2 として、更新戦略と既知の限界（独自 amadeus* skill の扱い）が README（英日）で説明されていてほしい。導入者への案内に使えるように | FR-6.1 | README 両言語に更新戦略節 + BR-13 注意書き |
| US-7 | P-2 として、上記の全挙動が eval で退行検知されてほしい | FR-5 | installer eval に (a)〜(h) の検査が追加され test:all で常時実行される |

## ストーリー外（既存挙動の維持であり新ストーリーにしない）

- 非対話 1 コマンド・冪等・オフライン・amadeus/ 不可侵（C-1〜C-4）は #451 で確立済みの体験の維持であり、US-3 の観測点に含めて扱う。
