# CHANGELOG

このプロジェクトの変更履歴。[Semantic Versioning](https://semver.org/lang/ja/) に従う。

---

## [1.1.0] - 2026-06-24

### Added
- `.gitignore` を追加（`__pycache__/`, `*.pyc`, `*.pyo`, `.env`, `*.pptx` を除外）
- `README.md` を追加（セットアップ手順・ファイル構成・API仕様・改良ポイント）
- `CHANGELOG.md` を追加（本ファイル）

---

## [1.0.0] - 2026-06-24

### Added
- **`main.py`**: FastAPI アプリ本体
  - `GET /` → `static/index.html` を配信
  - `GET /api/geocode?name=` → Open-Meteo ジオコーディング API を呼んで候補リスト返却
  - `POST /api/generate` → 予報取得 → PPTX 生成 → StreamingResponse でダウンロード
- **`weather.py`**: Open-Meteo API クライアント
  - `geocode(name)`: 都市名から緯度経度候補を取得
  - `fetch_forecast(lat, lon, days)`: 日別予報（天気コード・最高最低気温・降水確率）を取得
- **`pptx_generator.py`**: python-pptx スライド生成
  - WMO 天気コード → 絵文字 + 日本語名マッピング（コード 0〜99 の主要コード対応）
  - 16:9 スライド（33.867 cm × 19.05 cm）
  - 上 1/3: 予定欄（空枠）
  - 下 2/3: 天気表（地点 × 日付。天気・降水確率・最高最低気温の3行表示）
  - 右下: `出典: Open-Meteo (CC BY 4.0)` クレジット
- **`requirements.txt`**: `fastapi`, `uvicorn[standard]`, `python-pptx`, `httpx`
- **`static/index.html`**: フロントエンド UI（地点検索・日数選択・生成ボタン）
- **`static/style.css`**: レスポンシブスタイル
- **`static/app.js`**: バニラ JS による状態管理
  - 地点検索 → ドロップダウン → 確定チップ表示
  - localStorage による地点・日数の保存と復元
  - PPTX 生成リクエスト → Blob ダウンロード

### 動作環境
- Python 3.11.15
- FastAPI 0.138.0 / uvicorn 0.49.0 / python-pptx 1.0.2 / httpx 0.28.1
