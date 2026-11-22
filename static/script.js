// ==========================================
// SMART HOME SECURITY
// Основной JavaScript системы
// ==========================================


// ЗАГРУЗКА СОСТОЯНИЯ СИСТЕМЫ

async function loadStatus() {
    try {
        const response = await fetch("/api/status");
        const data = await response.json();

        document.getElementById("security-status").textContent =
            data.security_armed ? "Включена" : "Отключена";

        document.getElementById("device-count").textContent =
            data.connected_devices;

        document.getElementById("alarm-status").textContent =
            data.alarm_active ? "ТРЕВОГА!" : "Нет";

    } catch (error) {
        console.error("Ошибка загрузки состояния:", error);
    }
}


// ЗАГРУЗКА СПИСКА УСТРОЙСТВ

async function loadDevices() {
    try {
        const response = await fetch("/api/devices");
        const devices = await response.json();

        const container = document.getElementById("devices-list");

        container.innerHTML = devices.map(device => `
            <div class="device-card">
                <h3>${device.name}</h3>
                <p>Тип: ${device.type}</p>
                <p>IP-адрес: ${device.ip}</p>
                <p>Подключение: ${device.status}</p>
                <p>Состояние: ${device.state}</p>
            </div>
        `).join("");

    } catch (error) {
        console.error("Ошибка загрузки устройств:", error);
    }
}


// ЗАГРУЗКА ЖУРНАЛА СОБЫТИЙ

async function loadEvents() {
    try {
        const response = await fetch("/api/events");
        const events = await response.json();

        const container = document.getElementById("events-list");

        if (events.length === 0) {
            container.innerHTML = "<p>Событий пока нет.</p>";
            return;
        }

        const eventNames = {
            motion: "Обнаружено движение",
            door_open: "Открыта входная дверь",
            window_open: "Открыто окно",
            malfunction: "Неисправность устройства"
        };

        container.innerHTML = events.map(event => `
            <div class="event-item">
                <strong>${event.device}</strong>
                <p>${eventNames[event.event_type] || event.event_type}</p>
                <p>${event.description}</p>
                <small>${event.timestamp}</small>
                <span>${event.severity}</span>
            </div>
        `).join("");

    } catch (error) {
        console.error("Ошибка загрузки журнала:", error);
    }
}


// ВКЛЮЧЕНИЕ ОХРАНЫ

async function armSecurity() {
    try {
        const response = await fetch("/api/security/arm", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Не удалось включить охрану");
        }

        await refreshSystem();

    } catch (error) {
        alert("Ошибка: " + error.message);
    }
}


// ОТКЛЮЧЕНИЕ ОХРАНЫ

async function disarmSecurity() {
    try {
        const response = await fetch("/api/security/disarm", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Не удалось отключить охрану");
        }

        await refreshSystem();

    } catch (error) {
        alert("Ошибка: " + error.message);
    }
}


// СИМУЛЯЦИЯ СОБЫТИЙ ОТ ДАТЧИКОВ

async function simulateSensor(eventType) {

    const devices = {
        motion: "Датчик движения PIR",
        door_open: "Датчик входной двери",
        window_open: "Датчик окна"
    };

    const message = document.getElementById("simulation-message");

    message.textContent = "Отправка сигнала датчика...";

    try {
        const response = await fetch("/api/events", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                device: devices[eventType],
                event_type: eventType
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Ошибка обработки события");
        }

        message.textContent = result.message;

        await refreshSystem();

    } catch (error) {
        message.textContent = "Не удалось отправить сигнал";
        console.error("Ошибка симуляции:", error);
    }
}


// ОБНОВЛЕНИЕ ВСЕЙ СИСТЕМЫ

async function refreshSystem() {
    await loadStatus();
    await loadDevices();
    await loadEvents();
}


// АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ КАЖДЫЕ 5 СЕКУНД

document.addEventListener("DOMContentLoaded", () => {
    refreshSystem();
    setInterval(refreshSystem, 5000);
});