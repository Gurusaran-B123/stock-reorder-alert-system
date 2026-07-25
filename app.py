"""
Stock Reorder Alert System - Flask Backend
Single-repo structure: Flask serves both the API and the frontend (templates/static).
"""

import csv
import io
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Threshold multiplier above which stock is considered "overstocked" / high stock
HIGH_STOCK_MULTIPLIER = 2.0


def parse_and_analyze_csv(file_stream):
    """
    Reads CSV data with columns: item_name, current_quantity, reorder_threshold
    Returns a dict with categorized items and summary stats.
    """
    text_stream = io.StringIO(file_stream.read().decode("utf-8"))
    reader = csv.DictReader(text_stream)

    required_cols = {"item_name", "current_quantity", "reorder_threshold"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        raise ValueError(
            f"CSV must contain columns: {', '.join(required_cols)}. "
            f"Found: {', '.join(reader.fieldnames or [])}"
        )

    low_stock = []
    high_stock = []
    normal_stock = []
    all_items = []

    for row_num, row in enumerate(reader, start=2):  # start=2 (header is row 1)
        name = (row.get("item_name") or "").strip()
        if not name:
            continue

        try:
            current_qty = float(row.get("current_quantity", "").strip())
            threshold = float(row.get("reorder_threshold", "").strip())
        except (ValueError, AttributeError):
            raise ValueError(f"Invalid numeric value in row {row_num} for item '{name}'")

        if threshold < 0 or current_qty < 0:
            raise ValueError(f"Negative values not allowed in row {row_num} for item '{name}'")

        # Percentage of current stock relative to threshold
        if threshold > 0:
            percentage = round((current_qty / threshold) * 100, 1)
        else:
            percentage = 100.0 if current_qty > 0 else 0.0

        # Deficit / surplus needed
        deficit = round(threshold - current_qty, 2)

        item_data = {
            "item_name": name,
            "current_quantity": current_qty,
            "reorder_threshold": threshold,
            "percentage": percentage,
            "deficit": max(deficit, 0),
        }

        all_items.append(item_data)

        if current_qty < threshold:
            low_stock.append(item_data)
        elif threshold > 0 and current_qty >= threshold * HIGH_STOCK_MULTIPLIER:
            high_stock.append(item_data)
        else:
            normal_stock.append(item_data)

    if not all_items:
        raise ValueError("CSV is empty or contains no valid rows.")

    return {
        "total_items": len(all_items),
        "low_stock": low_stock,
        "high_stock": high_stock,
        "normal_stock": normal_stock,
        "low_stock_count": len(low_stock),
        "high_stock_count": len(high_stock),
        "normal_stock_count": len(normal_stock),
        "all_items": all_items,
    }


@app.route("/")
def index():
    """Serve the frontend."""
    return render_template("index.html")


@app.route("/api/upload", methods=["POST"])
def upload_csv():
    """
    Accepts a CSV file upload, analyzes stock levels,
    and returns items needing restock (and overstocked items).
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part in request."}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only .csv files are supported."}), 400

    try:
        result = parse_and_analyze_csv(file)
        return jsonify({"success": True, "data": result}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to process file: {str(e)}"}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Stock Reorder Alert System API running."})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
