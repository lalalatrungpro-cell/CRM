const DB_KEY = 'dropship_crm_local_data';

// === Helpers định dạng ngày chuẩn toàn dự án ===
function _fmtDate(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}
function _fmtDateTime(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${_fmtDate(d)} ${hh}:${mi}`;
}

class LocalDatabase {
    constructor() {
        this.data = JSON.parse(localStorage.getItem(DB_KEY));
        if (!this.data) {
            this.initMockData();
        }
        // Đảm bảo có mảng suppliers nếu DB cũ chưa có
        if (!this.data.suppliers) {
            this.data.suppliers = [
                { id: 'SUP001', name: 'Kho Tổng Zalo (A.Bình)', phone: '0988111222', total_debt: 0 }
            ];
            this.save();
        }
    }

    save() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    }

    initMockData() {
        this.data = {
            customers: [
                { id: 'KH001', name: 'Hoàng Lâm', phone: '0901234567', email: 'lam.hoang@email.com', type: 'Sỉ', total_debt: 2400000, created_at: '2026-01-01', total_spent: 12500000 },
                { id: 'KH002', name: 'Mai Phương', phone: '0987654321', email: 'mai.phuong@email.com', type: 'Lẻ', total_debt: 0, created_at: '2026-02-15', total_spent: 450000 },
                { id: 'KH003', name: 'Tuấn Anh', phone: '0911223344', email: 'tuan.anh@email.com', type: 'CTV', total_debt: 500000, created_at: '2026-03-10', total_spent: 3200000 }
            ],
            suppliers: [
                { id: 'SUP001', name: 'Kho Tổng Zalo (A.Bình)', phone: '0988111222', total_debt: 0 },
                { id: 'SUP002', name: 'Đại lý Netflix', phone: '0977333444', total_debt: 0 }
            ],
            products: [
                { id: 'P001', name: 'Canva Pro (1 Năm)' },
                { id: 'P002', name: 'ChatGPT Plus (1 Tháng)' },
                { id: 'P003', name: 'YouTube Premium (6 Tháng)' }
            ],
            inventory: [
                { id: 'INV001', productId: 'P001', supplierId: 'SUP001', accountInfo: 'acc1@canva.com | pass123', purchasePrice: 50000, expirationDate: '2027-04-20', status: 'Sẵn sàng' },
                { id: 'INV002', productId: 'P002', supplierId: 'SUP001', accountInfo: 'gpt@email.com | pass456', purchasePrice: 200000, expirationDate: '2026-05-20', status: 'Sẵn sàng' },
                { id: 'INV003', productId: 'P001', supplierId: 'SUP001', accountInfo: 'acc2@canva.com | pass123', purchasePrice: 50000, expirationDate: '2027-04-20', status: 'Đã bán', orderId: 'ORD001' }
            ],
            orders: [
                { id: 'ORD001', customerId: 'KH001', inventoryId: 'INV003', sellingPrice: 150000, paidAmount: 150000, date: '2026-04-20' }
            ],
            interactions: []
        };
        this.save();
    }

    // --- CUSTOMER METHODS ---
    getCustomers() { return this.data.customers; }
    getCustomer(id) { return this.data.customers.find(c => c.id === id); }
    addCustomer(cust) {
        cust.id = 'KH' + Math.floor(1000 + Math.random() * 9000);
        cust.total_spent = 0;
        cust.total_debt = 0;
        cust.created_at = _fmtDate(new Date());
        this.data.customers.push(cust);
        this.save();
        return cust;
    }
    updateCustomer(id, data) {
        let index = this.data.customers.findIndex(c => c.id === id);
        if (index !== -1) {
            this.data.customers[index] = { ...this.data.customers[index], ...data };
            this.save();
        }
    }
    payCustomerDebt(customerId, amount) {
        let cust = this.data.customers.find(c => c.id === customerId);
        if(cust) {
            let val = parseInt(amount);
            cust.total_debt -= val;
            if(cust.total_debt < 0) cust.total_debt = 0;
            this.addInteraction({
                customerId: cust.id,
                text: `[Thanh toán] Đã thu ${val.toLocaleString('vi-VN')}₫ tiền nợ.`
            });
            this.save();
        }
    }

    refundCustomer(customerId, amount) {
        let cust = this.data.customers.find(c => c.id === customerId);
        if(cust) {
            let val = parseInt(amount);
            cust.total_spent -= val;
            if(cust.total_spent < 0) cust.total_spent = 0;
            this.addInteraction({
                customerId: cust.id,
                text: `[Hoàn tiền] Đã chuyển hoàn trả ${val.toLocaleString('vi-VN')}₫ cho khách.`
            });
            this.save();
        }
    }

    // --- SUPPLIER METHODS ---
    getSuppliers() { return this.data.suppliers; }
    addSupplier(sup) {
        sup.id = 'SUP' + Math.floor(100 + Math.random() * 900);
        sup.total_debt = 0;
        this.data.suppliers.push(sup);
        this.save();
    }
    deleteSupplier(id) {
        this.data.suppliers = this.data.suppliers.filter(s => s.id !== id);
        this.save();
    }
    paySupplierDebt(supplierId, amount) {
        let sup = this.data.suppliers.find(s => s.id === supplierId);
        if(sup) {
            sup.total_debt -= parseInt(amount);
            if(sup.total_debt < 0) sup.total_debt = 0;
            this.save();
        }
    }

    // --- PRODUCT METHODS ---
    getProducts() { return this.data.products; }
    addProduct(prod) {
        prod.id = 'P' + Math.floor(100 + Math.random() * 900);
        this.data.products.push(prod);
        this.save();
    }
    deleteProduct(id) {
        this.data.products = this.data.products.filter(p => p.id !== id);
        this.save();
    }

    // --- INVENTORY METHODS ---
    getInventory() { return this.data.inventory; }
    addInventory(item) {
        item.id = 'INV' + Math.floor(1000 + Math.random() * 9000);
        item.status = 'Sẵn sàng';
        item.purchaseDate = new Date().toLocaleString('vi-VN');

        // Cộng công nợ cho nhà cung cấp (nếu trả thiếu)
        let sup = this.data.suppliers.find(s => s.id === item.supplierId);
        if(sup) {
            let paid = item.paidAmount !== undefined ? parseInt(item.paidAmount) : parseInt(item.purchasePrice);
            let debt = parseInt(item.purchasePrice) - paid;
            if(debt > 0) sup.total_debt += debt;
        }

        this.data.inventory.push(item);
        this.save();
        return item;
    }
    
    addInventoryBulk(items, totalPaid) {
        if(!items || items.length === 0) return;
        
        let supId = items[0].supplierId;
        let totalCost = items.reduce((sum, item) => sum + parseInt(item.purchasePrice), 0);
        
        // Cộng công nợ tổng cho nhà cung cấp
        let sup = this.data.suppliers.find(s => s.id === supId);
        if(sup) {
            let debt = totalCost - parseInt(totalPaid);
            if(debt > 0) sup.total_debt += debt;
        }

        items.forEach(item => {
            item.id = 'INV' + Math.floor(1000 + Math.random() * 9000);
            item.status = 'Sẵn sàng';
            item.purchaseDate = _fmtDateTime(new Date());
            this.data.inventory.push(item);
        });
        
        this.save();
    }

    deleteInventory(id) {
        this.data.inventory = this.data.inventory.filter(i => i.id !== id);
        this.save();
    }
    
    // Thống kê tồn kho theo sản phẩm
    getInventoryStockSummary() {
        let summary = {};
        this.data.products.forEach(p => summary[p.id] = { name: p.name, count: 0 });
        this.data.inventory.forEach(inv => {
            if (inv.status === 'Sẵn sàng' && summary[inv.productId]) {
                summary[inv.productId].count++;
            }
        });
        return Object.values(summary);
    }

    // --- ORDER METHODS ---
    getOrders() { return this.data.orders; }
    addOrder(order) {
        order.id = 'ORD' + Math.floor(1000 + Math.random() * 9000);
        order.date = _fmtDate(new Date());
        
        // Update Inventory status
        let inv = this.data.inventory.find(i => i.id === order.inventoryId);
        if(inv) {
            inv.status = 'Đã bán';
            inv.orderId = order.id;
        }

        // Update Customer financial
        let cust = this.data.customers.find(c => c.id === order.customerId);
        if(cust) {
            cust.total_spent += parseInt(order.sellingPrice);
            cust.total_debt += (parseInt(order.sellingPrice) - parseInt(order.paidAmount));
        }

        this.data.orders.push(order);
        this.save();
        return order;
    }
    
    deleteOrder(orderId) {
        let orderIndex = this.data.orders.findIndex(o => o.id === orderId);
        if(orderIndex === -1) return;
        let order = this.data.orders[orderIndex];

        // 1. Rollback Inventory
        let inv = this.data.inventory.find(i => i.id === order.inventoryId);
        if(inv) {
            inv.status = 'Sẵn sàng';
            delete inv.orderId;
        }

        // 2. Rollback Customer Finances
        let cust = this.data.customers.find(c => c.id === order.customerId);
        if(cust) {
            let refunded = order.refundedAmount || 0;
            let actualRevenue = parseInt(order.sellingPrice) - refunded;
            
            cust.total_spent -= actualRevenue;
            if(cust.total_spent < 0) cust.total_spent = 0;
            
            let debtFromThisOrder = parseInt(order.sellingPrice) - parseInt(order.paidAmount);
            if(debtFromThisOrder > 0) {
                cust.total_debt -= debtFromThisOrder;
                if(cust.total_debt < 0) cust.total_debt = 0;
            }
            
            this.addInteraction({
                customerId: cust.id,
                text: `[Hệ thống] Đã HỦY đơn hàng ${order.id}. Trả tài khoản về kho và trừ lại số tiền.`
            });
        }

        // 3. Remove the order
        this.data.orders.splice(orderIndex, 1);
        this.save();
    }

    replaceOrderAccount(orderId, newInventoryId) {
        let order = this.data.orders.find(o => o.id === orderId);
        if(!order) return;

        // Mark old inventory as error
        let oldInv = this.data.inventory.find(i => i.id === order.inventoryId);
        if(oldInv) {
            oldInv.status = 'Lỗi (Bảo hành)';
            delete oldInv.orderId;
        }

        // Link new inventory
        let newInv = this.data.inventory.find(i => i.id === newInventoryId);
        if(newInv) {
            newInv.status = 'Đã bán';
            newInv.orderId = order.id;
            order.inventoryId = newInv.id;
        }

        // Log
        let oldInfo = oldInv ? oldInv.accountInfo.split('|')[0] : 'N/A';
        let newInfo = newInv ? newInv.accountInfo.split('|')[0] : 'N/A';
        
        this.addInteraction({
            customerId: order.customerId,
            orderId: order.id,
            text: `[Bảo hành] Đổi T.Khoản: Thu hồi (${oldInfo}) -> Cấp mới (${newInfo}).`
        });

        this.save();
    }

    refundOrder(orderId, amount) {
        let order = this.data.orders.find(o => o.id === orderId);
        if(!order) return;
        
        let val = parseInt(amount);
        if(!order.refundedAmount) order.refundedAmount = 0;
        order.refundedAmount += val;

        let cust = this.data.customers.find(c => c.id === order.customerId);
        if(cust) {
            cust.total_spent -= val;
            if(cust.total_spent < 0) cust.total_spent = 0;

            this.addInteraction({
                customerId: cust.id,
                orderId: order.id,
                text: `[Hoàn tiền] Đã hoàn trả lại số tiền ${val.toLocaleString('vi-VN')}₫ cho đơn hàng này.`
            });
            this.save();
        }
    }

    // --- LOG METHODS ---
    getInteractions(customerId) {
        return this.data.interactions.filter(i => i.customerId === customerId);
    }
    addInteraction(log) {
        log.id = 'LOG' + Math.floor(1000 + Math.random() * 9000);
        log.date = _fmtDateTime(new Date());
        this.data.interactions.push(log);
        this.save();
    }
}

window.db = new LocalDatabase();
