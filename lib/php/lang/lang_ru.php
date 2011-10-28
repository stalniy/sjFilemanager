<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
$_SYSTEM['lang'] = array(
    'OK'         => 'ОК',
    'CANCEL'     => 'Отменить',
    'USE_ONLY_FILES' => 'Эта операция применима только для файлов! Папки будут исключены!',
    'CNFR_REMOVE'    => 'После завершения операции будет не возможным востановить данные!!!',
    'UPLOAD_FILES'   => 'Загрузка файлов',
    'START_UPLOAD'   => 'Загрузить',
    'BROWSE'         => 'Файлы',
    'FILENAME'       => 'Название',
    'REQUEST_DONE'   => 'Запрос успешно выполнен',
    'PROJECT_TITLE'  => 'Управление файлами',
    'PATH'       => 'Путь',
    'REMOVE'     => 'Удалить файл/папку',
    'EMPTY_DIR'  => 'Текущая директория пустая',
    'DIRNAME'    => 'Название папки',

    'PROPERTY_OF_FILE' => array(
        'устройство',
        'номер узла inode',
        'атрибуты защиты файла',
        'число "жествких ссылок" на файл',
        'идентификатор uid владельца',
        'идентификатор gid групы',
        'тип устройства',
        'размер файла',
        'время последнего доступа',
        'время последней модификацыи',
        'время последнего изменения атрибутов файла',
        'размер блока',
        'число занятых блоков'
    ),
    'ERR_UPLOAD' => array(
        1 => "размер файла очень большой (максимальный размер - %s bytes)",
        2 => "размер файла очень большой (превыщает размер установленый при отправке формы)",
        3 => "файл загружен частично",
        4 => "ошибка при загрузке файла",
        6 => "не найден временной каталог",
        7 => "размер файла превишает заданый (максимальный размер - %s bytes)"
    ),

    'CREATE_DIR' => 'Создать папку',
    'CUT'        => 'Вырезать',
    'COPY'       => 'Копировать',
    'PASTE'      => 'Вставить',
    'RENAME'     => 'Переименовать',
    'PERMS'      => 'UNIX права доступа',
    'REFRESH'    => 'Обновить',
    'UPLOAD'     => 'Загрузить',
    'DOWNLOAD'   => 'Сохранить',
    'DIR_INFO'   => 'Информация (stat)',
    'TRANSFORM'  => 'Фикcацыя панели',

    'READ'  => 'Чтение',
    'WRITE' => 'Запись',
    'EXEC'  => 'Выполнение',
    'OWNER' => 'Владелец',
    'GROUP' => 'Група',
    'OTHER' => 'Другие',
    'DIR'   => 'Папка',

    'FILENAME' => 'Название файла',
    'SIZE'     => 'Размер',
    'TYPE'     => 'Тип',
    'MODIFY'   => 'Дата модификации',

    'ERR_IMAGE'     => 'поврежденный файл изображения',
    'ERR_FILE_TYPE' => 'неверный формат файла (только %s)',
    'ERR_PERMS'     => 'нет доступа к файлу на сервере, права на файл: ',
    'ERR_NOT_EXIST' => 'файл %s не существует',

    'Access denied' => 'Доступ запрещен',
    'Unable to process request' => 'Неизвестный запрос',
    'Unable to guess "%s" file type' => 'Не возможно вызначить тип файла "%s"',
    'Can not create thumbs for "%s"' => 'Не возможно создать thumbnail для "%s"',
    'Can not save image "%s"'        => 'Не возможно сохранить рисунок "%s"',
    'Cannot rename because the target "%s" already exist.' => 'Не возможно перейменовать, так как файл с таким именем уже существует',
    'Can not move files if destination or files array is empty' => 'Не возможно переместить файлы если имя папки или массив файлов пусты',
    'The folder "%s" does not writable' => 'Нет прав на запись в папку',
    'Uploaded files size greater then "%s"' => 'Загружаемый объем файла больше чем "%s"',
    'Size of "%s" <= 0' => 'Объем "%s" <= 0',
    'Files with extension "%s" does not allowed' => 'Файлы с рассширинием "%s" запрещены',
    'Can not copy file "%s" to destination "%s"' => 'Не возможно скопировать файл "%s" в "%s"',
    'class ZipArchive does not exists' => 'Не возможно заархивировать файлы, так как PHP класс ZipArchive не существует',
    'Can not create zip archive "%s"'  => 'Не возможно создать архив "%s"',
    'Can not add "%s" to zip archive'  => 'Не возможно добавить "%s" в архив',
    'Can not send uncompressed directory'  => 'Не возможно скачать не заархиврованную папку',
    'Invalid callable for exec method'  => 'Не верная функцыя callback для exec метода',
    'Root directory for view is not readable or not exists'  => 'Корневая папка для шаблонов не читабельна или не существует',
    'Template "%s" is not readable or not exists'  => 'Шаблон "%s" не читабельный или не существует',
    'Unable to override. File is not writable' => 'Нет прав на перезапись файла',
    'Unable to create folder. Folder with this name already exists' => 'Невозможно создать каталог. Каталог с таким именем уже существует',
    'Permissions denied' => 'Нет прав на чтение'
);
?>
