# 天気予報 PPTX 生成 Web アプリ

指定した地点（1〜5地点）と期間（最大16日）の天気予報を表形式に並べた `.pptx` を
生成する Web アプリです。ブラウザのフォームで地点と期間を指定し、生成ボタンで
PowerPoint ファイルをダウンロードできます。

## 機能

- **地点検索**: 都市名で検索 → 候補一覧から選択して緯度経度を確定
- **最大5地点 × 最大16日**: 地点は1〜5件、予報日数は 7 / 10 / 14 / 16 日から選択
- **localStorage 永続化**: 確定済み地点をブラウザに保存し、次回アクセス時に復元
- **スライドレイアウト (16:9)**:
  - 上 1/3: 予定欄（空枠。後から手入力で使う領域）
  - 下 2/3: 天気表（地点 × 日付の表。各セルに天気・降水確率・最高最低気温）
  - 右下: データ出典クレジット（Open-Meteo CC BY 4.0）

## データソース

[Open-Meteo](https://open-meteo.com/)（APIキー不要・非商用無料）

- ジオコーディング: `https://geocoding-api.open-meteo.com/v1/search`
- 予報取得: `https://api.open-meteo.com/v1/forecast`
- ライセンス: CC BY 4.0。生成ファイルに「出典: Open-Meteo」クレジットを記載。
  商用公開する場合は Open-Meteo への問い合わせが必要。

## 動作環境

| 項目 | バージョン |
|------|-----------|
| Python | 3.11 以上推奨 |
| FastAPI | 0.138.0 |
| uvicorn | 0.49.0 |
| python-pptx | 1.0.2 |
| httpx | 0.28.1 |

## セットアップ・起動

```bash
# 依存パッケージのインストール
pip install -r requirements.txt

# 開発サーバー起動（ホットリロードあり）
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

ブラウザで `http://localhost:8000` を開いてください。

## ファイル構成

```
forecast-pptx/
├── main.py              # FastAPI ルーティング・static 配信
├── weather.py           # Open-Meteo API クライアント（ジオコーディング・予報取得）
├── pptx_generator.py    # python-pptx スライド生成（WMO 天気コードマッピング含む）
├── requirements.txt     # Python 依存パッケージ
├── .gitignore
├── README.md            # このファイル
├── CHANGELOG.md         # 更新履歴
└── static/
    ├── index.html       # フロントエンド（単一ページ）
    ├── style.css        # スタイル
    └── app.js           # 地点検索・localStorage 保存・ダウンロード処理
```

## API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/` | フロントエンド（index.html）を返す |
| GET | `/api/geocode?name={query}` | 都市名から候補リストを返す |
| POST | `/api/generate` | 予報取得 → PPTX 生成 → ダウンロード |

### POST `/api/generate` リクエスト例

```json
{
  "locations": [
    {"name": "東京", "lat": 35.6895, "lon": 139.6917},
    {"name": "大阪", "lat": 34.6937, "lon": 135.5023}
  ],
  "days": 14
}
```

## スライドのレイアウト詳細

- スライドサイズ: 33.867 cm × 19.05 cm（16:9）
- 予定欄: 上 1/3（0.3 cm〜6.15 cm）
- 天気表: 下 2/3（6.4 cm〜18.4 cm）
  - 地点名列幅: 3.0 cm 固定
  - 日付列幅: 残り幅を日数で均等分割
- 天気コード: WMO 標準コードを日本語名 + 絵文字にマッピング

## 今後の改良ポイント

- 天気アイコンを絵文字から画像（PNG）に差し替え（`pptx_generator.py` の `_wmo()` を修正）
- 複数スライド生成（地点グループ別など）
- 週間予報サマリーの追加
- 配色テーマのカスタマイズ
