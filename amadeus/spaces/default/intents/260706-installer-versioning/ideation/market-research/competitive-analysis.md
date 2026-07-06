# Competitive Analysis — 260706-installer-versioning（Issue #543）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

パッケージマネージャの設定ファイル更新戦略（先行事例）を、本 Intent の設計論点への対応付きで整理する。

## 先行事例の比較

| 事例 | 改変検出の仕組み | 改変検出時の既定動作 | 非対話モード | 出典 |
|---|---|---|---|---|
| dpkg（Debian）conffile | 導入時の conffile の md5sum を dpkg DB に記録し、「前回配布時 / 新配布物 / 導入先現状」の 3-way 比較 | 対話プロンプト（Y/I = 新版導入、N/O = 現状維持、D = diff、Z = shell） | `--force-confold`（現状維持）/ `--force-confnew`（新版採用）/ `--force-confdef`（既定に従う）で非対話化可能 | [Debian Policy: Configuration file handling](https://www.debian.org/doc/debian-policy/ap-pkg-conffiles.html)、[dpkg(1)](https://man7.org/linux/man-pages/man1/dpkg.1.html) |
| rpm（RHEL 系）%config | rpm DB のファイルハッシュで 3-way 判定 | 無対話でどちらかを自動実施: 新版を `.rpmnew` として併置し既存維持（%config(noreplace)）、または既存を `.rpmsave` へ退避して新版導入（%config） | 既定が非対話（後始末は rpmconf 等の別ツール） | [Handling Updated RPM Package Configuration Files](https://eklitzke.org/handling-updated-rpm-package-configuration-files)、[rpmnew and rpmsave handling](https://kc.jetpatch.com/hc/en-us/articles/360043017992-rpmnew-and-rpmsave-handling) |
| pacman（Arch）backup | 同上（DB のハッシュ記録） | 改変ありなら新版を `.pacnew` として併置し既存維持（rpm の noreplace 型と同型） | 既定が非対話 | [Sandy Scott: Linux software updates](https://www.sandyscott.net/2021/04/linux-software-updates-how-to-resolve-changed-configuration-files/) |

## 3-way 判定の共通形（dpkg の判定表を一般化）

| 前回配布時 vs 新配布物 | 導入先の改変 | 動作（dpkg の場合） |
|---|---|---|
| 同一 | なし | 何もしない（すでに一致） |
| 同一 | あり | 現状維持（利用者の変更を尊重、プロンプトなし） |
| 変化 | なし | 新版で上書き（安全。プロンプトなし） |
| 変化 | あり | 衝突。対話（dpkg）または併置/退避（rpm / pacman） |
| — | 導入先で削除 | dpkg は「削除も利用者の選択」として尊重（再作成しない） |

重要な観察: **対話が発生するのは「双方が変化した」1 象限だけ**であり、他の 3 象限は全事例で無対話・決定論的である。

## 提案例 xxx_orig 退避の型対応

Issue の提案例（`xxx_orig.md` へ退避してから上書き）は **rpm の `.rpmsave` 型**（既存を退避して新版導入）に相当する。
対になる選択肢は **`.rpmnew` / `.pacnew` 型**（新版を併置して既存維持）で、こちらは「利用者の現状を壊さない」方向に倒れる。

## 設計論点への含意

1. **バージョン表現**: 全事例とも「導入時に記録した状態（ハッシュ DB）」が 3-way の基準。manifest ファイル（導入先に版 + ハッシュ表）は dpkg DB / rpm DB の単一ファイル版に相当し、先行事例と整合する。
2. **3-way 判定**: 上記共通形をそのまま採用できる。「導入先で削除」は dpkg 型（利用者の選択として尊重、ただし収束型インストーラの現挙動 = 再作成と衝突するため要協議）。
3. **改変時戦略**: 非対話 1 コマンド制約下では dpkg の対話型は採用不能。rpm noreplace / pacnew 型（併置 + 既存維持）と rpmsave 型（退避 + 新版導入）の二択が実質の候補。
