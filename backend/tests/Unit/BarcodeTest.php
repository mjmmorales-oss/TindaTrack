<?php

use App\Support\Barcode;

test('normalize trims spaces, strips hyphens, and converts 12-digit UPC-A to 13-digit EAN', function () {
    expect(Barcode::normalize(' 301-762-0422003 '))->toBe('3017620422003');
    expect(Barcode::normalize('012345678905'))->toBe('0012345678905');
    expect(Barcode::normalize('  012-345-678905  '))->toBe('0012345678905');
    expect(Barcode::normalize('CUSTOM-CODE-1'))->toBe('CUSTOMCODE1');
});

test('isValidGtin verifies known valid and invalid EAN-8, EAN-13, and UPC-A', function () {
    // Valid GTINs
    expect(Barcode::isValidGtin('96385074'))->toBeTrue(); // EAN-8
    expect(Barcode::isValidGtin('3017620422003'))->toBeTrue(); // EAN-13 (Nutella)
    expect(Barcode::isValidGtin('012345678905'))->toBeTrue(); // UPC-A 12-digit
    expect(Barcode::isValidGtin('0012345678905'))->toBeTrue(); // EAN-13 prefixed UPC-A

    // Invalid check digits
    expect(Barcode::isValidGtin('96385075'))->toBeFalse();
    expect(Barcode::isValidGtin('3017620422004'))->toBeFalse();
    expect(Barcode::isValidGtin('012345678901'))->toBeFalse();

    // Invalid formats
    expect(Barcode::isValidGtin('123'))->toBeFalse();
    expect(Barcode::isValidGtin('ABC1234567890'))->toBeFalse();
});

test('isInternal identifies GS1 restricted circulation prefix 20 to 29', function () {
    expect(Barcode::isInternal('2000000000015'))->toBeTrue();
    expect(Barcode::isInternal('2912345678900'))->toBeTrue();
    expect(Barcode::isInternal('3017620422003'))->toBeFalse();
    expect(Barcode::isInternal('4800016601011'))->toBeFalse();
});

test('isAcceptable handles GTINs, internal codes, custom codes, and rejects invalid formats', function () {
    expect(Barcode::isAcceptable('3017620422003'))->toBeTrue(); // Valid EAN-13
    expect(Barcode::isAcceptable('2000000000015'))->toBeTrue(); // Internal code
    expect(Barcode::isAcceptable('SKU-1001'))->toBeTrue(); // Custom alphanumeric
    expect(Barcode::isAcceptable('ITEM-A'))->toBeTrue(); // Custom alphanumeric

    // Invalid 13-digit barcode with wrong check digit
    expect(Barcode::isAcceptable('3017620422004'))->toBeFalse();

    // Out of bounds / invalid characters
    expect(Barcode::isAcceptable('12'))->toBeFalse(); // Too short
    expect(Barcode::isAcceptable(str_repeat('A', 33)))->toBeFalse(); // Too long
    expect(Barcode::isAcceptable('ITEM_CODE$'))->toBeFalse(); // Invalid chars
});

test('makeInternal generates valid EAN-13 starting with 20 and matching check digit', function () {
    $code1 = Barcode::makeInternal(1);
    expect($code1)->toHaveLength(13);
    expect(str_starts_with($code1, '200000000001'))->toBeTrue();
    expect(Barcode::isValidGtin($code1))->toBeTrue();
    expect(Barcode::isInternal($code1))->toBeTrue();

    $code99 = Barcode::makeInternal(99);
    expect($code99)->toHaveLength(13);
    expect(str_starts_with($code99, '200000000099'))->toBeTrue();
    expect(Barcode::isValidGtin($code99))->toBeTrue();
});
