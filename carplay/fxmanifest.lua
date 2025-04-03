fx_version 'cerulean'
game 'gta5'

name 'Carplay'
description 'CarPlay rendszer FiveM szerverhez'
author 'Abel_Developer_Team'
version '1.0.0'

ui_page 'html/index.html'

client_scripts {
    'client/main.lua',
}

server_scripts {
    'server/main.lua',
}

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
    'html/img/*.png',
}

dependency 'es_extended'