PayPal Invoicing
================
This node.js module and browser script attempts to make it easier to work with PayPal Invoices. There is a good deal of
math involved in matching our rounding and calculation rules/order so that our computations agree with yours. This
module provides both an implementation of that and a (hopefully growing) set of canonical test cases to validate
your own implementations.

Using the Module
================
From node.js:
````
    var Invoice = require('node-paypal-invoice');
    var i = new Invoice('USD');

    // Args are quantity, unitPrice, itemId and (optional) detailId.
    // Matching of items is done on itemId and detailId. So if you
    // addItem with the same itemId/detailId, it will just add the quantity
    // specified rather than creating a new item.
    var item = new Invoice.Item(1, '3.99', 'UID');
    i.addItem(item);
    var totals = i.calculate();
    console.log(totals.total.toString());
````

Numbers
=======
In case you weren't already aware, floats are evil when it comes to money. They are not capable of representing
all real numbers (i.e. they are not arbitrary precision) so don't use them. We use the bignumber.js module internally,
and for convenience you can get at this via Invoice.Number, like so:

````
    var suchPrecise = new Invoice.Amount('3.99').times(2).plus('1.32');
````

If you do this a lot, maybe you want some sugar:

````
    var Invoice = require('node-paypal-invoice');
    var $$ = Invoice.Number;
    var myAmount = $$('3.99').times(2).plus('1.32');
````