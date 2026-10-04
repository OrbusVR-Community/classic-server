/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var Imp = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Imp.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Imp
});

Imp.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
}


module.exports = Imp;
