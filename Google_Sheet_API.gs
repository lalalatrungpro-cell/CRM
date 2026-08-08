function doPost(e) {
  var sheetApp = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action; 
    var data = payload.data; 
    
    if (action === 'sync') {
      updateSheet(sheetApp, 'Sản Phẩm', data.products, ['id', 'name', 'costPrice', 'sellPrice', 'duration', 'unit']);
      updateSheet(sheetApp, 'Khách Hàng', data.customers, ['id', 'name', 'phone', 'email', 'type', 'debt']);
      updateSheet(sheetApp, 'Nhà Cung Cấp', data.suppliers, ['id', 'name', 'phone', 'debt']);
      updateSheet(sheetApp, 'Đơn Hàng', data.orders, ['id', 'code', 'date', 'customerName', 'supplierName', 'productName', 'quantity', 'costPrice', 'sellPrice', 'paidAmount', 'status', 'note']);
      updateSheet(sheetApp, 'Dòng Tiền', data.transactions, ['id', 'date', 'type', 'relatedName', 'amount', 'method', 'note']);
      
      return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.message}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

function updateSheet(sheetApp, sheetName, dataArray, columns) {
  var sheet = sheetApp.getSheetByName(sheetName);
  if (!sheet) {
    sheet = sheetApp.insertSheet(sheetName);
    sheet.appendRow(columns);
  } else {
    sheet.clear();
    sheet.appendRow(columns);
  }
  
  if (dataArray && dataArray.length > 0) {
    var rows = dataArray.map(function(item) {
      return columns.map(function(col) {
        var val = item[col];
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return val;
      });
    });
    sheet.getRange(2, 1, rows.length, columns.length).setValues(rows);
  }
}

function doGet(e) {
  var sheetApp = SpreadsheetApp.getActiveSpreadsheet();
  var data = {
    products: getSheetData(sheetApp, 'Sản Phẩm'),
    customers: getSheetData(sheetApp, 'Khách Hàng'),
    suppliers: getSheetData(sheetApp, 'Nhà Cung Cấp'),
    orders: getSheetData(sheetApp, 'Đơn Hàng'),
    transactions: getSheetData(sheetApp, 'Dòng Tiền')
  };
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*');
}

function getSheetData(sheetApp, sheetName) {
  var sheet = sheetApp.getSheetByName(sheetName);
  if (!sheet) return [];
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val === 'TRUE') val = true;
      if (val === 'FALSE') val = false;
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}
