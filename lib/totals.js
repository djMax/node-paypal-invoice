'use strict';

var currency = require('./currency');
var $$ = currency.newNumber;

var ZERO = $$(0);
var ONE = $$(1);

function nonZero(amt) {
    return amt && !ZERO.equals(amt);
}

function valOrZero(amt) {
    return amt || ZERO;
}

var InvoiceTotals = function (invoice) {
    this.invoice = invoice;
    this.shippingTax = ZERO;
    this.itemSubTotal = ZERO;
    this.itemTax = ZERO;
    this.discountTotal = ZERO;
    this.refundTotal = ZERO;

    var sortedItems = invoice._sortedInvoiceItems();

    this.itemSubTotal = this.calculateItemSubtotals(sortedItems);
    if (invoice.taxCalculatedAfterDiscount || invoice.taxInclusive) {
        this.discountTotal = this.calculatePreTaxDiscountForItemSubtotal(this.itemSubTotal);
        if (invoice.taxCalculatedAfterDiscount) {
            this.taxes = this.calculateTaxesForItemsWithPreTaxDiscountTotal(sortedItems, this.discountTotal, this.itemSubTotal);
        } else {
            this.taxes = this.calculateTaxesForItemsWithDiscountAfterTax(sortedItems);
        }
        this.shippingTax = this.calculateShippingTax(this.taxes);
        this.itemTax = this.calculateTotalTaxFromTaxes(this.taxes);
        this.itemTax = $$(this.itemTax.minus(this.shippingTax));
        this.taxes = this.generateRoundedTaxDetailsFromTaxes(this.taxes);
    } else {
        this.taxes = this.calculateTaxesForItemsWithDiscountAfterTax(sortedItems);
        this.shippingTax = this.calculateShippingTax(this.taxes);
        this.itemTax = this.calculateTotalTaxFromTaxes(this.taxes);
        // MPTODO: This is possibly a rounding issue.
        this.itemTax = $$(this.itemTax.minus(this.shippingTax));
        this.taxes = this.generateRoundedTaxDetailsFromTaxes(this.taxes);

        this.discountTotal = this.calculateDiscountWithItemSubTotal(this.itemSubTotal, this.itemTax);
    }
    this.setDerivedTotals();
};

