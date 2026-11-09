// Runs before first paint: apply the saved theme to avoid a flash.
(function () {
  try {
    var t = localStorage.getItem('inr-theme');
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* storage unavailable */ }
  document.documentElement.classList.add('js');
})();
