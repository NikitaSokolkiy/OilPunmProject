// Слушатель события загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Получение кнопки входа и элементов страниц
    const enterButton = document.getElementById('enterButton'); // Кнопка входа
    const introPage = document.getElementById('introPage'); // Вступительная страница
    const mainContent = document.getElementById('mainContent'); // Основное содержание приложения

    // Обработчик клика по кнопке "Войти"
    enterButton.addEventListener('click', () => {
        // Скрытие вступительной страницы
        introPage.style.display = 'none';
        // Отображение основного содержимого
        mainContent.style.display = 'block';
    });
});