InvoiceTotals.prototype = {
    _round: function (amt) {
        return currency.round(this.invoice.currencyCode, amt);
    },
    toCents: function (amt) {
        return currency.toCents(this.invoice.currencyCode, amt);
    },
    generateRoundedTaxDetailsFromTaxes: function (taxes) {
        var roundedTaxDetails = {};
        for (var key in taxes) {
            roundedTaxDetails[key] = this._round(taxes[key]);
        }
        return roundedTaxDetails;
    },
    calculateTotalTaxFromTaxes: function (taxes) {
        var itemTax = ZERO;
        for (var key in taxes) {
            itemTax = itemTax.plus(taxes[key]);
        }
        return itemTax;
    },
    calculateTaxesForItemsWithPreTaxDiscountTotal: function (items, discountTotal, itemSubTotal) {
        var taxes = {}, self = this;
        items.forEach(function (i) {
            var itemDiscount = self.calculateItemDiscount(i, discountTotal, itemSubTotal);
            var itemContribution = ZERO;
            if (nonZero(i.unitPrice)) {
                itemContribution = self.calculateItemPrice(i);
            }
            if (nonZero(i.taxRate)) {
                var key = [i.taxName, ' (', i.taxRate.toString(), '%)'].join('');
                // Rounding is complicated. We have to match invoicing, and invoicing rounds per line item.
                var taxAmount;
                if (self.invoice.taxInclusive) {
                    var taxSub = itemContribution.minus(itemDiscount);
                    taxAmount = self._round(taxSub.dividedBy(ONE.plus(i.taxRate.dividedBy(100))));
                } else {
                    taxAmount = self._round(itemContribution.minus(itemDiscount).times(i.taxRate.dividedBy(100)));
                }
                if (taxAmount && !ZERO.equals(taxAmount)) {
                    taxes[key] = (taxes[key] || ZERO).plus(taxAmount);
                }
            }
        });
        return taxes;
    },
    calculateItemDiscount: function (i, discountTotal, itemSubTotal) {
        if (nonZero(discountTotal)) {
            var itemTotal = this.calculateItemPrice(i);
            if (nonZero(itemSubTotal)) {
                if (this.discountPercentage && !ZERO.equals(this.discountPercentage)) {
                    return itemTotal.times(this.discountPercentage);
                } else {
                    // This may still be wrong. We're basically reverse engineering the discount percentage for this item
                    return itemTotal.dividedBy(itemSubTotal).times(discountTotal);
                }
            }
        }
        return ZERO;
    },
    calculateTaxesForItemsWithDiscountAfterTax: function (items) {
        var taxes = {}, self = this;
        items.forEach(function (i) {
            var itemContribution = ZERO;
            if (nonZero(i.unitPrice)) {
                // In this mode (discounts after tax), even line item discounts don't matter for tax calculations
                itemContribution = currency.round(self.invoice.currencyCode, i.quantity.times(i.unitPrice));
            }
            if (nonZero(i.taxRate)) {
                var key = [i.taxName, ' (', i.taxRate.toString(), '%)'].join('');
                var taxAmount;
                if (self.invoice.taxInclusive) {
                    var taxSub = itemContribution.dividedBy(ONE.plus(i.taxRate.dividedBy(100)));
                    taxAmount = self._round(itemContribution.minus(taxSub));
                } else {
                    taxAmount = self._round(itemContribution.times(i.taxRate.dividedBy(100)));
                }
                if (taxAmount && !ZERO.equals(taxAmount)) {
                    taxes[key] = (taxes[key] || ZERO).plus(taxAmount);
                }
            }
        });
        return taxes;
    },
    calculateShippingTax: function (taxes) {
        if (this.shippingTaxRate && this.shippingAmount && !ZERO.equals(this.shippingTaxRate) && !ZERO.equals(this.shippingAmount)) {
            // Rounding is complicated. For best results, we're going to round at the "tax class" level.
            // If you have one tax rate, this means "order level." If you have as many tax rates as line items, this means line level.
            // The advantage is with this rounding I can display valid tax per tax rate and have consistent totals.
            var key = [this.shippingTaxName, ' (', this.shippingTaxRate.toString(), '%)'].join('');
            var shippingTax = this.shippingAmount.times(this.shippingTaxRate.dividedBy(100));
            if (nonZero(shippingTax)) {
                taxes[key] = (taxes[key] || ZERO).plus(shippingTax);
            }
            return shippingTax;
        }
        return ZERO;
    },
    calculateItemSubtotals: function (items) {
        var subtotal = ZERO;
        for (var i = 0, len = items.length; i < len; i++) {
            subtotal = subtotal.plus(this.calculateItemPrice(items[i]));
        }
        return $$(subtotal);
    },
    calculateDiscountWithItemSubTotal: function (itemSubTotal, itemTax) {
        if (nonZero(this.invoice.discountAmount)) {
            return $$(this.discountAmount);
        } else if (nonZero(this.invoice.discountPercentage)) {
            return currency.round(this.currencyCode, itemSubTotal.plus(itemTax).times(this.discountPercentage));
        }
        return ZERO;
    },
    calculatePreTaxDiscountForItemSubtotal: function (subtotal) {
        if (nonZero(this.invoice.discountAmount)) {
            return $$(this.invoice.discountAmount);
        } else if (nonZero(this.invoice.discountPercentage)) {
            return currency.round(this.currencyCode, $$(this.invoice.discountPercentage).times(subtotal));
        }
        return ZERO;
    },
    calculateItemPrice: function (item) {
        var itemPrice = item.quantity.times(item.unitPrice || ZERO);
        if (item.discountPercentage) {
            var discount = currency.round(this.invoice.currencyCode, itemPrice.times(item.discountPercentage));
            itemPrice = itemPrice.minus(discount);
        } else if (item.discountAmount) {
            itemPrice = itemPrice.minus(item.discountAmount);
        }
        return this._round(itemPrice);
    },
    /**
     * Once the component values of the total have been calculated, this is used to set
     * various derived totals such as the grand total. Rather than using properties, which
     * in theory won't work on all browsers, we just spend the cycles to do various additions
     * every time the invoice is recalculated.
     */
    setDerivedTotals: function () {
        this.total = valOrZero(this.itemSubTotal)
            .plus(valOrZero(this.invoice.gratuityAmount))
            .plus(valOrZero(this.invoice.shippingAmount));
        if (!this.invoice.taxInclusive) {
            this.total = this.total.plus(valOrZero(this.itemTax))
                .plus(valOrZero(this.shippingTax));
        }
        if (nonZero(this.discountTotal)) {
            this.total = this.total.minus(this.discountTotal);
        }
        this.total = $$(this.total);
    },

    toJSON: function () {
        var stringify = {};
        for (var s in this) {
            if (this.hasOwnProperty(s) && s !== 'invoice') {
                stringify[s] = this[s];
            }
        }
        return stringify;
    }
};

module.exports = InvoiceTotals;