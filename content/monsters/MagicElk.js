/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var MagicElk = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

MagicElk.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: MagicElk
});

MagicElk.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 20;
    this.monster.basicAttackDelay = 1;
    this.monster.basicAttackPotency = 300;
   
    this.addSyncedVar(1, "isRanged", "bool", true);

    this.gameObject.addEventListener("PacifyMagic", function() {
        othis.setSyncedVar("isRanged", false);
        othis.monster.trackingDistance = 5;
        othis.monster.basicAttackDelay = 0.5;
    });


}


module.exports = MagicElk;
