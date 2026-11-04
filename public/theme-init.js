/**
 * Se ejecuta antes de React (script clásico en <head>) para aplicar el tema
 * guardado y evitar el destello de modo oscuro al iniciar en modo claro.
 */
(function () {
  try {
    var tema = window.localStorage.getItem('estudiosmedicos.tema');
    var oscuro = tema !== 'light';
    document.documentElement.classList.toggle('dark', oscuro);
    document.documentElement.dataset.tema = oscuro ? 'dark' : 'light';
  } catch (error) {
    document.documentElement.classList.add('dark');
  }
})();
