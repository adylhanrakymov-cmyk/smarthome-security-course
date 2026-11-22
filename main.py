from flask import Flask, jsonify, request, render_template
import sqlite3
from datetime import datetime

app = Flask(__name__)

DATABASE = "security.db"

security_armed = False
alarm_active = False

devices = {
    "1": {
        "id": 1,
        "name": "Датчик движения PIR",
        "type": "Движение",
        "ip": "192.168.1.101",
        "status": "Подключено",
        "state": "Нет движения"
    },
    "2": {
        "id": 2,
        "name": "Датчик входной двери",
        "type": "Открытие двери",
        "ip": "192.168.1.102",
        "status": "Подключено",
        "state": "Закрыта"
    },
    "3": {
        "id": 3,
        "name": "Датчик окна",
        "type": "Открытие окна",
        "ip": "192.168.1.103",
        "status": "Подключено",
        "state": "Закрыто"
    }
}


def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, device TEXT, event_type TEXT, description TEXT, timestamp TEXT, severity TEXT)")
    db.commit()
    db.close()


def save_event(device, event_type, description, severity):
    db = sqlite3.connect(DATABASE)
    timestamp = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    db.execute(
        "INSERT INTO events (device, event_type, description, timestamp, severity) VALUES (?, ?, ?, ?, ?)",
        (device, event_type, description, timestamp, severity)
    )
    db.commit()
    db.close()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/devices")
def get_devices():
    return jsonify(list(devices.values()))


@app.route("/api/status")
def get_status():
    return jsonify({
        "security_armed": security_armed,
        "alarm_active": alarm_active,
        "connected_devices": len(devices)
    })


@app.route("/api/security/arm", methods=["POST"])
def arm_security():
    global security_armed
    security_armed = True
    save_event("Система", "Охрана включена", "Охрана активирована", "Информация")
    return jsonify({"message": "Охрана включена"})


@app.route("/api/security/disarm", methods=["POST"])
def disarm_security():
    global security_armed, alarm_active
    security_armed = False
    alarm_active = False
    save_event("Система", "Охрана отключена", "Охрана деактивирована", "Информация")
    return jsonify({"message": "Охрана отключена"})


@app.route("/api/security/reset", methods=["POST"])
def reset_alarm():
    global alarm_active
    alarm_active = False
    return jsonify({"message": "Тревога сброшена"})


@app.route("/api/events", methods=["GET"])
def get_events():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    rows = db.execute("SELECT * FROM events ORDER BY id DESC").fetchall()
    db.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/events", methods=["POST"])
def receive_event():
    global alarm_active

    data = request.get_json(silent=True) or {}
    device = data.get("device")
    event_type = data.get("event_type")

    if not device or not event_type:
        return jsonify({"error": "Не указано устройство или событие"}), 400

    dangerous = event_type in ("motion", "door_open", "window_open")

    if dangerous and security_armed:
        alarm_active = True
        severity = "Критический"
        description = "Обнаружено нарушение безопасности!"
    else:
        severity = "Информация"
        description = "Получено событие от устройства"

    save_event(device, event_type, description, severity)

    return jsonify({
        "received": True,
        "alarm_active": alarm_active,
        "message": description
    })


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)