'use strict';

var currency = require('./currency');
var $$ = currency.newNumber;
var InvoiceContactInfo = require('./contactInfo');
var InvoiceTotals = require('./totals');

var ZERO = $$(0);
var ONE = $$(1);

var Invoice = function (currencyOrDetails) {
    if (!currencyOrDetails || typeof(currencyOrDetails) === 'string') {
        this.initWithCurrency(currencyOrDetails);
    } else {
        this.initWithDetails(currencyOrDetails);
    }
};

Invoice.STATUS = {
    CANCELLED: 'cancelled',
    CANCELED: 'cancelled',
    DRAFT: 'draft',
    PAYMENT_PENDING: 'payment_pending'
};

Invoice.Number = currency.newNumber;

Invoice.Item = function (quantity, unitPrice, itemId, detailId) {
    if (!quantity) {
        throw new Error('You must specify a quantity when adding an item.');
    }
    this.quantity = $$(quantity);
    this.unitPrice = $$(unitPrice||0);
    this.itemId = itemId;
    this.detailId = detailId || null;
    // Other properties: name, description, imageUrl, taxRate, taxName
    // Not sure how to tell WebStorm/JS about these w/o making them null and showing up in JSON unnecessarily
};

Invoice.Item.prototype = {
    totalForInvoice: function (inv) {
        var itemPrice = this.quantity.times(this.unitPrice || ZERO);
        if (this.discountPercentage) {
            var discount = currency.round(inv.currencyCode, itemPrice.times(this.discountPercentage));
            itemPrice = itemPrice.minus(discount);
        } else if (this.discountAmount) {
            itemPrice = itemPrice.minus(this.discountAmount);
        }
        return currency.round(inv.currencyCode, itemPrice);
    }
};

Invoice.prototype = {
    initWithCurrency: function (currencyCode) {
        this.currencyCode = currencyCode || 'USD';
        if (!currency.isSupported(this.currencyCode)) {
            throw new Error('Unsupported currency: ' + this.currencyCode);
        }
        this.payerEmail = 'noreply@here.paypal.com';
        this.paymentTerms = 'DueOnReceipt';

        this.taxInclusive = false;
        this.taxCalculatedAfterDiscount = true;

        this.merchantInfo = new InvoiceContactInfo();
        this.billingInfo = new InvoiceContactInfo();
        this.shippingInfo = new InvoiceContactInfo();

        this.items = [];
        this.status = Invoice.STATUS.DRAFT;
    },
    initWithDetails: function (json) {
        this.currencyCode = json.currencyCode;
        if(!currency.isSupported(this.currencyCode)) {
            throw new Error('Unsupported currency: ' + this.currencyCode);
        }

        this.taxInclusive = json.taxInclusive ? true : false;
        this.taxCalculatedAfterDiscount = json.taxCalculatedAfterDiscount ? true : false;

        var t = this;
        'status payerEmail number invoiceId paymentTerms referrerCode receiptDetails merchantMemo shippingAmount shippingTaxName customAmountName customAmountValue discountAmount discountPercentage gratuityAmount'
            .split(' ').forEach(function (p) {
            if (json[p]) {
                t[p] = json[p];
            }
        });
        if (json.shippingTaxRate) {
            this.shippingTaxRate = $$($$(json.shippingTaxRate).dividedBy(100));
        }
        this.readMetadata(json);
        this.readItems(json.items);
    },
    readMetadata: function (json) {
        this.merchantInfo = new InvoiceContactInfo(json.merchantInfo);
        this.billingInfo = new InvoiceContactInfo();
        this.shippingInfo = new InvoiceContactInfo();
    },
    readItems: function (itemsJson) {
        this.items = [];
        var items = this.items;
        if (itemsJson) {
            itemsJson.forEach(function (itemJson) {
                // Item ids are not stored on the server now so we just make one up
                var item = new Invoice.Item(itemJson.quantity, itemJson.unitPrice, itemJson.itemId || ('ItemId'+new Date().getTime()));
                item.name = itemJson.name;
                item.description = itemJson.description;
                if (itemJson.taxRate) {
                    item.taxName = itemJson.taxName;
                    item.taxRate = $$(itemJson.taxRate);
                }
                item.imageUrl = itemJson.imageUrl;
                if (itemJson.discountAmount) {
                    item.discountAmount = itemJson.discountAmount;
                }
                if (itemJson.discountPercentage) {
                    item.discountPercentage = itemJson.discountPercentage;
                }
                items.push(item);
            });
        }
    },
    calculate: function () {
        return new InvoiceTotals(this);
    },
    findItem: function (itemOrItemId, detailId) {
        if (typeof(itemOrItemId) !== 'string') {
            detailId = itemOrItemId.detailId;
            itemOrItemId = itemOrItemId.itemId;
        }
        for (var i = 0, len = this.items.length; i < len; i++) {
            var candidate = this.items[i];
            if (candidate.itemId === itemOrItemId && candidate.detailId === detailId) {
                return candidate;
            }
        }
        return null;
    },
    addItem: function (item) {
        var existing = this.findItem(item);
        if (existing) {
            existing.quantity = existing.quantity.plus(item.quantity);
            return existing;
        } else {
            if (item.taxRate && !(item.taxRate instanceof currency.Number)) {
                item.taxRate = $$(item.taxRate);
            }
            this.items.push(item);
            return item;
        }
    },
    _sortedInvoiceItems: function () {
        // Sort the items so that the highest tax rate items are first just so we have some logic to the application
        // of pre-sales tax discounts.
        var copy = this.items.slice(0); // equivalent to array copy
        copy.sort(function (a, b) {
            if (!a.taxRate) {
                if (!b.taxRate) {
                    return compare(a.name, b.name);
                }
                // a should go first
                return 1;
            } else {
                if (!b.taxRate) {
                    // b should go first
                    return -1;
                }
                if (b.taxRate.equals(a.taxRate)) {
                    return compare(a.name, b.name);
                }
                return -1 * a.taxRate.comparedTo(b.taxRate);
            }
        });
        return copy;
    }
};

function compare(a, b) {
    if (a === b) {
        return 0;
    } else if (a < b) {
        return -1;
    }
    return 1;
}

module.exports = Invoice;