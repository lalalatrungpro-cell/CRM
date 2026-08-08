# Quy Tac Code Bat Buoc - CRM Dropship

## QUY TAC 1: LUON GHI FILE UTF-8 KHONG BOM

KHONG DUOC dung Out-File hay Set-Content -Encoding UTF8 trong PowerShell.
PowerShell 5.x tu dong them BOM lam vo encoding tieng Viet thanh mojibake.

DUNG .NET API:
  \ = New-Object System.Text.UTF8Encoding \False
  [System.IO.File]::WriteAllText("path", content, \)

Hoac Node.js:
  fs.writeFileSync(path, content, 'utf8')

## QUY TAC 2: LUON DUNG REACT PORTAL CHO MODAL

KHONG dat position:fixed modal trong component con co CSS transform tren cha.
LUON dung createPortal vao document.body:

  import { createPortal } from 'react-dom';
  {showModal && createPortal(<div className="global-modal-overlay">...</div>, document.body)}

CSS global-modal-overlay: position:fixed; inset:0; width:100vw; height:100vh; z-index:99999

## QUY TAC 3: KHONG STRING REPLACE FILE TIENG VIET KHI MOJIBAKE

Khi thay file co dau hieu mojibake (ðŸ, Ná»£, ÄÃ£) - PHAI VIET LAI TOAN BO FILE.
String replace se khong khop va bi bo qua khong bao loi.

## QUY TAC 4: KIEM TRA BOM TRUOC KHI SUA FILE

  \ = [System.IO.File]::ReadAllBytes("file.jsx")
  if (\[0] -eq 0xEF) { Write-Host "CO BOM - viet lai file" }

## QUY TAC 5: STORAGE.JS - DU LIEU MAU

Orders mau PHAI co customerId trung voi id trong customers.
Khach co debt > 0 PHAI co order status: 'No' hoac code fallback synthetic item.

## QUY TAC 6: MODAL CSS CLASS CHUAN DU AN

global-modal-overlay: overlay toan man hinh z-index 99999
global-modal-card: khung modal max-width 480-640px border-radius 16px
Da dinh nghia trong src/index.css - khong override bang inline style.

## QUY TAC 7: CHAY BUILD SAU MOI THAY DOI LON

  npm run build

Neu build loi - sua ngay, khong de loi tich luy.