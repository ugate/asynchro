window.addEventListener('load', function loadVersions(event) {
  var sel = document.querySelector('#versions');
  if (!sel) return;
  var req = new XMLHttpRequest();
  req.overrideMimeType('application/json');
  req.open('GET', sel.dataset.jsonUrl, true);
  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status !== '200') return console.warn(req.status + ' (' + req.statusText + '): Unable to capture ' + sel.dataset.jsonUrl);
      var vrs = JSON.parse(req.responseText);
      var i = vrs.length;
      while (i-- >= 0) { // add in reverse order
        opt = document.createElement('option');
        opt.setAttribute('value', vrs[i]);
        opt.appendChild(document.createTextNode(vrs[i]));
        sel.appendChild(opt);
      }
    }
  };
  req.send(null);
});
