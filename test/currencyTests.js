/*global describe:false, it:false, before:false, after:false, afterEach:false*/

'use strict';

var Invoice = require('../'),
    $$ = Invoice.Number,
    assert = require('assert'),
    fs = require('fs'),
    path = require('path');

describe('lib/invoiceTests', function () {

    it('should use custom serializer for invoice numbers', function () {
        var num = $$('123.45');
        assert.equal(JSON.stringify({amt:num}), '{"amt":"123.45"}');
    });

    it('should handle USD toCents properly', function () {
        var i = new Invoice('USD');
        var item = new Invoice.Item(1, '3.99', 'UID', null);
        i.addItem(item);
        var tot = i.calculate();
        assert.equal('399', tot.toCents(tot.total).toString());
    });
});