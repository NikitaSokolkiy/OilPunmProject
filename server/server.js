const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

// Добавляем middleware для CORS
const cors = require('cors');
app.use(cors()); // Разрешаем запросы от любого источника (для разработки)

// Подключение к PostgreSQL
const pool = new Pool({
    user: 'nikitasokolskiy',
    host: 'localhost',
    database: 'oil_pump_id',
    password: '123',
    port: 5432,
});

app.use(express.json());

// Получение данных из БД
app.get('/sensors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера');
    }
});

// Сохранение данных в БД
app.post('/sensors', async (req, res) => {
    const { system_id, sensor_type, value } = req.body;
    try {
        await pool.query(
            'INSERT INTO sensor_data (system_id, sensor_type, value) VALUES ($1, $2, $3)',
            [system_id, sensor_type, value]
        );
        res.status(201).send('Данные сохранены');
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера');
    }
});

// Тестовый маршрут для проверки подключения
app.get('/ping', async (req, res) => {
    try {
        const result = await pool.query('SELECT 1');
        res.send('PostgreSQL подключен успешно');
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка подключения к PostgreSQL');
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});