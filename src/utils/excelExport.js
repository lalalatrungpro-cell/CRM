// Utility to export array of objects to Excel-compatible CSV with UTF-8 BOM

export const exportToExcel = (data, filename = 'Bao_Cao', sheetName = 'Sheet1') => {
  if (!data || !data.length) {
    alert('Không có dữ liệu để xuất file Excel!');
    return;
  }

  // Extract column headers from first object
  const keys = Object.keys(data[0]);

  let csvContent = '\uFEFF'; // Add UTF-8 BOM so Excel opens Vietnamese characters correctly!
  csvContent += keys.map(k => '"' + String(k).replace(/"/g, '""') + '"').join(',') + '\r\n';

  data.forEach(item => {
    const row = keys.map(key => {
      let val = item[key] !== undefined && item[key] !== null ? String(item[key]) : '';
      val = val.replace(/"/g, '""');
      return '"' + val + '"';
    });
    csvContent += row.join(',') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
