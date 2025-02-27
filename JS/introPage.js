// Слушатель события загрузки документа (ЛР2)
document.addEventListener('DOMContentLoaded', () => {
    // Получение кнопки входа и элементов страниц
    const enterButton = document.getElementById('enterButton'); // Кнопка для перехода к основному интерфейсу
    const introPage = document.getElementById('introPage'); // Элемент вступительной страницы
    const mainContent = document.getElementById('mainContent'); // Элемент основного содержимого приложения

    // Обработчик события клика по кнопке "Войти" (ЛР2)
    enterButton.addEventListener('click', () => {
        // Скрытие вступительной страницы
        introPage.style.display = 'none';
        // Отображение основного содержимого
        mainContent.style.display = 'block';
    });
});