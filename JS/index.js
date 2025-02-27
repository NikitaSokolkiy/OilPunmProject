// Импорт конфигураций датчиков из отдельного файла
import { sensors } from './sensorsSpec.js';

// Элементы DOM для работы с интерфейсом
const sensorsContainer = document.querySelector('.sensorsValues'); // Контейнер для отображения значений датчиков
const notifications = document.getElementById('notifications'); // Элемент для уведомлений пользователя
const logList = document.getElementById('logList'); // Список для отображения логов
const currentReadingsList = document.getElementById('currentReadingsList'); // Список текущих показаний датчиков
const historyTableBody = document.querySelector('#historyTable tbody'); // Тело таблицы истории данных
const historyFilter = document.getElementById('historyFilter'); // Выпадающий список для фильтрации истории
const startBtn = document.getElementById('startBtn'); // Кнопка для запуска всех систем
const stopBtn = document.getElementById('stopBtn'); // Кнопка для остановки всех систем
const overloadBtn = document.getElementById('overloadBtn'); // Кнопка для имитации перегрузки

// Объект для хранения состояний систем (генерация данных)
const systemStates = {};
// Объект для хранения истории данных датчиков
let sensorHistory = {};
// Текущая выбраная система
let currentSystemId = null;
// Текущий выбранный тип датчика
let currentSensorType = null;
// Текущий график (Chart.js)
let currentChart = null;
// Флаг режима перегрузки датчиков
let isOverloadMode = false;

// Объект для отслеживания состояний скважин (true — включена, false — выключена)
const wellStates = {
    well1: false, // Состояние скважины №1
    well2: false, // Состояние скважины №2
    well3: false  // Состояние скважины №3
};

// Функция для добавления сообщений в лог
function addLog(message) {
    // Вывод в консоль для отладки
    console.log(message);
    // Проверка наличия элемента логов
    if (logList) {
        // Создание нового элемента списка
        const li = document.createElement('li');
        // Установка текста лога с текущим временем
        li.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        // Добавление лога в список
        logList.appendChild(li);
        // Прокрутка к последнему сообщению
        logList.scrollTop = logList.scrollHeight;
    } else {
        // Сообщение об ошибке, если элемент не найден
        console.error('Элемент #logList не найден');
    }
}

// Асинхронная функция для сохранения данных в базу через API сервера
async function saveToDB(systemId, sensorType, value) {
    try {
        // Отправка POST-запроса на сервер
        const response = await fetch('http://localhost:3000/sensors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // Указание формата JSON
            body: JSON.stringify({ system_id: systemId, sensor_type: sensorType, value }) // Данные для отправки
        });
        // Проверка успешности ответа
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    } catch (err) {
        // Логирование ошибки сохранения
        addLog(`Ошибка сохранения в БД: ${err.message}`);
    }
}

