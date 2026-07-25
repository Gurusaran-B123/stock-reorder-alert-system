# 📦 Stock Reorder Alert System (Full Stack)

A single-repo full-stack web app to upload inventory CSV files and get instant
restock/overstock alerts.

- **Frontend:** HTML, CSS, JavaScript (served by Flask via `templates/` + `static/`)
- **Backend:** Python (Flask) — REST API (`POST /api/upload`)
- **Communication:** `multipart/form-data` POST request → JSON response

## 📁 Project Structure

```
stock-reorder-app/
├── app.py                  # Flask backend + API
├── requirements.txt
├── sample_stock.csv        # Example input file
├── templates/
│   └── index.html          # Frontend page
└── static/
    ├── css/style.css       # Styling
    └── js/script.js        # Upload logic, API calls, notifications
```

## 🚀 Setup & Run

```bash
# 1. Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the Flask app
python app.py
```

Then open **http://localhost:5000** in your browser.

## 📄 CSV Format

```csv
item_name,current_quantity,reorder_threshold
Wooden Chair,8,10
Steel Table,25,15
Door Handle,5,20
```

## 🔔 How It Works

1. User uploads a `.csv` file via the browser (drag-and-drop or file picker).
2. JS sends it to `POST /api/upload` as `multipart/form-data`.
3. Flask parses the CSV and classifies each item:
   - **Low Stock** → `current_quantity < reorder_threshold`
   - **High Stock** → `current_quantity >= 2 × reorder_threshold`
   - **Normal** → everything in between
4. Backend returns JSON with counts, percentages, and item lists.
5. Frontend renders:
   - A summary stats grid (Total / Low / Normal / High)
   - A detailed table of every item with its stock %
   - Auto-hiding notification popups (5s) for restock alerts and overstock alerts

## 🔌 API

### `POST /api/upload`
**Body:** `multipart/form-data` with field `file` (the CSV)

**Success response:**
```json
{
  "success": true,
  "data": {
    "total_items": 3,
    "low_stock_count": 2,
    "high_stock_count": 1,
    "normal_stock_count": 0,
    "low_stock": [ { "item_name": "Wooden Chair", "current_quantity": 8, "reorder_threshold": 10, "percentage": 80.0, "deficit": 2 } ],
    "high_stock": [ ... ],
    "normal_stock": [ ... ],
    "all_items": [ ... ]
  }
}
```

**Error response:**
```json
{ "error": "CSV must contain columns: item_name, current_quantity, reorder_threshold" }
```
