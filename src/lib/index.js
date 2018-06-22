"use strict";
exports.__esModule = true;
var DynamicBase = /** @class */ (function () {
    function DynamicBase(prototype) {
        var _this = this;
        this.prototype = prototype;
        this.stub = Object.create(null);
        this.spy = Object.create(null);
        // create a spy before it is directly read/written
        this.stubProxyHandler = {
            get: function (target, propertyName, receiver) {
                if (propertyName === '_spy') {
                    return _this.spyProxy;
                }
                _this.ensureSpy(propertyName);
                return _this.stub[propertyName];
            },
            set: function (target, propertyName, value, receiver) {
                if (propertyName === '_spy') {
                    throw Error('Cannot modify _spy. It is part of the MockFactory');
                }
                if (typeof _this.prototype[propertyName] === 'function') {
                    throw Error("Cannot change " + propertyName + " function, because MockFactory has already attached a permanent spy to it");
                }
                _this.ensureSpy(propertyName);
                _this.stub[propertyName] = value;
                return true;
            }
        };
        // create a spy before it is read from the spyFacade
        this.spyProxyHanlder = {
            get: function (target, propertyName, receiver) {
                _this.ensureSpy(propertyName);
                return _this.spy[propertyName];
            },
            set: function (target, propertyName, value, receiver) {
                throw Error("Cannot change _spy." + propertyName + ", because it is part of the MockFactory");
            }
        };
        this.stubProxy = new Proxy(Object.create(null), this.stubProxyHandler);
        this.spyProxy = new Proxy(Object.create(null), this.spyProxyHanlder);
    }
    DynamicBase.prototype.ensureSpy = function (propertyName) {
        // create spy if needed
        if (!this.spy[propertyName]) {
            try {
                if (typeof this.prototype[propertyName] !== 'function') { // this could throw error on a getter. hence try...catch...
                    // if target is property
                    this.ensureProperty(propertyName);
                }
                else {
                    // if target is function
                    this.ensureFunction(propertyName);
                }
            }
            catch (error) {
                /**
                 * assumption: error is thrown only when the property is a getter, because only getters can be invoked.
                 * If the getter reads other properties in the prototype, those properties could be undefined, causing error to be thrown.
                 */
                this.ensureProperty(propertyName);
            }
        }
    };
    DynamicBase.prototype.ensureFunction = function (propertyName) {
        var spy = jasmine.createSpy(propertyName);
        this.stub[propertyName] = spy;
        this.spy[propertyName] = {
            _func: spy,
            _get: undefined,
            _set: undefined
        };
        Object.defineProperty(this.spy[propertyName], '_get', {
            get: function () { throw Error("can't get " + propertyName + "._get because " + propertyName + " is a function. You can config function spy via " + propertyName + "._func"); },
            set: function () { throw Error("can't set " + propertyName + "._get because " + propertyName + " is a function. You can config function spy via " + propertyName + "._func"); }
        });
        Object.defineProperty(this.spy[propertyName], '_set', {
            get: function () { throw Error("can't get " + propertyName + "._set because " + propertyName + " is a function. You can config function spy via " + propertyName + "._func"); },
            set: function () { throw Error("can't set " + propertyName + "._set because " + propertyName + " is a function. You can config function spy via " + propertyName + "._func"); }
        });
    };
    DynamicBase.prototype.ensureProperty = function (propertyName) {
        var _this = this;
        // we add getters and setters to all properties to make the read and write spy-able
        var descriptor = {
            get: /* istanbul ignore next: Can't reach. spyOnProperty() requires its presence to install spies */ function () { },
            set: /* istanbul ignore next: Can't reach. spyOnProperty() requires its presence to install spies */ function (value) { },
            enumerable: true,
            configurable: true
        };
        Object.defineProperty(this.stub, propertyName, descriptor);
        // by default, let getter spy return whatever setter spy receives
        var getterSpy = spyOnProperty(this.stub, propertyName, 'get').and.callFake(function () { return _this.spy[propertyName]._value; });
        var setterSpy = spyOnProperty(this.stub, propertyName, 'set').and.callFake(function (value) { return _this.spy[propertyName]._value = value; });
        this.spy[propertyName] = {
            _value: undefined,
            _get: getterSpy,
            _set: setterSpy
        };
        Object.defineProperty(this.spy[propertyName], '_func', {
            get: function () { throw Error("can't get " + propertyName + "._func because " + propertyName + " is a property. You can config getter/setter spies via " + propertyName + "._get and " + propertyName + "._set"); },
            set: function () { throw Error("can't set " + propertyName + "._func because " + propertyName + " is a property. You can config getter/setter spies via " + propertyName + "._get and " + propertyName + "._set"); }
        });
    };
    return DynamicBase;
}());
var MockFactory = /** @class */ (function () {
    function MockFactory() {
    }
    /**
     * create a mock object that has the identical interface as the class you passed in
     */
    MockFactory.create = function (blueprint) {
        var prototype;
        if (blueprint['prototype']) {
            // get the prototype for a TypeScript class
            prototype = blueprint['prototype'];
        }
        else {
            prototype = blueprint;
        }
        var dynamicBase = new DynamicBase(prototype);
        return dynamicBase.stubProxy;
    };
    return MockFactory;
}());
exports.MockFactory = MockFactory;
