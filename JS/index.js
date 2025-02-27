import { sensors } from './sensorsSpec.js';

// Элементы DOM для работы с интерфейсом (ЛР2: пользовательский интерфейс)
const sensorsContainer = document.querySelector('.sensorsValues'); // Контейнер для значений датчиков
const notifications = document.getElementById('notifications'); // Элемент для уведомлений
const logList = document.getElementById('logList'); // Список логов
const currentReadingsList = document.getElementById('currentReadingsList'); // Список текущих показаний
const historyTableBody = document.querySelector('#historyTable tbody'); // Тело таблицы истории
const historyFilter = document.getElementById('historyFilter'); // Фильтр истории
const startBtn = document.getElementById('startBtn'); // Кнопка запуска (ЛР2, ЛР6)
const stopBtn = document.getElementById('stopBtn'); // Кнопка остановки (ЛР2, ЛР6)
const overloadBtn = document.getElementById('overloadBtn'); // Кнопка перегрузки (ЛР4)
const disconnectBtn = document.getElementById('disconnectBtn'); // Кнопка разрыва соединения (ЛР6)
const connectionIndicator = document.getElementById('connectionIndicator'); // Индикатор состояния соединения (ЛР6)
const reconnectBtn = document.getElementById('reconnectBtn'); // Кнопка восстановления соединения (ЛР6)
const trendRange = document.getElementById('trendRange'); // Поле для выбора диапазона времени (ЛР5)
const showTrendBtn = document.getElementById('showTrend'); // Кнопка показа тренда (ЛР5)

const systemStates = {}; // Состояния систем (для отслеживания активности)
let sensorHistory = {}; // История данных датчиков (ЛР1, ЛР5)
let currentSystemId = null; // Текущая выбранная система
let currentSensorType = null; // Текущий выбранный тип датчика
let currentChart = null; // Текущий график (ЛР5)
let isOverloadMode = false; // Режим перегрузки (ЛР4)
let isConnected = true; // Состояние соединения (ЛР6)
let buffer = []; // Буфер для данных при разрыве связи (пакеты, ЛР6)
const BUFFER_MAX_PACKETS = 10; // Максимальное количество пакетов в буфере (ЛР6)
const BUFFER_MAX_TIME = 15000; // Максимальное время буферизации (15 секунд, ЛР6)
let bufferTimeout = null;
let isManualDisconnect = false; // Флаг ручного разрыва соединения (ЛР6)

const wellStates = { // Состояния скважин
    well1: false,
    well2: false,
    well3: false
};

// Типы сигналов для датчиков (ЛР3)
const signalTypes = {
    pressure: 'analog', // Аналоговый сигнал
    temperature: 'analog', // Аналоговый сигнал
    flooding: 'analog', // Аналоговый сигнал
    fc: 'analog', // Аналоговый сигнал
    pressureIn: 'analog', // Аналоговый сигнал
    pressureOut: 'analog', // Аналоговый сигнал
    tempPumpBearings: 'analog', // Аналоговый сигнал
    tempEngineBearings: 'analog', // Аналоговый сигнал
    saltsLeaks: 'analog', // Аналоговый сигнал
    oilConsumption: 'analog' // Аналоговый сигнал
};

// Частота опроса для систем (в миллисекундах, ЛР3)
const pollingIntervals = {
    well1: 1000,
    well2: 1000,
    well3: 1000,
    upn: 2000,
    dns: 2000,
    pipeline: 1500,
    gasDaistor: 1500
};

// Функция для добавления сообщений в лог (ЛР2)
function addLog(message) {
    console.log(message);
    if (logList) {
        const li = document.createElement('li');
        li.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        logList.appendChild(li);
        logList.scrollTop = logList.scrollHeight;
    }
}

