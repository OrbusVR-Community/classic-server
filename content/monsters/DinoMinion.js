/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var DinoMinion = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

DinoMinion.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: DinoMinion
});

DinoMinion.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
}


module.exports = DinoMinion;
