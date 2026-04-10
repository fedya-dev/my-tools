# My Tools

Личен сървър с инструменти, работещ в Docker.

## Изисквания

- Docker
- Docker Compose

## Инсталация на нов сървър

```bash
# 1. Клонирай repo-то
git clone git@github.com:fedya-dev/my-tools.git
cd my-tools

# 2. Стартирай
docker compose up -d
```

Готово. Сайтът е достъпен на `http://IP_НА_СЪРВЪРА`

## Спиране / Стартиране

```bash
# Спиране
docker compose down

# Стартиране
docker compose up -d

# Рестарт
docker compose restart
```

## Добавяне на нов HTML файл

Просто копирай файла в `html/` папката – няма нужда от рестарт:

```bash
cp нов-файл.html /opt/my-tools/html/
```

След това го добави и в индекса чрез интерфейса или директно в `html/index.html`.

## Обновяване от GitHub

```bash
git pull
```

Ако си добавил нови файлове директно на сървъра и искаш да ги качиш в GitHub:

```bash
git add .
git commit -m "добавен нов инструмент"
git push
```

## Структура

```
my-tools/
├── docker-compose.yml   # Docker конфигурация
├── .gitignore
├── README.md
└── html/                # Всички файлове на сайта
    ├── index.html       # Начална страница
    ├── api.php          # API за управление на инструментите
    ├── navhub-data.json # Генерира се автоматично (не е в Git)
    └── *.html           # Инструментите
```

## Бележки

- `navhub-data.json` се генерира автоматично при първо зареждане и не се пази в Git
- Файловете в `html/` са live – промените са видими веднага без рестарт