// Асинхронная функция для сохранения данных в базу данных через API (ЛР1, ЛР3, ЛР6)
async function saveToDB(systemId, sensorType, value) {
    if (!isConnected) {
        buffer.push({ systemId, sensorType, value, timestamp: new Date() });
        if (buffer.length >= BUFFER_MAX_PACKETS) {
            buffer = thinBuffer(buffer); // Прореживание буфера (ЛР6)
            increasePacketInterval(); // Удвоение интервала формирования пакетов (ЛР6)
        } else if (!bufferTimeout) {
            bufferTimeout = setTimeout(clearBuffer, BUFFER_MAX_TIME);
        }
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/sensors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ system_id: systemId, sensor_type: sensorType, value, signal_type: signalTypes[sensorType], polling_interval: pollingIntervals[systemId] })
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    } catch (err) {
        isConnected = false;
        updateConnectionIndicator('Разорвано (ошибка)');
        addLog(`Соединение прервано: ${err.message}`);
        buffer.push({ systemId, sensorType, value, timestamp: new Date() });
        if (!bufferTimeout) {
            bufferTimeout = setTimeout(clearBuffer, BUFFER_MAX_TIME);
        }
    }
}

// Асинхронная функция для загрузки данных из базы данных через API (ЛР1, ЛР5)
async function loadFromDB(filterSystemId = '', startDate = null, endDate = null) {
    if (!historyTableBody) {
        addLog('Ошибка: #historyTable tbody не найден');
        return;
    }
    try {
        let url = 'http://localhost:3000/sensors';
        const params = new URLSearchParams();
        if (filterSystemId) params.append('system_id', filterSystemId);
        if (startDate && endDate) {
            params.append('start_date', startDate);
            params.append('end_date', endDate);
        }
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        sensorHistory = {};
        data.forEach(row => {
            if (!sensorHistory[row.system_id]) sensorHistory[row.system_id] = {};
            if (!sensorHistory[row.system_id][row.sensor_type]) sensorHistory[row.system_id][row.sensor_type] = [];
            sensorHistory[row.system_id][row.sensor_type].push({
                time: new Date(row.timestamp).toLocaleTimeString(),
                value: row.value,
                signal_type: row.signal_type,
                polling_interval: row.polling_interval
            });
        });
        historyTableBody.innerHTML = '';
        Object.entries(sensorHistory).forEach(([systemId, sensors]) => {
            if (filterSystemId && systemId !== filterSystemId) return;
            Object.entries(sensors).forEach(([sensorType, values]) => {
                values.forEach(entry => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${systemId}</td><td>${getSensorName(sensorType)}</td><td>${entry.value}</td><td>${entry.time}</td><td>${entry.signal_type}</td><td>${entry.polling_interval}ms</td>`;
                    historyTableBody.appendChild(row);
                });
            });
        });
        addLog('Данные загружены из БД');
        flushBuffer();
        updateChart(); // Обновить график после загрузки данных (ЛР5)
    } catch (err) {
        addLog(`Ошибка загрузки из БД: ${err.message}`);
    }
}

// Обработчики событий для кликов по системам (ЛР2)
document.querySelectorAll('.system').forEach(system => {
    system.addEventListener('click', (e) => {
        if (e.target.classList.contains('wellOnOff')) return;
        currentSystemId = e.currentTarget.id;
        addLog(`Выбрана система: ${currentSystemId}`);
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        currentSensorType = null;
        getSensorsValues(currentSystemId, sensors);
        updateCurrentReadings();
    });
});

// Обработчики событий для кнопок включения/выключения систем (ЛР2)
document.querySelectorAll('.wellOnOff').forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const systemId = e.target.parentElement.id;
        const isActive = e.target.classList.toggle('wellOnOffActive');
        if (['well1', 'well2', 'well3'].includes(systemId)) {
            wellStates[systemId] = isActive;
        }
        if (isActive) {
            startGenVal(systemId);
            e.target.textContent = 'Выкл';
        } else {
            stopGenVal(systemId);
            e.target.textContent = 'Вкл';
        }
    });
});

// Обработчики событий для кнопок управления (ЛР2, ЛР6)
startBtn.addEventListener('click', () => {
    startAllSystems();
    addLog('Все системы запущены');
});

stopBtn.addEventListener('click', () => {
    stopAllSystems();
    addLog('Все системы остановлены');
});

overloadBtn.addEventListener('click', () => {
    isOverloadMode = !isOverloadMode;
    overloadBtn.textContent = isOverloadMode ? 'Остановить перегрузку' : 'Им. перег.';
    addLog(`Режим перегрузки: ${isOverloadMode}`);
});

disconnectBtn.addEventListener('click', () => {
    if (isConnected) {
        isConnected = false;
        isManualDisconnect = true;
        updateConnectionIndicator('Разорвано (ручное)');
        addLog('Соединение разорвано вручную');
        reconnectBtn.style.display = 'inline-block';
    }
});

reconnectBtn.addEventListener('click', () => {
    isConnected = true;
    isManualDisconnect = false;
    updateConnectionIndicator('Подключено');
    addLog('Соединение восстановлено');
    reconnectBtn.style.display = 'none';
    flushBuffer();
});

// Обработчик для показа тренда по выбранной дате (ЛР5)
showTrendBtn.addEventListener('click', () => {
    const startDate = trendRange.value;
    if (startDate) {
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 24); // Диапазон на 24 часа
        loadFromDB(historyFilter.value, startDate, endDate.toISOString().split('T')[0]);
    }
});

// Инициализация при загрузке страницы (ЛР2)
document.addEventListener('DOMContentLoaded', () => {
    if (!sensorsContainer || !historyFilter || !logList) {
        console.error('Один или несколько критических элементов DOM отсутствуют');
        return;
    }
    loadFromDB();
    sensorsContainer.addEventListener('click', (e) => {
        const sensorElement = e.target.closest('.sensor');
        if (sensorElement && currentSystemId) {
            currentSensorType = getSensorTypeFromElement(sensorElement);
            addLog(`Выбран датчик: ${currentSensorType}`);
            updateChart();
        }
    });
    setInterval(() => loadFromDB(historyFilter.value), 2000); // Периодическая загрузка данных (ЛР5)
    historyFilter.addEventListener('change', () => loadFromDB(historyFilter.value));
});

// Функция для отображения значений датчиков выбранной системы (ЛР2, ЛР3)
function getSensorsValues(systemId, sensors) {
    if (!sensorsContainer) return;
    addLog(`Отображение датчиков для ${systemId}`);
    sensorsContainer.innerHTML = '';
    let sensorData;
    switch (systemId) {
        case 'well1':
        case 'well2':
        case 'well3':
            sensorData = sensors.well;
            createWellSensor(sensorData);
            break;
        case 'upn':
            sensorData = sensors.upn;
            createWellSensor(sensorData);
            break;
        case 'dns':
            sensorData = sensors.dns;
            createWellSensor(sensorData);
            break;
        case 'pipeline':
            sensorData = sensors.pipeline;
            createWellSensor(sensorData);
            break;
        case 'gasDaistor':
            sensorData = sensors.gasDaistor;
            createWellSensor(sensorData);
            break;
        default:
            sensorsContainer.innerHTML = '<li>Система не найдена</li>';
    }
}

// Функция для создания элементов датчиков (ЛР2)
function createWellSensor(sensorData) {
    if (!sensorsContainer || !sensorData) return;
    for (const [sensorType, sensorConfig] of Object.entries(sensorData)) {
        const sensorItem = document.createElement('li');
        sensorItem.classList.add('sensor');
        sensorItem.innerHTML = `
            <p style="font-weight:bold">${getSensorName(sensorType)}</p>
            <div class="value">-- ${getUnit(sensorType)}</div>
            <div class="limits">
                <div class="min">min<div class="valueMin">${sensorConfig.normal.min}</div></div>
                <div class="max">max<div class="valueMax">${sensorConfig.normal.max}</div></div>
                <div class="avg">avg<div class="valueAvg">--</div></div>
                <div class="warning">warn<div class="valueWarn">${sensorConfig.warning?.min || '--'}</div></div>
                <div class="critical">crit<div class="valueCrit">${sensorConfig.critical?.min || '--'}</div></div>
            </div>
        `;
        sensorsContainer.appendChild(sensorItem);
    }
}

// Функция для получения единицы измерения датчика по его типу (ЛР3)
function getUnit(sensorType) {
    const units = {
        pressure: 'Бар', temperature: '°C', flooding: '%', fc: 'м³/ч', pressureIn: 'Бар',
        pressureOut: 'Бар', tempPumpBearings: '°C', tempEngineBearings: '°C', saltsLeaks: 'мл/мин',
        oilConsumption: 'м³/ч'
    };
    return units[sensorType] || '';
}

// Функция для получения названия датчика по его типу (ЛР3)
function getSensorName(sensorType) {
    const names = {
        pressure: 'Давление', temperature: 'Температура', flooding: 'Обводненность', fc: 'Расход жидкости',
        pressureIn: 'Давление на входе', pressureOut: 'Давление на выходе', tempPumpBearings: 'Температура подшипников насоса',
        tempEngineBearings: 'Температура подшипников двигателя', saltsLeaks: 'Утечки сальников',
        oilConsumption: 'Расход газа'
    };
    return names[sensorType] || sensorType;
}

// Функция для начала генерации данных для системы (ЛР3)
function startGenVal(systemId) {
    if (!systemStates[systemId]) systemStates[systemId] = {};
    const interval = pollingIntervals[systemId] || 1000;
    systemStates[systemId].interval = setInterval(() => updateSensors(systemId), interval);
    addLog(`Генерация запущена для ${systemId} с интервалом ${interval}ms`);
}

// Функция для остановки генерации данных для системы (ЛР3)
function stopGenVal(systemId) {
    if (systemStates[systemId]?.interval) {
        clearInterval(systemStates[systemId].interval);
        delete systemStates[systemId].interval;
        resetSensors(systemId);
        addLog(`Генерация остановлена для ${systemId}`);
    }
}

// Функция для запуска генерации данных для всех систем (ЛР2, ЛР6)
function startAllSystems() {
    Object.keys(systemStates).forEach(systemId => {
        startGenVal(systemId);
    });
}

// Функция для остановки генерации данных для всех систем (ЛР2, ЛР6)
function stopAllSystems() {
    Object.keys(systemStates).forEach(systemId => {
        if (systemStates[systemId]?.interval) {
            clearInterval(systemStates[systemId].interval);
            delete systemStates[systemId].interval;
            const button = document.querySelector(`#${systemId} .wellOnOff`);
            if (button) {
                button.classList.remove('wellOnOffActive');
                button.textContent = 'Вкл';
            }
            resetSensors(systemId);
        }
    });
    addLog('Все системы остановлены');
}

// Функция для обновления текущих показаний (ЛР2)
function updateCurrentReadings() {
    if (!currentReadingsList) return;
    currentReadingsList.innerHTML = '';
    if (!currentSystemId || !sensorHistory[currentSystemId]) return;
    Object.entries(sensorHistory[currentSystemId]).forEach(([sensorType, values]) => {
        const lastValue = values[values.length - 1];
        const li = document.createElement('li');
        li.textContent = `${getSensorName(sensorType)}: ${lastValue.value} ${getUnit(sensorType)} (время: ${lastValue.time})`;
        currentReadingsList.appendChild(li);
    });
}

// Функция для обновления значений датчиков системы (ЛР3, ЛР4)
function updateSensors(systemId) {
    if (systemId === currentSystemId) getSensorsValues(systemId, sensors);
    const sensorElements = sensorsContainer?.querySelectorAll('.sensor') || [];
    const systemElement = document.getElementById(systemId);
    if (!sensorHistory[systemId]) sensorHistory[systemId] = {};
    let systemStatus = 'normal';

    sensorElements.forEach(sensor => {
        const sensorType = getSensorTypeFromElement(sensor);
        const valueField = sensor.querySelector('.value');
        let newValue;

        newValue = generateRandomValue(systemId, sensorType);
        const sensorData = getSensorData(systemId);
        const config = sensorData[sensorType] || { normal: { min: 0, max: 100 } };
        newValue = Math.max(config.normal.min, Math.min(newValue, config.normal.max)); // Убедимся, что значение в пределах норм
        if (isOverloadMode) {
            const ranges = [
                config.warning || { min: Math.floor(config.normal.max + 1), max: Math.floor(config.normal.max + 20) }, // Целые числа
                config.critical || { min: Math.floor(config.warning?.max + 1 || config.normal.max + 21) }
            ];
            const range = ranges[Math.floor(Math.random() * ranges.length)];
            const max = Math.floor(range.max || range.min + 20);
            newValue = Math.floor(Math.random() * (max - range.min + 1)) + range.min; // Целые числа в режиме перегрузки
        }

        valueField.textContent = `${newValue} ${getUnit(sensorType)}`;
        saveToDB(systemId, sensorType, newValue); // Сохранение в БД (ЛР1, ЛР3)

        const status = checkSensorStatus(systemId, sensorType, newValue);
        sensor.classList.remove('warning', 'critical');
        if (status === 'warning') {
            sensor.classList.add('warning');
            if (systemStatus !== 'critical') systemStatus = 'warning';
        } else if (status === 'critical') {
            sensor.classList.add('critical');
            systemStatus = 'critical';
        }

        if (!sensorHistory[systemId][sensorType]) sensorHistory[systemId][sensorType] = [];
        sensorHistory[systemId][sensorType].push({ time: new Date().toLocaleTimeString(), value: newValue, signal_type: signalTypes[sensorType], polling_interval: pollingIntervals[systemId] });
        if (sensorHistory[systemId][sensorType].length > 50) sensorHistory[systemId][sensorType].shift();
    });

    if (systemElement) {
        systemElement.classList.remove('warning', 'critical');
        if (systemStatus === 'warning') systemElement.classList.add('warning');
        else if (systemStatus === 'critical') systemElement.classList.add('critical');
    }

    if (systemId === currentSystemId) {
        updateCurrentReadings();
        if (currentSensorType) updateChart();
    }
    suggestDecision(systemId); // Системы поддержки принятия решений (ЛР7)
}

// Функция для сброса значений датчиков системы (ЛР3)
function resetSensors(systemId) {
    getSensorsValues(systemId, sensors);
    const sensorElements = sensorsContainer?.querySelectorAll('.sensor') || [];
    const systemElement = document.getElementById(systemId);
    sensorElements.forEach(sensor => {
        const sensorType = getSensorTypeFromElement(sensor);
        const valueField = sensor.querySelector('.value');
        valueField.textContent = `-- ${getUnit(sensorType)}`;
        sensor.classList.remove('warning', 'critical');
    });
    if (systemElement) systemElement.classList.remove('warning', 'critical');
    updateCurrentReadings();
}

// Функция для генерации случайного целого значения с учетом закона распределения (ЛР3, обновлено для целых чисел)
function generateRandomValue(systemId, sensorType) {
    const sensorData = getSensorData(systemId);
    const config = sensorData[sensorType] || { normal: { min: 0, max: 100 } };
    const range = config.normal;
    const signalType = signalTypes[sensorType] || 'analog';
    const distribution = sensorData[sensorType]?.distribution || 'uniform'; // Закон распределения из конфига

    switch (distribution) {
        case 'normal':
            // Простая имитация нормального распределения с округлением до целых чисел
            const mean = Math.floor((range.max + range.min) / 2); // Целое среднее
            const stdDev = Math.floor((range.max - range.min) / 6); // Целое стандартное отклонение для 99% охвата
            let value = mean + Math.floor((Math.random() * 2 - 1) * stdDev * 3); // Округление до целого
            return clamp(value, Math.floor(range.min), Math.floor(range.max)); // Целые границы
        case 'uniform':
            return Math.floor(Math.random() * (Math.floor(range.max) - Math.floor(range.min) + 1)) + Math.floor(range.min); // Целые числа
        default:
            return Math.floor(Math.random() * (Math.floor(range.max) - Math.floor(range.min) + 1)) + Math.floor(range.min); // Целые числа
    }
}

// Вспомогательная функция для ограничения целого значения (ЛР3, обновлено для целых чисел)
function clamp(value, min, max) {
    return Math.max(Math.floor(min), Math.min(Math.floor(max), Math.floor(value)));
}

// Функция проверки статуса датчика с уведомлением (ЛР4)
function checkSensorStatus(systemId, sensorType, value) {
    const sensorData = getSensorData(systemId);
    const config = sensorData[sensorType] || { normal: { min: 0, max: 100 } };
    if (config.critical && value >= Math.floor(config.critical.min)) { // Используем Math.floor для целых чисел
        notifications.innerHTML = `<p>Критическое значение для ${getSensorName(sensorType)}: ${value}!</p>`;
        return 'critical';
    }
    if (config.warning && value >= Math.floor(config.warning.min)) { // Используем Math.floor для целых чисел
        notifications.innerHTML = `<p>Предупреждение для ${getSensorName(sensorType)}: ${value}!</p>`;
        return 'warning';
    }
    return 'normal';
}

// Функция для определения типа датчика по элементу DOM (ЛР2)
function getSensorTypeFromElement(sensorElement) {
    const text = sensorElement.querySelector('p').textContent.toLowerCase();
    const sensorData = getSensorData(currentSystemId);
    return Object.keys(sensorData).find(key => getSensorName(key).toLowerCase() === text) || text;
}

// Функция для получения данных датчика по системе (ЛР3)
function getSensorData(systemId) {
    switch (systemId) {
        case 'well1':
        case 'well2':
        case 'well3':
            return sensors.well;
        case 'upn':
            return sensors.upn;
        case 'dns':
            return sensors.dns;
        case 'pipeline':
            return sensors.pipeline;
        case 'gasDaistor':
            return sensors.gasDaistor;
        default:
            return sensors.well;
    }
}

// Функция для обновления графика с данными датчика (ЛР5)
function updateChart() {
    const canvas = document.getElementById('sensorChart');
    if (!canvas || !window.Chart || !currentSystemId || !currentSensorType || !sensorHistory[currentSystemId]?.[currentSensorType]) {
        addLog('График не обновлен: отсутствуют необходимые элементы или данные');
        return;
    }

    const ctx = canvas.getContext('2d');
    const sensorData = getSensorData(currentSystemId)[currentSensorType];
    const data = sensorHistory[currentSystemId][currentSensorType].filter(entry => {
        if (!trendRange.value) return true;
        const entryDate = new Date(entry.time);
        const selectedDate = new Date(trendRange.value);
        return entryDate.toDateString() === selectedDate.toDateString();
    }).slice(-50); // Ограничение до 50 записей для производительности

    const labels = data.map(entry => entry.time);
    const values = data.map(entry => Math.floor(entry.value)); // Округление до целого для отображения на графике
    const status = checkSensorStatus(currentSystemId, currentSensorType, values[values.length - 1] || 0);
    const chartColor = status === 'critical' ? 'red' : status === 'warning' ? 'yellow' : 'green';

    if (currentChart) {
        currentChart.data.labels = labels;
        currentChart.data.datasets[0].data = values;
        currentChart.data.datasets[0].borderColor = chartColor;
        currentChart.options.scales.y.min = Math.floor(sensorData.normal.min); // Целые числа
        currentChart.options.scales.y.max = Math.floor(sensorData.critical?.min || sensorData.normal.max + 20); // Целые числа
        currentChart.options.scales.y.ticks.callback = value => `${Math.floor(value)} ${getUnit(currentSensorType)}`; // Целые числа
        currentChart.update();
    } else {
        currentChart = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `${getSensorName(currentSensorType)} (${getUnit(currentSensorType)})`,
                    data: values,
                    borderColor: chartColor,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Время' } },
                    y: {
                        title: { display: true, text: getUnit(currentSensorType) },
                        min: Math.floor(sensorData.normal.min), // Целые числа
                        max: Math.floor(sensorData.critical?.min || sensorData.normal.max + 20), // Целые числа
                        ticks: {
                            callback: value => `${Math.floor(value)} ${getUnit(currentSensorType)}` // Целые числа
                        }
                    }
                },
                plugins: {
                    annotation: {
                        annotations: [
                            {
                                type: 'line',
                                yMin: Math.floor(sensorData.normal.max), // Целые числа
                                yMax: Math.floor(sensorData.normal.max), // Целые числа
                                borderColor: 'green',
                                borderWidth: 2,
                                label: { content: 'Норма', enabled: true }
                            },
                            {
                                type: 'line',
                                yMin: Math.floor(sensorData.warning?.min || sensorData.normal.max + 1), // Целые числа
                                yMax: Math.floor(sensorData.warning?.min || sensorData.normal.max + 1), // Целые числа
                                borderColor: 'yellow',
                                borderWidth: 2,
                                label: { content: 'Предупреждение', enabled: true }
                            },
                            {
                                type: 'line',
                                yMin: Math.floor(sensorData.critical?.min || sensorData.warning?.max + 1), // Целые числа
                                yMax: Math.floor(sensorData.critical?.min || sensorData.warning?.max + 1), // Целые числа
                                borderColor: 'red',
                                borderWidth: 2,
                                label: { content: 'Критическое', enabled: true }
                            }
                        ]
                    }
                }
            }
        });
    }
}

