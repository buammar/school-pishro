// جایگزین google.script.run با fetch (همراه توکن نشست) تا کد صفحه بدون تغییر کار کند.
(function () {
  var KEY = 'pp2_session';
  window.__tok = '';
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.data && s.data.token) window.__tok = s.data.token; } catch (e) {}

  function expire() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    window.__tok = '';
    alert('نشست شما منقضی شده است؛ لطفاً دوباره وارد شوید.');
    location.reload();
  }

  function call(fn, args, onOk, onFail) {
    if (!window.API_URL || window.API_URL.indexOf('PASTE_YOUR') === 0) {
      if (onFail) onFail(new Error('آدرس سرور در config.js تنظیم نشده است.'));
      return;
    }
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var ms = fn === 'generateRealAbsencePdf' ? 150000 : 60000;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms) : null;
    var payload = JSON.stringify({ fn: fn, args: args, t: window.__tok });

    fetch(window.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // بدون preflight
      body: payload,
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (res && res.ok) {
          if (fn === 'authenticateUser' && res.data && res.data.loggedIn && res.data.token) {
            window.__tok = res.data.token;
            try { localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data: res.data })); } catch (e) {}
          }
          if (onOk) onOk(res.data);
        } else if (res && res.code === 'AUTH' && fn !== 'ping') {
          expire();
        } else if (onFail) {
          onFail(new Error((res && res.error) || 'خطای ناشناخته از سرور'));
        }
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        var msg = err && err.name === 'AbortError'
          ? 'پاسخ سرور طول کشید؛ اینترنت را بررسی و دوباره تلاش کنید.'
          : 'ارتباط با سرور برقرار نشد؛ اینترنت را بررسی کنید.';
        if (onFail) onFail(new Error(msg));
      });
  }

  function makeRunner(ok, fail) {
    return new Proxy({}, {
      get: function (_t, prop) {
        if (prop === 'withSuccessHandler') return function (f) { return makeRunner(f, fail); };
        if (prop === 'withFailureHandler') return function (f) { return makeRunner(ok, f); };
        return function () { call(String(prop), Array.prototype.slice.call(arguments), ok, fail); };
      }
    });
  }
  window.google = window.google || {};
  window.google.script = { run: makeRunner(null, null) };
})();
