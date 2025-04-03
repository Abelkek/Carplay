local display = false
local isPlaying = false
local currentMedia = nil -- 'radio' vagy 'youtube'

-- ESX inicializálás
ESX = nil
CreateThread(function()
    while ESX == nil do
        TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
        Wait(0)
    end
end)

-- Carplay parancs regisztrálása
RegisterCommand('carplay', function(source, args, rawCommand)
    local playerPed = PlayerPedId()
    local vehicle = GetVehiclePedIsIn(playerPed, false)
    
    if vehicle == 0 then
        ESX.ShowNotification('Csak járműben használhatod a CarPlay rendszert!')
        return
    end
    
    if args[1] == 'youtube' and args[2] then
        if not display then
            ToggleDisplay(true)
        end
        SendNUIMessage({
            type = 'youtube',
            link = args[2]
        })
        currentMedia = 'youtube'
        isPlaying = true
        ESX.ShowNotification('YouTube videó betöltése...')
    elseif args[1] == 'radio' then
        if not display then
            ToggleDisplay(true)
        end
        SendNUIMessage({
            type = 'radio',
            action = 'play'
        })
        currentMedia = 'radio'
        isPlaying = true
        ESX.ShowNotification('Petőfi Rádió elindítva')
    elseif args[1] == 'stop' then
        if isPlaying then
            SendNUIMessage({
                type = 'stop'
            })
            isPlaying = false
            ESX.ShowNotification('Lejátszás leállítva')
        end
    elseif args[1] == 'close' then
        ToggleDisplay(false)
        SendNUIMessage({
            type = 'stop'
        })
        isPlaying = false
    else
        -- Ha nincs paraméter, megnyitjuk a CarPlay menüt
        ToggleDisplay(not display)
    end
end, false)

-- NUI callback a bezáráshoz
RegisterNUICallback('close', function(data, cb)
    -- Ha a keepPlaying true, akkor csak a kijelzőt zárjuk be, a lejátszást nem állítjuk le
    if data.keepPlaying then
        display = false
        SetNuiFocus(false, false)
        SendNUIMessage({
            type = 'ui',
            status = false
        })
        
        -- Ha YouTube játszódott a bezárás pillanatában, azt is jelezzük
        if data.youTubePlaying then
            currentMedia = 'youtube'
            isPlaying = true
        -- Ha rádió játszódott a bezárás pillanatában, azt is jelezzük
        elseif data.radioPlaying then
            currentMedia = 'radio'
            isPlaying = true
        end
    else
        ToggleDisplay(false)
    end
    cb('ok')
end)

-- NUI callback a lejátszás leállításához
RegisterNUICallback('stop', function(data, cb)
    isPlaying = false
    currentMedia = nil
    cb('ok')
end)

-- NUI callback a hangerő szabályozásához
RegisterNUICallback('volume', function(data, cb)
    -- A hangerő értékét elmentjük és továbbítjuk a játéknak
    if data.volume then
        SendNUIMessage({
            type = 'volume',
            value = data.volume
        })
    end
    cb('ok')
end)

-- NUI callback a YouTube videó kezeléséhez
RegisterNUICallback('youtube', function(data, cb)
    if data.videoId then
        currentMedia = 'youtube'
        isPlaying = true
        ESX.ShowNotification('YouTube videó lejátszása...')
    end
    cb('ok')
end)

-- NUI callback a rádió lejátszás kezeléséhez
RegisterNUICallback('radio', function(data, cb)
    if data.playing then
        currentMedia = 'radio'
        isPlaying = true
        ESX.ShowNotification('Petőfi Rádió elindítva')
    end
    cb('ok')
end)

-- Display kezelése
function ToggleDisplay(state)
    display = state
    SetNuiFocus(state, state)
    SendNUIMessage({
        type = 'ui',
        status = state
    })
    
    -- Ha bezárjuk a kijelzőt, ne állítsuk le a lejátszást, hogy a háttérben folytatódhasson
    -- A lejátszás a háttérben folytatódik, akár YouTube, akár rádió
    -- Nem kell semmit tennünk, mert a NUI callback-ben kezelődik a keepPlaying
