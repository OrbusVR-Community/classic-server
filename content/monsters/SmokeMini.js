/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var SmokeMini = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

SmokeMini.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: SmokeMini
});

SmokeMini.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.basicAttackPotency = 150;
    this.monster.giveUpChaseAfter = 200;
}


module.exports = SmokeMini;
