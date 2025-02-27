// Импорт необходимых модулей для создания и настройки сервера (ЛР1, ЛР6)
const express = require('express'); // Фреймворк Express для создания веб-сервера
const { Pool } = require('pg'); // Модуль для работы с базой данных PostgreSQL
const cors = require('cors'); // Модуль для обработки запросов с разными источниками (CORS)
const app = express(); // Создание экземпляра приложения Express
const port = 3000; // Порт, на котором будет работать сервер

// Настройка middleware для разрешения кросс-доменных запросов (CORS, ЛР1)
app.use(cors());
// Настройка middleware для парсинга JSON-данных в теле запросов (ЛР1)
app.use(express.json());

// Настройка подключения к базе данных PostgreSQL (ЛР1)
const pool = new Pool({
    user: 'nikitasokolskiy',
    host: 'localhost',
    database: 'oil_pump_id',
    password: '123',
    port: 5432
});

// Обработчик POST-запроса для эмуляции запуска процесса (ЛР2, ЛР6)
app.post('/start', (req, res) => {
    // Отправка простого текстового ответа клиенту о запуске процесса
    res.send('Процесс запущен');
});

// Обработчик POST-запроса для эмуляции остановки процесса (ЛР2, ЛР6)
app.post('/stop', (req, res) => {
    // Отправка простого текстового ответа клиенту об остановке процесса
    res.send('Процесс остановлен');
});

// Обработчик GET-запроса для получения данных датчиков из базы данных (ЛР1, ЛР5)
app.get('/sensors', async (req, res) => {
    try {
        let query = 'SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 50';
        const params = [];
        let paramCount = 1;

        if (req.query.system_id) {
            query = 'SELECT * FROM sensor_data WHERE system_id = $' + paramCount++ + ' ORDER BY timestamp DESC LIMIT 50';
            params.push(req.query.system_id);
        }
        if (req.query.start_date && req.query.end_date) {
            query = (query.includes('WHERE') ? query + ' AND ' : 'SELECT * FROM sensor_data WHERE ') +
                'timestamp BETWEEN $' + paramCount++ + ' AND $' + paramCount + ' ORDER BY timestamp DESC LIMIT 50';
            params.push(new Date(req.query.start_date).toISOString(), new Date(req.query.end_date).toISOString());
        }

        console.log('SQL-запрос:', query, params);
        const result = await pool.query(query, params);
        // Отправка полученных данных клиенту в формате JSON
        res.json(result.rows);
    } catch (err) {
        // Логирование ошибки в консоли сервера
        console.error('Детали ошибки:', err.stack);
        // Отправка ответа об ошибке с кодом 500
        res.status(500).send('Ошибка сервера: ' + err.message);
    }
});

// Обработчик POST-запроса для сохранения данных в базу данных (ЛР1, ЛР3)
app.post('/sensors', async (req, res) => {
    // Извлечение данных из тела запроса
    const { system_id, sensor_type, value, signal_type, polling_interval } = req.body;
    try {
        // Выполнение SQL-запроса для вставки новых данных в таблицу sensor_data
        await pool.query(
            'INSERT INTO sensor_data (system_id, sensor_type, value, signal_type, polling_interval) VALUES ($1, $2, $3, $4, $5)',
            [system_id, sensor_type, value, signal_type, polling_interval] // Параметры запроса для предотвращения SQL-инъекций
        );
        // Отправка успешного ответа с кодом 201
        res.status(201).send('Данные сохранены');
    } catch (err) {
        // Логирование ошибки в консоли сервера
        console.error(err);
        // Отправка ответа об ошибке с кодом 500
        res.status(500).send('Ошибка сервера');
    }
});

// Обработчик POST-запроса для пакетной отправки данных (ЛР6)
app.post('/sensors/batch', async (req, res) => {
    const packets = req.body;
    try {
        const query = 'INSERT INTO sensor_data (system_id, sensor_type, value, signal_type, polling_interval) VALUES ($1, $2, $3, $4, $5)';
        for (const packet of packets) {
            await pool.query(query, [
                packet.systemId,
                packet.sensorType,
                packet.value,
                packet.signal_type || 'analog',
                packet.polling_interval || 1000
            ]);
        }
        res.status(201).send('Пакеты данных сохранены');
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка пакетной отправки');
    }
});

// Запуск сервера на указанном порту (ЛР1)
app.listen(port, () => {
    // Вывод сообщения в консоль о запуске сервера
    console.log(`Сервер запущен на порту ${port}`);
});