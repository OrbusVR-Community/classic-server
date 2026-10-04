/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var FassithFight = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

FassithFight.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: FassithFight
});

FassithFight.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.basicAttackPotency = 1;
}


module.exports = FassithFight;
