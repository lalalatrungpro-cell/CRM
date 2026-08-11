const fs = require('fs');

function dateToPrefix(dateVal) {
  if (!dateVal) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }
  let d = null;
  if (typeof dateVal === 'number') {
    d = new Date((dateVal - 25569) * 86400 * 1000);
  } else if (typeof dateVal === 'string') {
    dateVal = dateVal.trim();
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-').map(s => s.trim());
      if (parts[0].length === 4) {
        d = new Date(dateVal);
      } else if (parts[0].includes('/')) {
        const dParts = parts[0].split('/');
        if (dParts.length === 3) {
          const yr = dParts[2].length === 4 ? dParts[2] : '20' + dParts[2];
          d = new Date(`${yr}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`);
        }
      }
    } else if (dateVal.includes('/')) {
      const dParts = dateVal.split('/');
      if (dParts.length === 3) {
        const yr = dParts[2].length === 4 ? dParts[2] : '20' + dParts[2];
        d = new Date(`${yr}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`);
      }
    }
  }

  if (!d || isNaN(d.getTime())) {
    d = new Date();
  }

  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

console.log('Migration helper compiled cleanly.');
