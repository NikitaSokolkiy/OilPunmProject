const sensors = {
    // Давление в ДНС на входе
    pressureInDNC: {
        min: 0.5,
        max: 2.5,
        critical: {
            min: 0.3,
            max: 3.0,
        }
    },
    // Давление в ДНС на выходе
    pressureOutDNC: {
        min: 1.0,
        max: 6.0,
        critical: {
            min: 0.8,
            max: 7.0,
        }
    },
    // Температура полевого подшипника насоса
    tempPumpBearingF: {
        min: 20,
        max: 85,
        critical: {
            max: 90,
        }
    },
    // Температура рабочего подшипника насоса
    tempPumpBearingW: {
        min: 20,
        max: 85,
        critical: {
            max: 90,
        }
    },
    // Температура полевого подшипника двигателя
    tempMotorBearingF: {
        min: 20,
        max: 95,
        critical: {
            max: 100,
        }
    },
    //Температура рабочего подшипника двигателя
    tempMotorBearingW: {
        min: 20,
        max: 95,
        critical: {
            max: 100,
        }
    },
    // Контроль утечек сальников
    sealLeakagePump: {
        min: 0,   // Нет утечки
        max: 1,   // Незначительное подтекание
        critical: {
            max: 2,   // Значительная утечка (авария)
        }
    },
    // Расход жидкости на выходе ДНС
    flowLiquidOutDNC: {
        min: 50,
        max: 300,
        critical: {
            min: 40,
            max: 350,
        }
    },
    // Расход нефти на выходе ДНС
    flowOilOutDNC: {
        min: 40,
        max: 250,
        critical: {
            min: 30,
            max: 280,
        }
    },
    // Контроль обводненности нефти
    waterCutOil: {
        min: 0,
        max: 5,
        critical: {
            max: 10,
        }
    },
    // Контроль расхода газа
    flowGas: {
        min: 0.1,
        max: 5.0,
        critical: {
            max: 6.0,
        }
    },
    // Контроль расхода воды с УПСВ
    flowWaterUPSV: {
        min: 5,
        max: 50,
        critical: {
            max: 60,
        }
    }
};

console.log(sensors);