// Функция для обновления индикатора состояния соединения (ЛР6)
function updateConnectionIndicator(status) {
    connectionIndicator.textContent = status;
    connectionIndicator.classList.remove('connected', 'disconnected');
    if (status.includes('Подключено')) {
        connectionIndicator.classList.add('connected');
    } else {
        connectionIndicator.classList.add('disconnected');
    }
}

// Функция для отправки данных из буфера в БД при восстановлении соединения (ЛР6)
function flushBuffer() {
    if (buffer.length > 0 && isConnected && !isManualDisconnect) {
        const packets = createPackets(buffer);
        packets.forEach(async (packet) => {
            await savePacketsToDB(packet);
        });
        buffer = [];
        clearTimeout(bufferTimeout);
        bufferTimeout = null;
        addLog('Буфер очищен, данные отправлены в БД');
    }
}

// Функция для очистки буфера при превышении времени или размера (ЛР6)
function clearBuffer() {
    buffer = [];
    clearTimeout(bufferTimeout);
    bufferTimeout = null;
    addLog('Буфер очищен из-за превышения времени или размера');
}

// Функция для прореживания буфера при его переполнении (ЛР6)
function thinBuffer(bufferData) {
    if (bufferData.length <= BUFFER_MAX_PACKETS) return bufferData;
    const thinned = [bufferData[0], bufferData[bufferData.length - 1]]; // Сохраняем первый и последний пакеты
    const step = Math.floor((bufferData.length - 2) / (BUFFER_MAX_PACKETS - 2)) || 1;
    for (let i = 1; i < bufferData.length - 1; i += step) {
        thinned.push(bufferData[i]);
    }
    return thinned.slice(0, BUFFER_MAX_PACKETS);
}

