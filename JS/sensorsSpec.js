// Экспорт объекта с конфигурациями датчиков для различных систем (ЛР3)
export const sensors = {
    // Данные для скважин
    well: {
        // Давление (Бар)
        pressure: {
            normal: { min: 50, max: 70 }, // Нормальный диапазон значений
            warning: { min: 71, max: 90 }, // Диапазон предупреждения
            critical: { min: 91 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Температура (°C)
        temperature: {
            normal: { min: 50, max: 80 }, // Нормальный диапазон значений
            warning: { min: 81, max: 100 }, // Диапазон предупреждения
            critical: { min: 91 }, // Критический диапазон
            distribution: 'uniform', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Обводненность (%)
        flooding: {
            normal: { min: 0, max: 30 }, // Нормальный диапазон значений
            warning: { min: 31, max: 50 }, // Диапазон предупреждения
            critical: { min: 50 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        }
    },
    // Данные для установки подготовки нефти (УПН)
    upn: {
        // Расход жидкости (м³/ч)
        fc: {
            normal: { min: 350, max: 500 }, // Нормальный диапазон значений
            warning: { min: 501, max: 600 }, // Диапазон предупреждения
            critical: { min: 601 }, // Критический диапазон
            distribution: 'uniform', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Обводненность (%)
        flooding: {
            normal: { min: 0, max: 5 }, // Нормальный диапазон значений
            warning: { min: 6, max: 10 }, // Диапазон предупреждения
            critical: { min: 11 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Давление (Бар)
        pressure: {
            normal: { min: 30, max: 50 }, // Нормальный диапазон значений
            warning: { min: 51, max: 70 }, // Диапазон предупреждения
            critical: { min: 71 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        }
    },
    // Данные для дожимной насосной станции (ДНС)
    dns: {
        // Давление на входе (Бар)
        pressureIn: {
            normal: { min: 25, max: 40 }, // Нормальный диапазон значений
            warning: { min: 41, max: 50 }, // Диапазон предупреждения
            critical: { min: 51 }, // Критический диапазон
            distribution: 'uniform', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Давление на выходе (Бар)
        pressureOut: {
            normal: { min: 30, max: 80 }, // Нормальный диапазон значений
            warning: { min: 81, max: 100 }, // Диапазон предупреждения
            critical: { min: 101 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Температура подшипников насоса (°C)
        tempPumpBearings: {
            normal: { min: 60, max: 80 }, // Нормальный диапазон значений
            warning: { min: 81, max: 100 }, // Диапазон предупреждения
            critical: { min: 101 }, // Критический диапазон
            distribution: 'uniform', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Температура подшипников двигателя (°C)
        tempEngineBearings: {
            normal: { min: 70, max: 90 }, // Нормальный диапазон значений
            warning: { min: 91, max: 110 }, // Диапазон предупреждения
            critical: { min: 111 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Утечки сальников (мл/мин)
        saltsLeaks: {
            normal: { min: 0, max: 10 }, // Нормальный диапазон значений
            warning: { min: 11, max: 20 }, // Диапазон предупреждения
            critical: { min: 21 }, // Критический диапазон
            distribution: 'uniform', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        }
    },
    // Данные для трубопровода
    pipeline: {
        // Расход газа (м³/ч)
        oilConsumption: {
            normal: { min: 300, max: 1000 }, // Нормальный диапазон значений
            warning: { min: 1001, max: 1200 }, // Диапазон предупреждения
            critical: { min: 1201 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Давление (Бар)
        pressure: {
            normal: { min: 30, max: 60 }, // Нормальный диапазон значений
            warning: { min: 61, max: 80 }, // Диапазон предупреждения
            critical: { min: 81 }, // Критический диапазон
            distribution: 'uniform', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Температура (°C)
        temperature: {
            normal: { min: 20, max: 50 }, // Нормальный диапазон значений
            warning: { min: 51, max: 70 }, // Диапазон предупреждения
            critical: { min: 71 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        }
    },
    // Данные для газосепаратора
    gasDaistor: {
        // Давление (Бар)
        pressure: {
            normal: { min: 1, max: 30 }, // Нормальный диапазон значений
            warning: { min: 31, max: 40 }, // Диапазон предупреждения
            critical: { min: 41 }, // Критический диапазон
            distribution: 'uniform', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        },
        // Расход газа (м³/ч)
        oilConsumption: {
            normal: { min: 10, max: 500 }, // Нормальный диапазон значений
            warning: { min: 501, max: 600 }, // Диапазон предупреждения
            critical: { min: 601 }, // Критический диапазон
            distribution: 'normal', // Закон распределения (ЛР3)
            signalType: 'analog' // Тип сигнала (ЛР3)
        }
    }
};