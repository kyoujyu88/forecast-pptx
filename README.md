# 天気予報 PPTX 生成

指定した地点（1〜5地点）と期間（最大16日）の天気予報を表形式に並べた `.pptx` を
生成する Web アプリです。**サーバー不要・GitHub Pages で動作します。**

## デモ / 利用方法

GitHub Pages のデプロイ後は `https://<ユーザー名>.github.io/<リポジトリ名>/` にアクセスするだけで使えます。

ローカルで確認する場合は任意の静的ファイルサーバーで起動してください：

```bash
# Python 標準ライブラリで起動する例
python3 -m http.server 8000
# → http://localhost:8000 を開く
```

## 機能

- **地点検索**: 都市名で検索 → 候補一覧から選択して緯度経度を確定
- **最大5地点 × 最大16日**: 地点は1〜5件、開始日と終了日を指定（最大16日間）
- **localStorage 永続化**: 確定済み地点・期間をブラウザに保存し、次回アクセス時に復元
- **大型 SVG 天気アイコン**: 晴れ・曇り・雨・雪など11種のアイコンをセル内に大きく表示
- **スライドレイアウト (16:9)**:
  - 上 1/3: 予定欄（空枠。後から手入力で使う領域）
  - 下 2/3: 天気表（地点 × 日付の表。各セルにアイコン・降水確率・最高/最低気温）
  - 右下: データ出典クレジット（Open-Meteo CC BY 4.0）

## データソース

[Open-Meteo](https://open-meteo.com/)（APIキー不要・非商用無料）

- ジオコーディング: `https://geocoding-api.open-meteo.com/v1/search`（CORS 対応）
- 予報取得: `https://api.open-meteo.com/v1/forecast`（CORS 対応）
- ライセンス: CC BY 4.0。生成ファイルに「出典: Open-Meteo」クレジットを記載済み。
  商用公開する場合は Open-Meteo への問い合わせが必要。

## 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|------------|-----------|------|
| [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) | 3.12.0 | ブラウザ内 PPTX 生成 |
| Open-Meteo API | - | 天気予報データ |

CDN から読み込むため、インストール不要です。

## ファイル構成

```
forecast-pptx/
├── index.html       # UI（PptxGenJS を CDN から読み込み）
├── style.css        # スタイル
├── app.js           # 地点検索・PPTX 生成ロジック
├── icons/           # SVG 天気アイコン（11種）
│   ├── sunny.svg
│   ├── partly-cloudy.svg
│   ├── cloudy.svg
│   ├── fog.svg
│   ├── drizzle.svg
│   ├── rain.svg
│   ├── snow.svg
│   ├── showers.svg
│   ├── snow-showers.svg
│   ├── thunderstorm.svg
│   └── unknown.svg
├── .gitignore
├── README.md        # このファイル
└── CHANGELOG.md     # 更新履歴
```

## GitHub Pages へのデプロイ

1. リポジトリの **Settings → Pages** を開く
2. Source: **Deploy from a branch**
3. Branch: `main` / `/ (root)`
4. Save → しばらくするとページが公開される

## スライドのレイアウト詳細

- スライドサイズ: 13.33" × 7.5"（16:9 = LAYOUT_WIDE）
- 予定欄: 上部（高さ 2.1"）、枠線あり
- 天気表: 残り領域
  - 地点名列幅: 1.1" 固定
  - 日付列幅: 残り幅を日数で均等分割
  - 各セル: 大型 SVG アイコン（上 55%）+ 降水確率（青）+ 最高/最低気温（赤/青）
- 天気コード: WMO 標準コードを 11 種の SVG アイコンにマッピング

## 今後の改良ポイント

- 複数スライド生成（地点グループ別など）
- 週間予報サマリーの追加
- 配色テーマのカスタマイズ