// Функция для удвоения интервала формирования пакетов (ЛР6)
let packetInterval = 1000; // Начальный интервал формирования пакетов (1 секунда)
function increasePacketInterval() {
    packetInterval *= 2; // Удвоение интервала
    addLog(`Интервал формирования пакетов увеличен до ${packetInterval}ms`);
}

// Функция для создания пакетов из буфера (ЛР6)
function createPackets(data) {
    const packets = [];
    for (let i = 0; i < data.length; i += 10) {
        packets.push(data.slice(i, i + 10));
    }
    return packets;
}

// Асинхронная функция для пакетной отправки данных в БД (ЛР6)
async function savePacketsToDB(packet) {
    try {
        const response = await fetch('http://localhost:3000/sensors/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(packet)
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    } catch (err) {
        addLog(`Ошибка отправки пакета в БД: ${err.message}`);
    }
}

// Функция для рекомендаций систем поддержки принятия решений (ЛР7)
function suggestDecision(systemId) {
    if (!sensorHistory[systemId]) return;
    Object.entries(sensorHistory[systemId]).forEach(([sensorType, values]) => {
        const lastValue = Math.floor(values[values.length - 1]?.value); // Округление до целого для анализа
        const sensorData = getSensorData(systemId)[sensorType];
        if (lastValue >= Math.floor(sensorData.critical?.min)) { // Используем Math.floor для целых чисел
            notifications.innerHTML += `<p>Рекомендация: Немедленно проверьте систему ${systemId}, датчик ${getSensorName(sensorType)} в критическом состоянии (${lastValue}).</p>`;
        } else if (lastValue >= Math.floor(sensorData.warning?.min)) { // Используем Math.floor для целых чисел
            notifications.innerHTML += `<p>Рекомендация: Обратите внимание на систему ${systemId}, датчик ${getSensorName(sensorType)} в зоне предупреждения (${lastValue}).</p>`;
        }
    });
}