// Асинхронная функция для загрузки данных из базы через API сервера
async function loadFromDB(filterSystemId = '') {
    // Проверка наличия элемента таблицы истории
    if (!historyTableBody) {
        addLog('Ошибка: #historyTable tbody не найден');
        return;
    }
    try {
        // Получение данных с сервера
        const response = await fetch('http://localhost:3000/sensors');
        // Проверка успешности ответа
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        // Парсинг JSON-ответа
        const data = await response.json();
        // Очистка текущей истории
        sensorHistory = {};
        // Обработка полученных данных
        data.forEach(row => {
            if (!sensorHistory[row.system_id]) sensorHistory[row.system_id] = {};
            if (!sensorHistory[row.system_id][row.sensor_type]) sensorHistory[row.system_id][row.sensor_type] = [];
            // Добавление записи в историю с временем и значением
            sensorHistory[row.system_id][row.sensor_type].push({
                time: new Date(row.timestamp).toLocaleTimeString(),
                value: row.value
            });
        });

        // Очистка таблицы истории
        historyTableBody.innerHTML = '';
        // Заполнение таблицы истории
        Object.entries(sensorHistory).forEach(([systemId, sensors]) => {
            // Фильтрация по указанной системе, если задан фильтр
            if (filterSystemId && systemId !== filterSystemId) return;
            Object.entries(sensors).forEach(([sensorType, values]) => {
                values.forEach(entry => {
                    // Создание строки таблицы
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${systemId}</td>
                        <td>${getSensorName(sensorType)}</td>
                        <td>${entry.value}</td>
                        <td>${entry.time}</td>
                    `;
                    historyTableBody.appendChild(row);
                });
            });
        });
        // Лог успешной загрузки данных
        addLog('Данные загружены из БД');
    } catch (err) {
        // Логирование ошибки загрузки
        addLog(`Ошибка загрузки из БД: ${err.message}`);
    }
}

// Обработчики событий для кликов по системам
document.querySelectorAll('.system').forEach(system => {
    system.addEventListener('click', (e) => {
        // Игнорирование кликов по кнопке "Вкл/Выкл"
        if (e.target.classList.contains('wellOnOff')) return;
        // Установка текущей системы
        currentSystemId = e.currentTarget.id;
        // Лог выбора системы
        addLog(`Выбрана система: ${currentSystemId}`);
        // Уничтожение текущего графика, если он существует
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        // Сброс текущего типа датчика
        currentSensorType = null;
        // Отображение значений датчиков для системы
        getSensorsValues(currentSystemId, sensors);
        // Обновление текущих показаний
        updateCurrentReadings();
    });
});

// Обработчики событий для кнопок "Вкл/Выкл" систем
document.querySelectorAll('.wellOnOff').forEach(button => {
    button.addEventListener('click', (e) => {
        // Предотвращение всплытия события
        e.stopPropagation();
        // Получение ID системы
        const systemId = e.target.parentElement.id;
        // Переключение состояния кнопки
        const isActive = e.target.classList.toggle('wellOnOffActive');
        // Обновление состояния скважины, если это скважина
        if (['well1', 'well2', 'well3'].includes(systemId)) {
            wellStates[systemId] = isActive;
        }
        // Запуск или остановка генерации данных
        if (isActive) {
            startGenVal(systemId);
            e.target.textContent = 'Выкл';
        } else {
            stopGenVal(systemId);
            e.target.textContent = 'Вкл';
        }
        // Проверка состояния систем
        checkSystemState();
    });
});

// Обработчик для кнопки "Старт"
startBtn.addEventListener('click', () => {
    // Проверка, включена ли хотя бы одна скважина
    if (!isAnyWellOn()) {
        notifications.innerHTML = '<p>Нужно включить хотя бы одну скважину!</p>';
        return;
    }
    // Запуск всех систем, кроме скважин
    startAllSystems();
    addLog('Все системы запущены');
});

// Обработчик для кнопки "Стоп"
stopBtn.addEventListener('click', () => {
    // Остановка всех систем
    stopAllSystems();
    addLog('Все системы остановлены');
});

// Обработчик для кнопки "Имитация перегрузки"
overloadBtn.addEventListener('click', () => {
    // Переключение режима перегрузки
    isOverloadMode = !isOverloadMode;
    // Обновление текста кнопки
    overloadBtn.textContent = isOverloadMode ? 'Остановить перегрузку' : 'Им. перег.';
    // Лог изменения режима
    addLog(`Режим перегрузки: ${isOverloadMode}`);
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверка наличия критических DOM-элементов
    if (!sensorsContainer || !historyFilter || !logList) {
        console.error('Один или несколько критических элементов DOM отсутствуют');
        return;
    }
    // Загрузка данных из БД
    loadFromDB();
    // Обработчик кликов по датчикам
    sensorsContainer.addEventListener('click', (e) => {
        // Поиск ближайшего элемента с классом .sensor
        const sensorElement = e.target.closest('.sensor');
        if (sensorElement && currentSystemId) {
            // Установка текущего типа датчика
            currentSensorType = getSensorTypeFromElement(sensorElement);
            // Лог выбора датчика
            addLog(`Выбран датчик: ${currentSensorType}`);
            // Обновление графика
            updateChart();
        }
    });
    // Периодическая загрузка данных каждые 2 секунды
    setInterval(() => loadFromDB(historyFilter.value), 2000);
    // Обработчик изменения фильтра истории
    historyFilter.addEventListener('change', () => loadFromDB(historyFilter.value));
});

// Функция для отображения значений датчиков системы
function getSensorsValues(systemId, sensors) {
    // Проверка наличия контейнера для датчиков
    if (!sensorsContainer) return;
    // Лог отображения датчиков
    addLog(`Отображение датчиков для ${systemId}`);
    // Очистка контейнера
    sensorsContainer.innerHTML = '';
    let sensorData; // Данные датчиков для системы
    // Определение данных в зависимости от системы
    switch (systemId) {
        case 'well1':
        case 'well2':
        case 'well3':
            sensorData = sensors.well;
            createWellSensor(sensorData); // Создание элементов для скважин
            break;
        case 'upn':
            sensorData = sensors.upn;
            createWellSensor(sensorData); // Создание элементов для УПН
            break;
        case 'dns':
            sensorData = sensors.dns;
            createWellSensor(sensorData); // Создание элементов для ДНС
            break;
        case 'pipeline':
            sensorData = sensors.pipeline;
            createWellSensor(sensorData); // Создание элементов для трубопровода
            break;
        case 'gasDaistor':
            sensorData = sensors.gasDaistor;
            createWellSensor(sensorData); // Создание элементов для газосепаратора
            break;
        default:
            // Сообщение об ошибке, если система не найдена
            sensorsContainer.innerHTML = '<li>Система не найдена</li>';
    }
}

// Функция для создания элементов датчиков для скважин, УПН, ДНС, трубопровода и газосепаратора
function createWellSensor(sensorData) {
    // Проверка наличия контейнера и данных
    if (!sensorsContainer || !sensorData) return;
    // Перебор данных датчиков
    for (const [sensorType, sensorConfig] of Object.entries(sensorData)) {
        // Создание элемента списка
        const sensorItem = document.createElement('li');
        // Добавление класса для стилизации
        sensorItem.classList.add('sensor');
        // HTML для отображения датчика
        sensorItem.innerHTML = `
            <p style="font-weight:bold">${getSensorName(sensorType)}</p> <!-- Название датчика -->
            <div class="value">-- ${getUnit(sensorType)}</div> <!-- Значение с единицей измерения -->
            <div class="limits"> <!-- Ограничения норм -->
                <div class="min">min<div class="valueMin">${sensorConfig.normal.min}</div></div>
                <div class="max">max<div class="valueMax">${sensorConfig.normal.max}</div></div>
                <div class="avg">avg<div class="valueAvg">--</div></div>
            </div>
        `;
        // Добавление элемента в контейнер
        sensorsContainer.appendChild(sensorItem);
    }
}

// Функция для получения единицы измерения датчика
function getUnit(sensorType) {
    // Словарь единиц измерения для различных типов датчиков
    const units = {
        pressure: 'Бар', temperature: '°C', flooding: '%', fc: 'м³/ч', pressureIn: 'Бар',
        pressureOut: 'Бар', tempPumpBearings: '°C', tempEngineBearings: '°C', saltsLeaks: 'мл/мин',
        oilConsumption: 'м³/ч'
    };
    // Возвращение единицы измерения или пустую строку, если тип не найден
    return units[sensorType] || '';
}

// Функция для получения названия датчика
function getSensorName(sensorType) {
    // Словарь названий датчиков
    const names = {
        pressure: 'Давление', temperature: 'Температура', flooding: 'Обводненность', fc: 'Расход жидкости',
        pressureIn: 'Давление на входе', pressureOut: 'Давление на выходе', tempPumpBearings: 'Температура подшипников насоса',
        tempEngineBearings: 'Температура подшипников двигателя', saltsLeaks: 'Утечки сальников',
        oilConsumption: 'Расход газа'
    };
    // Возвращение названия или исходного типа, если не найдено
    return names[sensorType] || sensorType;
}

// Функция для начала генерации данных для системы
function startGenVal(systemId) {
    // Инициализация состояния системы, если его нет
    if (!systemStates[systemId]) systemStates[systemId] = {};
    // Установка интервала генерации данных каждую секунду
    systemStates[systemId].interval = setInterval(() => updateSensors(systemId), 1000);
    // Лог начала генерации
    addLog(`Генерация запущена для ${systemId}`);
}

// Функция для остановки генерации данных для системы
function stopGenVal(systemId) {
    // Проверка наличия интервала генерации
    if (systemStates[systemId]?.interval) {
        // Остановка интервала
        clearInterval(systemStates[systemId].interval);
        // Удаление интервала из состояния
        delete systemStates[systemId].interval;
        // Сброс значений датчиков
        resetSensors(systemId);
        // Лог остановки генерации
        addLog(`Генерация остановлена для ${systemId}`);
    }
}

// Функция для запуска всех систем, кроме скважин
function startAllSystems() {
    // Перебор всех систем в объекте состояний
    Object.keys(systemStates).forEach(systemId => {
        // Запуск генерации только для систем, не являющихся скважинами
        if (systemStates[systemId] && !['well1', 'well2', 'well3'].includes(systemId)) {
            startGenVal(systemId);
        }
    });
}

// Функция для остановки всех систем
function stopAllSystems() {
    // Перебор всех систем в объекте состояний
    Object.keys(systemStates).forEach(systemId => {
        // Проверка наличия интервала для системы
        if (systemStates[systemId]?.interval) {
            // Остановка интервала
            clearInterval(systemStates[systemId].interval);
            // Удаление интервала из состояния
            delete systemStates[systemId].interval;
            // Сброс кнопки в исходное состояние
            const button = document.querySelector(`#${systemId} .wellOnOff`);
            if (button) {
                button.classList.remove('wellOnOffActive');
                button.textContent = 'Вкл';
            }
            // Сброс значений датчиков
            resetSensors(systemId);
        }
    });
    // Лог остановки всех систем
    addLog('Все системы остановлены');
}

// Функция для обновления текущих показаний в интерфейсе
function updateCurrentReadings() {
    // Проверка наличия списка текущих показаний
    if (!currentReadingsList) return;
    // Очистка списка
    currentReadingsList.innerHTML = '';
    // Проверка наличия текущей системы и данных
    if (!currentSystemId || !sensorHistory[currentSystemId]) return;
    // Перебор данных для текущей системы
    Object.entries(sensorHistory[currentSystemId]).forEach(([sensorType, values]) => {
        // Получение последнего значения
        const lastValue = values[values.length - 1];
        // Создание элемента списка
        const li = document.createElement('li');
        // Установка текста с названием, значением и временем
        li.textContent = `${getSensorName(sensorType)}: ${lastValue.value} ${getUnit(sensorType)} (время: ${lastValue.time})`;
        // Добавление элемента в список
        currentReadingsList.appendChild(li);
    });
}

// Функция для обновления значений датчиков системы
function updateSensors(systemId) {
    // Обновление значений, если система выбрана
    if (systemId === currentSystemId) getSensorsValues(systemId, sensors);
    // Получение элементов датчиков
    const sensorElements = sensorsContainer?.querySelectorAll('.sensor') || [];
    // Получение элемента системы
    const systemElement = document.getElementById(systemId);
    // Инициализация истории для системы, если её нет
    if (!sensorHistory[systemId]) sensorHistory[systemId] = {};
    // Статус системы по умолчанию
    let systemStatus = 'normal';

    // Перебор всех элементов датчиков
    sensorElements.forEach(sensor => {
        // Получение типа датчика
        const sensorType = getSensorTypeFromElement(sensor);
        // Получение поля значения
        const valueField = sensor.querySelector('.value');
        let newValue; // Новое значение

        // Генерация случайного значения для всех систем (без емкостей)
        newValue = generateRandomValue(systemId, sensorType);
        const sensorData = getSensorData(systemId);
        const config = sensorData[sensorType] || { normal: { min: 0, max: 100 } };
        // Ограничение значения в пределах норм
        newValue = Math.max(config.normal.min, Math.min(newValue, config.normal.max));
        // Имитация перегрузки, если режим активен
        if (isOverloadMode) {
            const ranges = [
                config.warning || { min: config.normal.max + 1, max: config.normal.max + 20 },
                config.critical || { min: config.warning?.max + 1 || config.normal.max + 21 }
            ];
            const range = ranges[Math.floor(Math.random() * ranges.length)];
            const max = range.max || range.min + 20;
            newValue = Math.floor(Math.random() * (max - range.min + 1)) + range.min;
        }

        // Обновление значения в интерфейсе
        valueField.textContent = `${newValue} ${getUnit(sensorType)}`;
        // Сохранение данных в базу
        saveToDB(systemId, sensorType, newValue);

        // Проверка статуса датчика
        const status = checkSensorStatus(systemId, sensorType, newValue);
        // Сброс классов состояния
        sensor.classList.remove('warning', 'critical');
        // Установка класса в зависимости от статуса
        if (status === 'warning') {
            sensor.classList.add('warning');
            if (systemStatus !== 'critical') systemStatus = 'warning';
        } else if (status === 'critical') {
            sensor.classList.add('critical');
            systemStatus = 'critical';
        }

        // Инициализация истории для типа датчика, если её нет
        if (!sensorHistory[systemId][sensorType]) sensorHistory[systemId][sensorType] = [];
        // Добавление новой записи в историю
        sensorHistory[systemId][sensorType].push({ time: new Date().toLocaleTimeString(), value: newValue });
        // Ограничение размера истории до 50 записей
        if (sensorHistory[systemId][sensorType].length > 50) sensorHistory[systemId][sensorType].shift();
    });

    // Обновление состояния системы в интерфейсе
    if (systemElement) {
        systemElement.classList.remove('warning', 'critical');
        if (systemStatus === 'warning') systemElement.classList.add('warning');
        else if (systemStatus === 'critical') systemElement.classList.add('critical');
    }

    // Обновление интерфейса, если система активна
    if (systemId === currentSystemId) {
        updateCurrentReadings();
        if (currentSensorType) updateChart();
    }
}

// Функция для сброса значений датчиков системы
function resetSensors(systemId) {
    // Обновление значений датчиков
    getSensorsValues(systemId, sensors);
    // Получение элементов датчиков
    const sensorElements = sensorsContainer?.querySelectorAll('.sensor') || [];
    // Получение элемента системы
    const systemElement = document.getElementById(systemId);
    // Перебор всех элементов датчиков
    sensorElements.forEach(sensor => {
        // Получение типа датчика
        const sensorType = getSensorTypeFromElement(sensor);
        // Получение поля значения
        const valueField = sensor.querySelector('.value');
        // Сброс значения
        valueField.textContent = `-- ${getUnit(sensorType)}`;
        // Сброс классов состояния
        sensor.classList.remove('warning', 'critical');
    });
    // Сброс классов состояния системы
    if (systemElement) systemElement.classList.remove('warning', 'critical');
    // Обновление текущих показаний
    updateCurrentReadings();
}

// Функция для генерации случайного значения в пределах норм датчика
function generateRandomValue(systemId, sensorType) {
    // Получение данных датчика
    const sensorData = getSensorData(systemId);
    // Конфигурация норм или значения по умолчанию
    const config = sensorData[sensorType] || { normal: { min: 0, max: 100 } };
    // Диапазон норм
    const range = config.normal;
    // Генерация случайного значения в диапазоне
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

// Функция для проверки статуса датчика (нормальный, предупреждение, критический)
function checkSensorStatus(systemId, sensorType, value) {
    // Получение данных датчика
    const sensorData = getSensorData(systemId);
    // Конфигурация норм или значения по умолчанию
    const config = sensorData[sensorType] || { normal: { min: 0, max: 100 } };
    // Проверка на критическое состояние
    if (config.critical && value >= config.critical.min) return 'critical';
    // Проверка на предупреждение
    if (config.warning && value >= config.warning.min) return 'warning';
    // Нормальное состояние
    return 'normal';
}

// Функция для определения типа датчика по элементу DOM
function getSensorTypeFromElement(sensorElement) {
    // Получение текста названия датчика в нижнем регистре
    const text = sensorElement.querySelector('p').textContent.toLowerCase();
    // Получение данных текущей системы
    const sensorData = getSensorData(currentSystemId);
    // Поиск типа датчика по его названию
    return Object.keys(sensorData).find(key => getSensorName(key).toLowerCase() === text) || text;
}

// Функция для получения данных датчика по системе
function getSensorData(systemId) {
    // Определение данных в зависимости от системы
    switch (systemId) {
        case 'well1':
        case 'well2':
        case 'well3':
            return sensors.well; // Данные для скважин
        case 'upn':
            return sensors.upn; // Данные для УПН
        case 'dns':
            return sensors.dns; // Данные для ДНС
        case 'pipeline':
            return sensors.pipeline; // Данные для трубопровода
        case 'gasDaistor':
            return sensors.gasDaistor; // Данные для газосепаратора
        default:
            // Возвращение данных скважины по умолчанию
            return sensors.well;
    }
}

// Функция для обновления графика с данными датчика
function updateChart() {
    // Получение элемента холста для графика
    const canvas = document.getElementById('sensorChart');
    // Проверка наличия холста, Chart.js и данных
    if (!canvas || !window.Chart || !currentSystemId || !currentSensorType || !sensorHistory[currentSystemId]?.[currentSensorType]) {
        addLog('График не обновлен: отсутствуют необходимые элементы или данные');
        return;
    }

    // Получение контекста холста
    const ctx = canvas.getContext('2d');
    // Получение последних 10 записей для графика
    const data = sensorHistory[currentSystemId][currentSensorType].slice(-10);
    // Формирование меток времени
    const labels = data.map(entry => entry.time);
    // Формирование значений
    const values = data.map(entry => entry.value);
    // Определение статуса последнего значения
    const status = checkSensorStatus(currentSystemId, currentSensorType, values[values.length - 1]);
    // Определение цвета графика по статусу
    const chartColor = status === 'critical' ? 'red' : status === 'warning' ? 'yellow' : 'green';

    // Обновление существующего графика
    if (currentChart) {
        currentChart.data.labels = labels;
        currentChart.data.datasets[0].data = values;
        currentChart.data.datasets[0].borderColor = chartColor;
        currentChart.update();
    } else {
        // Создание нового графика
        currentChart = new window.Chart(ctx, {
            type: 'line', // Тип графика — линия
            data: {
                labels, // Метки времени
                datasets: [{
                    label: `${getSensorName(currentSensorType)} (${getUnit(currentSensorType)})`, // Название датчика
                    data: values, // Значения
                    borderColor: chartColor, // Цвет линии
                    fill: false // Без заливки под линией
                }]
            },
            options: { // Настройки графика
                scales: {
                    x: { title: { display: true, text: 'Время' } }, // Ось X
                    y: { title: { display: true, text: getUnit(currentSensorType) } } // Ось Y
                }
            }
        });
    }
}

// Функция для проверки, включена ли хотя бы одна скважина
function isAnyWellOn() {
    // Проверка состояния всех скважин
    return Object.values(wellStates).some(state => state === true);
}

// Функция для проверки состояния систем и управления доступностью
function checkSystemState() {
    // Проверка, включена ли хотя бы одна скважина
    const anyWellOn = isAnyWellOn();
    if (!anyWellOn) {
        // Отображение уведомления
        notifications.innerHTML = '<p>Нужно включить хотя бы одну скважину!</p>';
        // Остановка работы всех систем, кроме скважин
        Object.keys(systemStates).forEach(systemId => {
            if (systemStates[systemId]?.interval && !['well1', 'well2', 'well3'].includes(systemId)) {
                stopGenVal(systemId);
                const button = document.querySelector(`#${systemId} .wellOnOff`);
                if (button) {
                    button.classList.remove('wellOnOffActive');
                    button.textContent = 'Вкл';
                }
            }
        });
    } else {
        // Сброс уведомления, если скважины включены
        notifications.innerHTML = '<p>Выберите систему</p>';
    }
}