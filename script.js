// Настройки
let coinPerTap = 1; // Количество монет, которое добавляется за один тап
let totalPower = 700; // Общая максимальная энергия

// Элементы DOM
let coinContainer = document.querySelector('.coin-container');
let coinImage = coinContainer.querySelector('img');
let coinValueElement = document.getElementById('coin-value');
let powerElement = document.getElementById('power');
let coinCountElement = document.querySelector('.coin-count-container h1');
let progressBar = document.querySelector('.progress');

// Переменные для монет и энергии
let coins = 0;
let power = 700;
let lastTapTime = 0;
const tapCooldown = 100; // Задержка между тапами (в миллисекундах)

let coinUpdateQueue = 0; // Очередь обновлений для серверных данных
let isUpdating = false; // Флаг, чтобы предотвратить несколько одновременных обновлений

// Сохранение времени последнего обновления
function saveLastUpdateTime() {
    localStorage.setItem('lastUpdateTime', Date.now());
}

// Обновление энергии на основе времени
function updatePowerBasedOnTime() {
    let lastUpdateTime = parseInt(localStorage.getItem('lastUpdateTime') || Date.now());
    let currentTime = Date.now();
    let elapsedTime = currentTime - lastUpdateTime;
    let powerToAdd = Math.floor(elapsedTime / 1500); // Энергия восстанавливается каждые 1.5 секунды

    // Обновляем энергию и не даём ей превышать максимальное значение
    power = Math.min(Number(localStorage.getItem('power') || power) + powerToAdd, totalPower);

    localStorage.setItem('power', power);
    saveLastUpdateTime();
}

// Инициализация энергии и монет
updatePowerBasedOnTime();
localStorage.setItem('coins', coins);
localStorage.setItem('power', power);
saveLastUpdateTime();

// Функция обновления интерфейса
function updateDisplay() {
    coinCountElement.textContent = Number(localStorage.getItem('coins')).toLocaleString();
    let currentPower = Number(localStorage.getItem('power'));
    powerElement.textContent = currentPower;
    progressBar.style.width = `${(100 * currentPower) / totalPower}%`;
}

// Анимация для отображения монет
function showCoinValue(value, x, y) {
    let newCoinValue = document.createElement('div');
    newCoinValue.className = 'coin-value';
    newCoinValue.textContent = `+${value}`;
    newCoinValue.style.left = `${x}px`;
    newCoinValue.style.top = `${y}px`;
    coinContainer.appendChild(newCoinValue);

    setTimeout(() => {
        newCoinValue.classList.add('show');
    }, 10);

    setTimeout(() => {
        coinContainer.removeChild(newCoinValue);
    }, 1000);
}

// Вибрация устройства (если поддерживается)
function vibrateDevice() {
    if ('vibrate' in navigator) {
        navigator.vibrate(50); // Вибрация на 50 мс
    }
}

// Шифрование chat_id (для безопасности)
function encryptChatId(chatId) {
    return btoa(chatId.split('').reverse().join('')); // Простой метод для шифрования
}

// Функция обновления монет на сервере
function updateCoinOnServer() {
    if (coinUpdateQueue > 0 && !isUpdating) {
        isUpdating = true;
        let amount = coinUpdateQueue;
        coinUpdateQueue = 0;
        let encryptedChatId = encryptChatId('1873407633'); // Замените на ваш chat_id
        fetch(`update_coin.php?chat_id=${encryptedChatId}&amount=${amount}`)
            .then(response => response.json())
            .then(data => {
                localStorage.setItem('coins', data.coin); // Обновляем количество монет
                updateDisplay();
                isUpdating = false;
                if (coinUpdateQueue > 0) {
                    updateCoinOnServer(); // Обновляем, если в очереди еще есть монеты
                }
            })
            .catch(() => {
                coinUpdateQueue += amount; // Если запрос не удался, возвращаем монеты в очередь
                isUpdating = false;
            });
    }
}

// Обработчик для касания (для мобильных устройств)
function handleTouch(e) {
    e.preventDefault();

    const currentTime = Date.now();
    if (currentTime - lastTapTime < tapCooldown) {
        return; // Если тап слишком быстрый, игнорируем
    }
    lastTapTime = currentTime;

    vibrateDevice(); // Вибрация устройства при тапе

    coins = Number(localStorage.getItem('coins'));
    power = Number(localStorage.getItem('power'));

    let touchPoints = e.targetTouches; // Массив касаний на экране
    let addedCoins = 0;

    for (let i = 0; i < touchPoints.length; i++) {
        if (power >= coinPerTap) { // Если хватает энергии для одного тапа
            let touch = touchPoints[i];
            let rect = coinImage.getBoundingClientRect();
            let x = touch.clientX - rect.left;
            let y = touch.clientY - rect.top;

            addedCoins += coinPerTap; // Добавляем монеты
            power -= coinPerTap; // Уменьшаем энергию

            showCoinValue(coinPerTap, x, y); // Показ анимации монет

            // Добавляем небольшую случайную анимацию для монеты
            let angle = Math.random() * 20 - 10;
            let translateX = (Math.random() * 0.5 - 0.25).toFixed(2);
            let translateY = (Math.random() * 0.5 - 0.25).toFixed(2);
            coinImage.style.transform = `translate(${translateX}rem, ${translateY}rem) rotate(${angle}deg)`;
        } else {
            break; // Если энергии недостаточно, прекращаем цикл
        }
    }

    if (addedCoins > 0) {
        coins += addedCoins;
        localStorage.setItem('coins', coins); // Сохраняем обновленное количество монет
        localStorage.setItem('power', power); // Сохраняем обновленную энергию
        coinUpdateQueue += addedCoins; // Добавляем монеты в очередь обновлений

        updateDisplay(); // Обновляем интерфейс
        updateCoinOnServer(); // Отправляем данные на сервер
    }

    setTimeout(() => {
        coinImage.style.transform = 'translate(0px, 0px) rotate(0deg)';
    }, 100);

    updateDisplay(); // Обновляем интерфейс каждый раз
}

// Слушаем события касания и клика
coinContainer.addEventListener('touchstart', handleTouch);

if (!('ontouchstart' in window)) { // Для десктопных браузеров добавляем обработку кликов
    coinContainer.addEventListener('click', (e) => {
        handleTouch({
            preventDefault: () => {},
            targetTouches: [{
                clientX: e.clientX,
                clientY: e.clientY
            }]
        });
    });
}

// Обновление энергии и монет каждую секунду
setInterval(() => {
    updatePowerBasedOnTime();
    updateDisplay();
}, 1500);

// Обновление монет на сервере каждую секунду
setInterval(updateCoinOnServer, 1000);

updateDisplay(); // Первоначальная инициализация интерфейса

// Сохранение времени последнего обновления при закрытии страницы
window.addEventListener('beforeunload', saveLastUpdateTime);
