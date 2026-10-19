const input = document.getElementById('server-url');
const message = document.getElementById('connection-error');
const save = document.getElementById('save-server');
let initial;
window.cimaConnection.read().then(settings => { initial = settings; input.value = settings.url; input.focus(); }).catch(() => { message.textContent = 'Impossible de lire la configuration.'; message.hidden = false; });
document.getElementById('default-server').addEventListener('click', () => { if (initial) input.value = initial.defaultUrl; });
document.getElementById('connection-form').addEventListener('submit', async event => {
  event.preventDefault(); save.disabled = true; message.hidden = true;
  try {
    const result = await window.cimaConnection.save(input.value);
    if (!result.ok) { message.textContent = result.error; message.hidden = false; }
  } catch { message.textContent = 'Impossible d’enregistrer la configuration.'; message.hidden = false; }
  finally { save.disabled = false; }
});
