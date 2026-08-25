(function() {
        "use strict";

        var i18n = window.KEYGEN_I18N || {};
        function tr(key, fallback) { return i18n[key] || fallback; }

        var lengthInput = document.getElementById('lengthInput');
        var countInput = document.getElementById('countInput');
        var bitHint = document.getElementById('bitHint');
        var strengthBadge = document.getElementById('strengthBadge');
        var lengthError = document.getElementById('lengthError');
        var countError = document.getElementById('countError');
        var presetChips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
        var segButtons = Array.prototype.slice.call(document.querySelectorAll('#formatSeg button'));
        var docCards = Array.prototype.slice.call(document.querySelectorAll('.doc-card'));
        var generateBtn = document.getElementById('generateBtn');
        var keyList = document.getElementById('keyList');
        var emptyState = document.getElementById('emptyState');
        var copyAllBtn = document.getElementById('copyAllBtn');
        var downloadTxtBtn = document.getElementById('downloadTxtBtn');
        var downloadBinBtn = document.getElementById('downloadBinBtn');
        var entropyStrip = document.getElementById('entropyStrip');
        var cryptoError = document.getElementById('cryptoError');

        var currentFormat = 'hex';
        var lastRawKeys = [];
        var lastEncodedKeys = [];

        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var cryptoAvailable = !!(window.crypto && window.crypto.getRandomValues);
        if (!cryptoAvailable) {
            cryptoError.classList.add('show');
            generateBtn.disabled = true;
            entropyStrip.textContent = tr('unavailable', 'Unavailable');
        }

        function bytesToHex(bytes) {
            var out = '';
            for (var i = 0; i < bytes.length; i++) { out += bytes[i].toString(16).padStart(2, '0'); }
            return out;
        }

        function bytesToBase64(bytes) {
            var binary = '';
            for (var i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
            return btoa(binary);
        }

        function bytesToBase64Url(bytes) {
            return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        function bytesToBase32(bytes) {
            var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            var bits = 0,
                value = 0,
                output = '';
            for (var i = 0; i < bytes.length; i++) {
                value = (value << 8) | bytes[i];
                bits += 8;
                while (bits >= 5) {
                    output += alphabet[(value >>> (bits - 5)) & 31];
                    bits -= 5;
                }
            }
            if (bits > 0) { output += alphabet[(value << (5 - bits)) & 31]; }
            return output;
        }

        function encode(bytes, fmt) {
            switch (fmt) {
                case 'hex':
                    return bytesToHex(bytes);
                case 'base64':
                    return bytesToBase64(bytes);
                case 'base64url':
                    return bytesToBase64Url(bytes);
                case 'base32':
                    return bytesToBase32(bytes);
                default:
                    return bytesToHex(bytes);
            }
        }

        function generateBytes(len) {
            var arr = new Uint8Array(len);
            crypto.getRandomValues(arr);
            return arr;
        }

        function debounce(fn, delay) {
            var t;
            return function() {
                var args = arguments,
                    ctx = this;
                clearTimeout(t);
                t = setTimeout(function() { fn.apply(ctx, args); }, delay);
            };
        }

        function parseLength(raw) {
            if (String(raw).trim() === '') return { ok: false, msg: tr('input_length', 'Enter the byte length') };
            var n = Number(raw);
            if (!Number.isInteger(n)) return { ok: false, msg: tr('integer_required', 'Enter an integer') };
            if (n < 1 || n > 1024) return { ok: false, msg: tr('length_range', 'Range: 1–1024 bytes') };
            return { ok: true, num: n };
        }

        function parseCount(raw) {
            if (String(raw).trim() === '') return { ok: false, msg: tr('input_count', 'Enter the number of keys') };
            var n = Number(raw);
            if (!Number.isInteger(n)) return { ok: false, msg: tr('integer_required', 'Enter an integer') };
            if (n < 1 || n > 50) return { ok: false, msg: tr('count_range', 'Range: 1–50 keys') };
            return { ok: true, num: n };
        }

        function clampInt(v, min, max) {
            var n = parseInt(v, 10);
            if (isNaN(n)) n = min;
            return Math.min(max, Math.max(min, n));
        }

        var aesHints = { 16: ' · AES-128', 24: ' · AES-192', 32: ' · AES-256', 64: ' · ' + tr('signing_length', 'Common signing/HMAC length') };

        function updateDerivedHints() {
            var res = parseLength(lengthInput.value);
            var len = res.ok ? res.num : clampInt(lengthInput.value, 1, 1024);
            var bits = len * 8;
            bitHint.textContent = bits + ' ' + tr('bits', 'bits') + (aesHints[len] || '');
            var tier = bits < 64 ? 'low' : bits < 128 ? 'mid' : bits < 256 ? 'high' : 'vhigh';
            var tierLabel = { low: tr('strength_low', 'Low strength'), mid: tr('strength_mid', 'Medium strength'), high: tr('strength_high', 'High strength'), vhigh: tr('strength_vhigh', 'Very high strength') } [tier];
            strengthBadge.textContent = tierLabel;
            strengthBadge.className = 'strength-badge tier-' + tier;
            presetChips.forEach(function(c) {
                c.classList.toggle('active', parseInt(c.dataset.len, 10) === len);
            });
        }

        var ambientTimer = null;
        var hexGlyphs = '0123456789abcdef';

        function randomGlyphLine(n) {
            var s = '';
            for (var i = 0; i < n; i++) s += hexGlyphs[(Math.random() * 16) | 0];
            return s.replace(/(.{2})/g, '$1 ').trim();
        }

        function startAmbient() {
            if (!cryptoAvailable) return;
            if (reduceMotion) { entropyStrip.textContent = tr('ready', 'Ready') + ' — crypto.getRandomValues()'; return; }
            stopAmbient();
            ambientTimer = setInterval(function() { entropyStrip.textContent = randomGlyphLine(28); }, 110);
        }

        function stopAmbient() {
            if (ambientTimer) { clearInterval(ambientTimer);
                ambientTimer = null; }
        }

        function scrambleInto(el, finalStr, duration) {
            stopAmbient();
            el.classList.add('is-live');
            if (reduceMotion) {
                el.textContent = finalStr;
                el.classList.remove('is-live');
                setTimeout(startAmbient, 900);
                return;
            }
            var start = performance.now();
            var len = finalStr.length;

            function frame(now) {
                var t = Math.min(1, (now - start) / duration);
                var out = '';
                for (var i = 0; i < len; i++) {
                    var lockT = i / len;
                    out += (t > lockT) ? finalStr[i] : hexGlyphs[(Math.random() * 16) | 0];
                }
                el.textContent = out;
                if (t < 1) { requestAnimationFrame(frame); } else {
                    el.textContent = finalStr;
                    el.classList.remove('is-live');
                    setTimeout(startAmbient, 1300);
                }
            }
            requestAnimationFrame(frame);
        }

        function renderKeys(encodedList, animate) {
            keyList.innerHTML = '';
            if (!encodedList.length) {
                keyList.appendChild(emptyState);
                return;
            }
            encodedList.forEach(function(val, idx) {
                var row = document.createElement('div');
                row.className = 'key-row';

                var idxEl = document.createElement('span');
                idxEl.className = 'key-idx';
                idxEl.textContent = '#' + (idx + 1);

                var valEl = document.createElement('span');
                valEl.className = 'key-value';
                valEl.textContent = val;

                var copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.className = 'copy-btn';
                copyBtn.textContent = tr('copy', 'Copy');
                copyBtn.addEventListener('click', function() {
                    copyText(val).then(function() {
                        copyBtn.textContent = tr('copied', 'Copied');
                        copyBtn.classList.add('copied');
                        setTimeout(function() { copyBtn.textContent = tr('copy', 'Copy');
                            copyBtn.classList.remove('copied'); }, 1200);
                    });
                });

                row.appendChild(idxEl);
                row.appendChild(valEl);
                row.appendChild(copyBtn);
                keyList.appendChild(row);
            });

            copyAllBtn.disabled = false;
            downloadTxtBtn.disabled = false;
            downloadBinBtn.disabled = false;

            var strip = encodedList[0] ? encodedList[0].slice(0, 32) : '';
            if (strip && animate) {
                scrambleInto(entropyStrip, strip.length < 20 ? strip.padEnd(20, '·') : strip, 650);
            }
        }

        function copyText(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text);
            }
            return new Promise(function(resolve) {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                resolve();
            });
        }

        function doGenerate() {
            if (!cryptoAvailable) return;
            var lenRes = parseLength(lengthInput.value);
            var cntRes = parseCount(countInput.value);
            lengthError.textContent = lenRes.ok ? '' : lenRes.msg;
            countError.textContent = cntRes.ok ? '' : cntRes.msg;
            if (!lenRes.ok || !cntRes.ok) return;

            lastRawKeys = [];
            for (var i = 0; i < cntRes.num; i++) { lastRawKeys.push(generateBytes(lenRes.num)); }
            lastEncodedKeys = lastRawKeys.map(function(b) { return encode(b, currentFormat); });
            renderKeys(lastEncodedKeys, true);
        }
        var debouncedGenerate = debounce(doGenerate, 350);

        function setActiveDocCard(fmt) {
            docCards.forEach(function(c) { c.classList.toggle('active', c.dataset.fmt === fmt); });
        }

        lengthInput.addEventListener('input', function() {
            updateDerivedHints();
            var res = parseLength(lengthInput.value);
            lengthError.textContent = res.ok ? '' : res.msg;
            if (res.ok) debouncedGenerate();
        });
        lengthInput.addEventListener('change', function() {
            lengthInput.value = clampInt(lengthInput.value, 1, 1024);
            updateDerivedHints();
            doGenerate();
        });
        document.querySelectorAll('[data-step]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var step = parseInt(btn.dataset.step, 10);
                lengthInput.value = clampInt(parseInt(lengthInput.value, 10) + step, 1, 1024);
                updateDerivedHints();
                doGenerate();
            });
        });
        presetChips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                lengthInput.value = chip.dataset.len;
                updateDerivedHints();
                doGenerate();
            });
        });

        countInput.addEventListener('input', function() {
            var res = parseCount(countInput.value);
            countError.textContent = res.ok ? '' : res.msg;
            if (res.ok) debouncedGenerate();
        });
        countInput.addEventListener('change', function() {
            countInput.value = clampInt(countInput.value, 1, 50);
            doGenerate();
        });
        document.querySelectorAll('[data-count-step]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var step = parseInt(btn.dataset.countStep, 10);
                countInput.value = clampInt(parseInt(countInput.value, 10) + step, 1, 50);
                doGenerate();
            });
        });

        segButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                segButtons.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentFormat = btn.dataset.fmt;
                setActiveDocCard(currentFormat);
                if (lastRawKeys.length) {
                    lastEncodedKeys = lastRawKeys.map(function(b) { return encode(b, currentFormat); });
                    renderKeys(lastEncodedKeys, true);
                }
            });
        });

        generateBtn.addEventListener('click', doGenerate);

        copyAllBtn.addEventListener('click', function() {
            if (!lastEncodedKeys.length) return;
            copyText(lastEncodedKeys.join('\n')).then(function() {
                var original = copyAllBtn.textContent;
                copyAllBtn.textContent = tr('copied_all', 'All copied');
                setTimeout(function() { copyAllBtn.textContent = original; }, 1200);
            });
        });

        function triggerDownload(blob, filename) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        }
        downloadTxtBtn.addEventListener('click', function() {
            if (!lastEncodedKeys.length) return;
            var blob = new Blob([lastEncodedKeys.join('\n') + '\n'], { type: 'text/plain' });
            triggerDownload(blob, 'keys_' + currentFormat + '.txt');
        });
        downloadBinBtn.addEventListener('click', function() {
            if (!lastRawKeys.length) return;
            var total = lastRawKeys.reduce(function(sum, b) { return sum + b.length; }, 0);
            var combined = new Uint8Array(total);
            var offset = 0;
            lastRawKeys.forEach(function(b) { combined.set(b, offset);
                offset += b.length; });
            var blob = new Blob([combined], { type: 'application/octet-stream' });
            triggerDownload(blob, 'keys_' + lastRawKeys[0].length + 'bytes_x' + lastRawKeys.length + '.bin');
        });

        updateDerivedHints();
        setActiveDocCard(currentFormat);
        if (cryptoAvailable) { doGenerate(); }
    })();
