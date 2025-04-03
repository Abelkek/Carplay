document.addEventListener('DOMContentLoaded', function() {
    // Változók inicializálása
    let currentScreen = 'main-menu';
    let isPlaying = false;
    let currentVolume = 0.5;
    let youtubePlayer = null;
    let currentMedia = null;
    let realtimeEnabled = false;
    let vehicleData = {
        speed: 0,
        fuel: 0,
        engineHealth: 0
    };
    
    // YouTube API betöltése
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    // Globális függvény a YouTube API számára
    window.onYouTubeIframeAPIReady = function() {
        youtubePlayer = new YT.Player('youtube-player', {
            height: '180',
            width: '100%',
            videoId: '',
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'disablekb': 1,
                'autoplay': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    };
    
    // Időkijelző frissítése
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        document.querySelector('.time').textContent = `${hours}:${minutes}`;
        
        // Ha van járműadat és a valós idejű üzemmód engedélyezve van
        if (realtimeEnabled && document.getElementById('vehicle-info')) {
            // Biztosítsuk, hogy minden adat látható legyen
            if (vehicleData) {
                document.getElementById('vehicle-speed').textContent = `${vehicleData.speed || 0} km/h`;
                document.getElementById('vehicle-fuel').textContent = `Üzemanyag: ${vehicleData.fuel || 0}%`;
                document.getElementById('vehicle-engine').textContent = `Motor: ${vehicleData.engineHealth || 0}%`;
            }
        }
    }
    
    // Időkijelző indítása - gyakrabban frissítjük a pontosabb megjelenítésért
    setInterval(updateTime, 500);
    updateTime();
    
    // Képernyőváltás kezelése
    function switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden-screen');
            screen.classList.remove('active-screen');
        });
        
        document.getElementById(screenId).classList.remove('hidden-screen');
        document.getElementById(screenId).classList.add('active-screen');
        currentScreen = screenId;
        
        // Ne állítsuk le a médiát képernyőváltáskor, hogy a háttérben folytatódhasson a lejátszás
        // Ez biztosítja, hogy a YouTube videó továbbra is játszódjon, amikor kilépünk a képernyőről
    }
    
    // Eseménykezelők hozzáadása az alkalmazás ikonokhoz
    document.querySelectorAll('.app-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const appId = this.getAttribute('data-app');
            if (appId === 'radio') {
                switchScreen('radio-screen');
                playRadio();
            } else if (appId === 'youtube') {
                switchScreen('youtube-screen');
            }
        });
    });
    
    // Főmenü vissza gomb kezelése
    const mainBackBtn = document.getElementById('main-back-btn');
    if (mainBackBtn) {
        mainBackBtn.addEventListener('click', function() {
            closeCarPlay();
        });
    }
    
    // Vissza gombok kezelése
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Visszalépés a főmenübe - a YouTube és a rádió lejátszása folytatódik a háttérben
            console.log('Vissza gomb megnyomva');
            switchScreen('main-menu');
            
            // Biztosítsuk, hogy a YouTube videó továbbra is játszódjon a háttérben
            if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function' && 
                youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING) {
                isPlaying = true;
            }
        });
    });
    
    // Bezárás gomb kezelése
    document.querySelector('.close-btn').addEventListener('click', function() {
        closeCarPlay();
    });
    
    // Rádió lejátszás
    function playRadio() {
        // Ha YouTube fut, állítsuk le
        if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function' && 
            (youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING || 
             youtubePlayer.getPlayerState() === YT.PlayerState.BUFFERING)) {
            youtubePlayer.stopVideo();
            console.log('YouTube lejátszás leállítva rádió indításakor');
        }
        
        const radioPlayer = document.getElementById('radio-player');
        radioPlayer.src = 'https://icast.connectmedia.hu/4738/mr2.mp3'; // Petőfi Rádió stream
        radioPlayer.volume = currentVolume;
        radioPlayer.play()
            .then(() => {
                console.log('Rádió lejátszás elindult');
                isPlaying = true;
                currentMedia = 'radio';
                
                // Értesítsük a játékot a lejátszásról
                fetch('https://Carplay/radio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        playing: true
                    })
                });
            })
            .catch(error => {
                console.error('Hiba a rádió lejátszásakor:', error);
            });
        
        // Frissítsük a lejátszás állapotát jelző elemeket
        document.querySelector('.station-name').textContent = 'Petőfi Rádió';
        document.querySelector('.station-frequency').textContent = '94.8 MHz';
    }
    
    // YouTube videó lejátszása kezelő függvények
    
    function onPlayerReady(event) {
        event.target.setVolume(currentVolume * 100);
    }
    
    function onPlayerStateChange(event) {
        if (event.data == YT.PlayerState.ENDED) {
            isPlaying = false;
        } else if (event.data == YT.PlayerState.PLAYING) {
            isPlaying = true;
        }
    }
    
    // YouTube link feldolgozása
    document.getElementById('youtube-submit').addEventListener('click', function() {
        const link = document.getElementById('youtube-link').value;
        if (link) {
            playYouTubeVideo(link);
        }
    });
    
    // Új, javított YouTube videó lejátszás
    function playYouTubeVideo(link) {
        // Ha rádió fut, állítsuk le
        const radioPlayer = document.getElementById('radio-player');
        if (!radioPlayer.paused) {
            radioPlayer.pause();
            radioPlayer.currentTime = 0;
            console.log('Rádió lejátszás leállítva YouTube indításakor');
        }
        
        const videoId = extractVideoID(link);
        if (videoId && youtubePlayer) {
            console.log('YouTube videó betöltése ID-val:', videoId);
            
            // Biztosítsuk, hogy a videó betöltődik és elindul
            youtubePlayer.loadVideoById({
                videoId: videoId,
                suggestedQuality: 'small'
            });
            
            // Explicit módon indítsuk el a videót és állítsuk be a hangerőt
            setTimeout(() => {
                youtubePlayer.playVideo();
                youtubePlayer.setVolume(currentVolume * 100);
                isPlaying = true;
                currentMedia = 'youtube';
            }, 500);
            
            // Küldjük el az információt a játéknak
            fetch('https://Carplay/youtube', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    videoId: videoId,
                    playing: true
                })
            });
        } else {
            console.error('Érvénytelen YouTube link vagy videó ID:', link);
        }
    }
    
    // YouTube videó ID kinyerése a linkből
    function extractVideoID(url) {
        // Különböző YouTube URL formátumok kezelése
        let regExp = /^.*((youtu.be\/)|(v\/)|(\/(u\/\w\/))|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        let match = url.match(regExp);
        
        if (match && match[7].length == 11) {
            return match[7];
        }
        
        // Próbáljunk meg más formátumokat is
        regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        match = url.match(regExp);
        
        return (match && match[1]) ? match[1] : false;
    }
    
    // Média leállítása
    function stopMedia() {
        // Ha a rádió képernyőn vagyunk, ne állítsuk le a rádiót
        if (currentScreen !== 'radio-screen') {
            const radioPlayer = document.getElementById('radio-player');
            radioPlayer.pause();
            radioPlayer.currentTime = 0;
        }
        
        // Ha a YouTube képernyőn vagyunk, csak akkor állítsuk le a YouTube videót
        if (currentScreen === 'youtube-screen') {
            if (youtubePlayer && typeof youtubePlayer.stopVideo === 'function') {
                youtubePlayer.stopVideo();
                isPlaying = false;
            }
        }
        
        // Csak akkor állítsuk le a lejátszást, ha nem a rádió képernyőn vagyunk
        if (currentScreen !== 'radio-screen') {
            // Értesítsük a játékot a leállításról
            fetch('https://Carplay/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
        }
    }
    
    // Hangerő szabályozás
    document.querySelectorAll('.volume-slider').forEach(slider => {
        slider.value = currentVolume * 100;
        slider.addEventListener('input', function() {
            currentVolume = this.value / 100;
            
            // Frissítsük a hangerőt mindkét lejátszón
            const radioPlayer = document.getElementById('radio-player');
            radioPlayer.volume = currentVolume;
            
            if (youtubePlayer && typeof youtubePlayer.setVolume === 'function') {
                youtubePlayer.setVolume(currentVolume * 100);
            }
            
            // Küldjük el a hangerő értékét a játéknak
            fetch('https://Carplay/volume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    volume: currentVolume
                })
            });
        });
    });
    
    // Lejátszás vezérlő gombok
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            
            if (action === 'play') {
                if (currentScreen === 'radio-screen') {
                    // Ha YouTube fut, állítsuk le
                    if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function' && 
                        (youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING || 
                         youtubePlayer.getPlayerState() === YT.PlayerState.BUFFERING)) {
                        youtubePlayer.stopVideo();
                        console.log('YouTube lejátszás leállítva rádió indításakor');
                    }
                    playRadio();
                } else if (currentScreen === 'youtube-screen' && youtubePlayer) {
                    // Ha rádió fut, állítsuk le
                    const radioPlayer = document.getElementById('radio-player');
                    if (!radioPlayer.paused) {
                        radioPlayer.pause();
                        radioPlayer.currentTime = 0;
                        console.log('Rádió lejátszás leállítva YouTube indításakor');
                    }
                    youtubePlayer.playVideo();
                    isPlaying = true;
                    currentMedia = 'youtube';
                }
            } else if (action === 'pause') {
                if (currentScreen === 'radio-screen') {
                    document.getElementById('radio-player').pause();
                    isPlaying = false;
                } else if (currentScreen === 'youtube-screen' && youtubePlayer) {
                    youtubePlayer.pauseVideo();
                    isPlaying = false;
                }
            } else if (action === 'stop') {
                stopMedia();
            }
        });
    });
    
    // CarPlay bezárása
    function closeCarPlay() {
        // Ellenőrizzük, hogy van-e aktív lejátszás
        const isYouTubePlaying = youtubePlayer && 
            typeof youtubePlayer.getPlayerState === 'function' && 
            (youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING || 
             youtubePlayer.getPlayerState() === YT.PlayerState.BUFFERING);
            
        const isRadioPlaying = document.getElementById('radio-player') && 
            !document.getElementById('radio-player').paused;
        
        // Explicit módon állítsuk be, hogy a háttérben folytatódjon a lejátszás
        const keepPlaying = isYouTubePlaying || isRadioPlaying;
        
        console.log('CarPlay bezárása, lejátszás állapota:', {
            keepPlaying: keepPlaying,
            youTubePlaying: isYouTubePlaying,
            radioPlaying: isRadioPlaying
        });
        
        fetch('https://Carplay/close', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                keepPlaying: keepPlaying,
                youTubePlaying: isYouTubePlaying,
                radioPlaying: isRadioPlaying
            })
        });
    }
    
    // NUI üzenetek kezelése
    window.addEventListener('message', function(event) {
        const data = event.data;
        
        if (data.type === 'ui') {
            if (data.status) {
                document.getElementById('carplay-container').classList.add('active');
                // Azonnal frissítsük az időt
                updateTime();
                console.log('CarPlay UI megjelenítve');
            } else {
                document.getElementById('carplay-container').classList.remove('active');
                // Ne állítsuk le a médiát, amikor bezárjuk a felületet
                console.log('CarPlay UI elrejtve');
            }
        } else if (data.type === 'realtime') {
            console.log('Valós idejű mód:', data.enabled ? 'bekapcsolva' : 'kikapcsolva');
            realtimeEnabled = data.enabled;
            
            // Ha engedélyezve van a valós idejű mód, adjunk hozzá járműadatokat
            if (realtimeEnabled && !document.getElementById('vehicle-info')) {
                addVehicleInfo();
            } else if (!realtimeEnabled && document.getElementById('vehicle-info')) {
                document.getElementById('vehicle-info').remove();
            }
        } else if (data.type === 'vehicleData') {
            // Frissítsük a járműadatokat az új struktúra szerint
            if (data.data) {
                vehicleData = data.data;
                // Nem kell itt meghívni az updateTime-ot, mert az intervallum már elég gyakran frissíti
            }
        } else if (data.type === 'radio') {
            if (data.action === 'play') {
                // Ha YouTube fut, állítsuk le
                if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function' && 
                    (youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING || 
                     youtubePlayer.getPlayerState() === YT.PlayerState.BUFFERING)) {
                    youtubePlayer.stopVideo();
                    console.log('YouTube lejátszás leállítva rádió indításakor (NUI)');
                }
                switchScreen('radio-screen');
                playRadio();
            }
        } else if (data.type === 'youtube') {
            if (data.link) {
                // Ha rádió fut, állítsuk le
                const radioPlayer = document.getElementById('radio-player');
                if (!radioPlayer.paused) {
                    radioPlayer.pause();
                    radioPlayer.currentTime = 0;
                    console.log('Rádió lejátszás leállítva YouTube indításakor (NUI)');
                }
                switchScreen('youtube-screen');
                document.getElementById('youtube-link').value = data.link;
                // Közvetlenül hívjuk meg a YouTube lejátszást
                playYouTubeVideo(data.link);
            }
        } else if (data.type === 'stop') {
            // Állítsuk le mind a YouTube-ot, mind a rádiót, függetlenül attól, melyik képernyőn vagyunk
            const radioPlayer = document.getElementById('radio-player');
            radioPlayer.pause();
            radioPlayer.currentTime = 0;
            
            if (youtubePlayer && typeof youtubePlayer.stopVideo === 'function') {
                youtubePlayer.stopVideo();
            }
            
            isPlaying = false;
            
            // Értesítsük a játékot a leállításról
            fetch('https://Carplay/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
        } else if (data.type === 'volume') {
            if (data.value !== undefined) {
                currentVolume = data.value;
                document.querySelectorAll('.volume-slider').forEach(slider => {
                    slider.value = currentVolume * 100;
                });
                
                const radioPlayer = document.getElementById('radio-player');
                radioPlayer.volume = currentVolume;
                
                if (youtubePlayer && typeof youtubePlayer.setVolume === 'function') {
                    youtubePlayer.setVolume(currentVolume * 100);
                }
            }
        }
    });
    
    // Jármű információs panel hozzáadása
    function addVehicleInfo() {
        if (document.getElementById('vehicle-info')) return;
        
        const vehicleInfo = document.createElement('div');
        vehicleInfo.id = 'vehicle-info';
        vehicleInfo.innerHTML = `
            <div id="vehicle-speed">0 km/h</div>
            <div id="vehicle-fuel">Üzemanyag: 0%</div>
            <div id="vehicle-engine">Motor: 0%</div>
        `;
        
        document.getElementById('carplay-header').appendChild(vehicleInfo);
        console.log('Jármű információs panel hozzáadva');
    }
    
    // Inicializálás
    switchScreen('main-menu');
});

// YouTube API callback
function onYouTubeIframeAPIReady() {
    // Ez a függvény automatikusan meghívódik, amikor a YouTube API betöltődik
    // A tényleges inicializálás a DOMContentLoaded eseménykezelőben történik
}