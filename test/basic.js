/*global describe:false, it:false, before:false, after:false, afterEach:false*/

'use strict';

var Invoice = require('../'),
    $$ = Invoice.Number,
    assert = require('assert'),
    fs = require('fs'),
    path = require('path');

describe('lib/invoiceTests', function () {

    it('should create an invoice and run basic tests', function (done) {
        var i = new Invoice();
        assert(i);
        assert(i.currencyCode === 'USD');

        var item = new Invoice.Item(1, '3.99', 'UID', null);
        assert(!i.findItem(item.itemId, item.detailId));
        assert(!i.findItem(item));
        i.addItem(item);
        assert(i.items.length);
        assert(item === i.findItem(item.itemId, item.detailId));
        assert(item === i.findItem(item));
        assert(i.findItem(item).quantity.equals(1));

        var item2 = new Invoice.Item(1, '2', 'UID', 'DETAIL');
        item2.taxRate = $$('.0625');
        item2.taxName = 'MA Tax';
        i.addItem(item2);
        assert(item === i.findItem(item));
        assert(item2 === i.findItem(item2));
        assert(i.items.length == 2);

        var item3 = new Invoice.Item(1, '3.99', 'UID');
        i.addItem(item3);
        assert(i.items.length == 2);
        assert(i.findItem(item).quantity.equals(2));

        var item4 = new Invoice.Item(1, 1, 'UID2');
        item4.taxRate = $$('.03');
        item4.taxName = 'Tax3';
        i.addItem(item4);

        var item5 = new Invoice.Item($$(1).plus(1), 1, 'UID2');
        i.addItem(item5);
        assert(i.findItem(item5).quantity.equals(3));

        var item6 = new Invoice.Item($$(1).times(4), 1, 'UID3');
        i.addItem(item6);
        assert(i.findItem(item6).quantity.equals(4));

        done();
    });

    it('should not create an invoice in an unsupported currency.', function () {
        try {
            var i = new Invoice('HKD');
        } catch (x) {
            return;
        }
        assert(false, 'Expected exception');
    });

    var json = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'invoiceCalcs.json')));
    json.forEach(function (invTestCase) {
        it(invTestCase.name, function (done) {
            var invoice = new Invoice(invTestCase.invoice);
            var calc = invoice.calculate();
            var testJSONInOut = new Invoice(JSON.parse(JSON.stringify(invoice)));
            assert.equal(calc.total.toString(), $$(invTestCase.total).toString());
            done();
        });
    });
});