end

-- Kilépés az ESC gombbal
CreateThread(function()
    while true do
        Wait(0)
        if display then
            DisableControlAction(0, 1, display) -- Egér mozgatás
            DisableControlAction(0, 2, display) -- Egér mozgatás
            DisableControlAction(0, 142, display) -- Jobb klikk
            DisableControlAction(0, 18, display) -- Enter
            DisableControlAction(0, 322, display) -- ESC
            DisableControlAction(0, 106, display) -- VehicleMouseControlOverride
            
            if IsControlJustReleased(0, 322) then -- ESC gomb
                ToggleDisplay(false)
            end
        end
    end
end)

-- Valós idejű adatok küldése a UI-nak
CreateThread(function()
    local lastDataUpdate = 0
    
    while true do
        Wait(100) -- Gyakrabban frissítjük a jobb válaszkészség érdekében
        
        -- Ha a CarPlay meg van jelenítve
        if display then
            local currentTime = GetGameTimer()
            
            -- Csak akkor frissítjük, ha eltelt legalább 500ms az utolsó frissítés óta
            if currentTime - lastDataUpdate > 500 then
                lastDataUpdate = currentTime
                
                -- Valós idejű adatok küldése a UI-nak
                local playerPed = PlayerPedId()
                local vehicle = GetVehiclePedIsIn(playerPed, false)
                
                if vehicle ~= 0 then
                    -- Járműadatok lekérése
                    local speed = GetEntitySpeed(vehicle) * 3.6 -- km/h-ban
                    local fuel = GetVehicleFuelLevel(vehicle)
                    local engineHealth = GetVehicleEngineHealth(vehicle)
                    
                    -- Külön-külön lekérés helyett egy adatcsomagban küldjük
                    SendNUIMessage({
                        type = 'vehicleData',
                        data = {
                            speed = math.floor(speed),
                            fuel = math.floor(fuel),
                            engineHealth = math.floor(engineHealth / 10)
                        }
                    })
                end
            end
        end
    end
end)

-- Autóba való beszállás figyelése (automatikus CarPlay indítás kikapcsolva)
CreateThread(function()
    local wasInVehicle = false
    
    while true do
        Wait(500)
        local playerPed = PlayerPedId()
        local isInVehicle = IsPedInAnyVehicle(playerPed, false)
        
        -- Ha a játékos most szállt be az autóba
        if not wasInVehicle and isInVehicle then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            -- Ellenőrizzük, hogy érvényes jármű
            if vehicle ~= 0 and GetPedInVehicleSeat(vehicle, -1) == playerPed then
                -- Várakozás a beszállás animáció befejezésére
                Wait(1200)
                -- Automatikus megjelenítés kikapcsolva
                -- A játékosnak manuálisan kell elindítania a CarPlay-t a /carplay paranccsal
            end
        end
        
        -- Ha a játékos autóban volt, de most már nincs
        if wasInVehicle and not isInVehicle then
            -- Leállítjuk a lejátszást ha van aktív média
            if isPlaying then
                SendNUIMessage({
                    type = 'stop'
                })
                isPlaying = false
                currentMedia = nil
                ESX.ShowNotification('Lejátszás leállítva (kiszálltál a járműből)')
            end
            
            -- Bezárjuk a CarPlay felületet
            if display then
                -- Először kikapcsoljuk a valós idejű adatküldést
                SendNUIMessage({
                    type = 'realtime',
                    enabled = false
                })
                
                -- Majd bezárjuk a felületet
                Wait(100)
                display = false
                SetNuiFocus(false, false)
                SendNUIMessage({
                    type = 'ui',
                    status = false
                })
                ESX.ShowNotification('CarPlay bezárva (kiszálltál a járműből)')
            end
        end
        
        wasInVehicle = isInVehicle
    end
end)